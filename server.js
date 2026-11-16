import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Read curated locations
const locationsRaw = fs.readFileSync(path.join(__dirname, 'locations.json'), 'utf-8');
const locations = JSON.parse(locationsRaw);

// In-memory cache for BMKG API requests (key: adm4, val: { timestamp, data })
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Haversine formula to find nearest city
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate Heat Index / Feels Like (°C)
function calculateFeelsLike(tempC, humidity) {
  if (tempC < 27) {
    // For lower temps, wind chill or simple approximation
    return Math.round(tempC - (100 - humidity) * 0.05);
  }
  const T = (tempC * 9/5) + 32;
  const R = humidity;
  const c1 = -42.379, c2 = 2.04901523, c3 = 10.14333127, c4 = -0.22475541;
  const c5 = -0.00683783, c6 = -0.05481717, c7 = 0.00122874, c8 = 0.00085282, c9 = -0.00000199;
  
  let hi = c1 + (c2 * T) + (c3 * R) + (c4 * T * R) +
           (c5 * T * T) + (c6 * R * R) + (c7 * T * T * R) +
           (c8 * T * R * R) + (c9 * T * T * R * R);
  
  const hiC = (hi - 32) * 5/9;
  return Math.round(hiC);
}

// Approximate Sunrise and Sunset based on lat/lon and local timezone
function getSunTimes(lat, lon, timezoneStr) {
  // Indonesia is near equator, sunrise ~05:40 - 06:10, sunset ~17:40 - 18:20
  // Fine-tuned by longitude offset from central meridian of timezone
  let tzOffsetHours = 7;
  if (timezoneStr && timezoneStr.includes('0800')) tzOffsetHours = 8;
  if (timezoneStr && timezoneStr.includes('0900')) tzOffsetHours = 9;

  const solarNoonOffsetMinutes = (tzOffsetHours * 15 - lon) * 4;
  const baseSunriseMinutes = (6 * 60) + solarNoonOffsetMinutes - 5;
  const baseSunsetMinutes = (18 * 60) + solarNoonOffsetMinutes - 5;

  const formatMin = mins => {
    let h = Math.floor(mins / 60);
    let m = Math.floor(mins % 60);
    if (h < 0) h += 24;
    if (h >= 24) h -= 24;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return {
    sunrise: formatMin(baseSunriseMinutes),
    sunset: formatMin(baseSunsetMinutes)
  };
}

// Generate smart contextual recommendations based on weather
function generateAdvice(currentWeather, temp, humidity, windSpeed) {
  const desc = (currentWeather || '').toLowerCase();
  let icon = '☀️';
  let title = 'Kondisi Cuaca Prima';
  let message = 'Cuaca sangat bersahabat untuk kegiatan di luar ruangan. Pastikan cukup minum air.';

  if (desc.includes('hujan lebat') || desc.includes('petir')) {
    icon = '⛈️';
    title = 'Waspada Hujan Petir';
    message = 'Potensi hujan lebat disertai petir. Hindari berteduh di bawah pohon rindang atau papan reklame.';
  } else if (desc.includes('hujan')) {
    icon = '🌧️';
    title = 'Sedia Payung / Jas Hujan';
    message = 'Hujan terpantau turun. Jalanan cenderung licin, jaga jarak aman dan kurangi kecepatan berkendara.';
  } else if (desc.includes('berawan tebal')) {
    icon = '☁️';
    title = 'Langit Mendung Tebal';
    message = 'Awan tebal menyelimuti wilayah ini. Udara sejuk, ada kemungkinan hujan lokal.';
  } else if (desc.includes('berawan')) {
    icon = '⛅';
    title = 'Cerah Berawan Nyaman';
    message = 'Sinar matahari berpadu awan sejuk. Waktu yang tepat untuk jogging sore atau jemur pakaian.';
  } else if (desc.includes('cerah') && temp >= 32) {
    icon = '🔥';
    title = 'Terik Matahari Cukup Kuat';
    message = 'Indeks UV cukup tinggi siang ini. Gunakan tabir surya (sunscreen) dan kacamata hitam.';
  } else if (desc.includes('kabut') || desc.includes('asap')) {
    icon = '🌫️';
    title = 'Jarak Pandang Terbatas';
    message = 'Kabut membatasi pandangan. Nyalakan lampu kabut kendaraan Anda jika bepergian.';
  }

  return { icon, title, message };
}

// Route: Get all locations / search
app.get('/api/locations', (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) {
    return res.json(locations);
  }
  const filtered = locations.filter(loc =>
    loc.name.toLowerCase().includes(q) ||
    loc.city.toLowerCase().includes(q) ||
    loc.province.toLowerCase().includes(q)
  );
  res.json(filtered);
});

// Route: Nearest location by GPS
app.get('/api/nearest', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: 'Parameter lat and lon must be numbers' });
  }

  let nearest = null;
  let minDistance = Infinity;

  for (const loc of locations) {
    const dist = haversineDistance(lat, lon, loc.lat, loc.lon);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = loc;
    }
  }

  res.json({
    location: nearest,
    distanceKm: Math.round(minDistance * 10) / 10
  });
});

// Route: Get Weather by ADM4 from BMKG
app.get('/api/weather', async (req, res) => {
  const adm4 = req.query.adm4 || '31.71.03.1001'; // Default: Jakarta Pusat Kemayoran

  // Check Cache
  const cached = cache.get(adm4);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return res.json({ ...cached.data, cached: true });
  }

  try {
    const bmkgUrl = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(adm4)}`;
    const response = await fetch(bmkgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BMKG-Weather-WebClient/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`BMKG API returned status ${response.status}`);
    }

    const rawData = await response.json();
    if (!rawData || !rawData.data || !rawData.data[0]) {
      throw new Error('Data cuaca tidak ditemukan dari BMKG');
    }

    const payload = rawData.data[0];
    const lokasi = payload.lokasi;
    const cuacaDays = payload.cuaca || [];

    // Flatten all forecast steps
    const allForecasts = [];
    cuacaDays.forEach(day => {
      if (Array.isArray(day)) {
        day.forEach(slot => allForecasts.push(slot));
      }
    });

    if (allForecasts.length === 0) {
      throw new Error('Prakiraan cuaca kosong');
    }

    // Current forecast is the earliest upcoming or first slot
    const current = allForecasts[0];
    const feelsLike = calculateFeelsLike(current.t, current.hu);
    const sunTimes = getSunTimes(lokasi.lat, lokasi.lon, lokasi.timezone);
    const advice = generateAdvice(current.weather_desc, current.t, current.hu, current.ws);

    // Compute 3-Day daily overview
    const dailyOverview = cuacaDays.map((daySlots, idx) => {
      if (!Array.isArray(daySlots) || daySlots.length === 0) return null;
      let minTemp = Infinity;
      let maxTemp = -Infinity;
      let prevailingIcon = daySlots[0].image;
      let prevailingDesc = daySlots[0].weather_desc;
      let totalHu = 0;
      let maxWind = 0;

      daySlots.forEach(s => {
        if (s.t < minTemp) minTemp = s.t;
        if (s.t > maxTemp) maxTemp = s.t;
        totalHu += s.hu;
        if (s.ws > maxWind) maxWind = s.ws;
        // Prioritize daytime icon (around 13:00)
        if (s.local_datetime && s.local_datetime.includes('13:00')) {
          prevailingIcon = s.image;
          prevailingDesc = s.weather_desc;
        }
      });

      const dateStr = daySlots[0].local_datetime ? daySlots[0].local_datetime.split(' ')[0] : '';
      return {
        dayIndex: idx,
        date: dateStr,
        minTemp: minTemp === Infinity ? current.t - 2 : minTemp,
        maxTemp: maxTemp === -Infinity ? current.t + 3 : maxTemp,
        weather_desc: prevailingDesc,
        image: prevailingIcon,
        avgHumidity: Math.round(totalHu / daySlots.length),
        maxWind: Math.round(maxWind)
      };
    }).filter(Boolean);

    // Match matched city metadata if available
    const matchedLocMeta = locations.find(l => l.adm4 === adm4);

    const formattedData = {
      lokasi: {
        ...lokasi,
        displayName: matchedLocMeta ? matchedLocMeta.name : `${lokasi.desa}, ${lokasi.kotkab}`,
        popular: matchedLocMeta?.popular || false
      },
      current: {
        ...current,
        feelsLike,
        sunrise: sunTimes.sunrise,
        sunset: sunTimes.sunset,
        advice
      },
      hourly: allForecasts.slice(0, 16), // Next 16 time slots (up to 48 hours)
      daily: dailyOverview,
      source: 'BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)',
      updatedAt: new Date().toISOString()
    };

    // Cache the response
    cache.set(adm4, {
      timestamp: now,
      data: formattedData
    });

    res.json({ ...formattedData, cached: false });
  } catch (err) {
    console.error('Error fetching BMKG API:', err.message);

    // If cache has an older copy, return it
    if (cached) {
      return res.json({ ...cached.data, cached: true, note: 'Serving stale cache due to BMKG API timeout' });
    }

    res.status(502).json({
      error: 'Gagal mengambil data cuaca BMKG',
      details: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🌤️  BMKG Weather Web Server is running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
