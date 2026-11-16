/**
 * BMKG Weather Web Application Client
 * Modern Samsung / Google Weather interactive experience.
 */

// Global State
const state = {
  currentAdm4: localStorage.getItem('bmkg_adm4') || '31.71.03.1001', // Default: Jakarta Pusat
  unit: localStorage.getItem('bmkg_unit') || 'C',
  weatherData: null,
  locations: [],
  favorites: JSON.parse(localStorage.getItem('bmkg_favs') || '["31.71.03.1001", "32.73.02.1005", "35.78.05.1003", "51.71.01.1001", "34.71.01.1001"]'),
  isSoundPlaying: false
};

// Weather Canvas & Audio Synth instances
let weatherCanvas = null;
let audioSynth = null;

// DOM Elements
const elements = {
  weatherCanvas: document.getElementById('weatherCanvas'),
  locationName: document.getElementById('locationName'),
  locationSub: document.getElementById('locationSub'),
  localTimeStr: document.getElementById('localTimeStr'),
  currentTemp: document.getElementById('currentTemp'),
  conditionText: document.getElementById('conditionText'),
  feelsLikeText: document.getElementById('feelsLikeText'),
  highTemp: document.getElementById('highTemp'),
  lowTemp: document.getElementById('lowTemp'),
  heroIconContainer: document.getElementById('heroIconContainer'),
  adviceIcon: document.getElementById('adviceIcon'),
  adviceTitle: document.getElementById('adviceTitle'),
  adviceMessage: document.getElementById('adviceMessage'),
  favoritesBar: document.getElementById('favoritesBar'),
  addCurrentToFavBtn: document.getElementById('addCurrentToFavBtn'),
  unitToggleBtn: document.getElementById('unitToggleBtn'),
  unitC: document.getElementById('unitC'),
  unitF: document.getElementById('unitF'),
  soundToggleBtn: document.getElementById('soundToggleBtn'),
  soundIcon: document.getElementById('soundIcon'),
  refreshBtn: document.getElementById('refreshBtn'),
  refreshIcon: document.getElementById('refreshIcon'),
  hourlySlider: document.getElementById('hourlySlider'),
  hourlyChartSvg: document.getElementById('hourlyChartSvg'),
  dailyList: document.getElementById('dailyList'),
  // Bento
  humidityVal: document.getElementById('humidityVal'),
  humidityBar: document.getElementById('humidityBar'),
  humidityStatus: document.getElementById('humidityStatus'),
  windSpeedVal: document.getElementById('windSpeedVal'),
  windDirection: document.getElementById('windDirection'),
  compassNeedle: document.getElementById('compassNeedle'),
  cloudCoverVal: document.getElementById('cloudCoverVal'),
  cloudBar: document.getElementById('cloudBar'),
  cloudStatus: document.getElementById('cloudStatus'),
  sunriseTime: document.getElementById('sunriseTime'),
  sunsetTime: document.getElementById('sunsetTime'),
  sunArcActive: document.getElementById('sunArcActive'),
  sunArcDot: document.getElementById('sunArcDot'),
  heatIndexVal: document.getElementById('heatIndexVal'),
  comfortCategory: document.getElementById('comfortCategory'),
  visibilityVal: document.getElementById('visibilityVal'),
  visibilityStatus: document.getElementById('visibilityStatus'),
  geoKec: document.getElementById('geoKec'),
  geoDesa: document.getElementById('geoDesa'),
  geoCoords: document.getElementById('geoCoords'),
  geoTz: document.getElementById('geoTz'),
  lastUpdatedTime: document.getElementById('lastUpdatedTime'),
  // Modal
  searchModal: document.getElementById('searchModal'),
  openSearchBtn: document.getElementById('openSearchBtn'),
  closeSearchBtn: document.getElementById('closeSearchBtn'),
  citySearchInput: document.getElementById('citySearchInput'),
  clearSearchInput: document.getElementById('clearSearchInput'),
  citiesList: document.getElementById('citiesList'),
  gpsQuickBtn: document.getElementById('gpsQuickBtn'),
  modalGpsBtn: document.getElementById('modalGpsBtn')
};

// Temperature conversion helper
function formatTemp(tempC) {
  if (tempC === null || tempC === undefined || isNaN(tempC)) return '--';
  if (state.unit === 'F') {
    return Math.round((tempC * 9) / 5 + 32);
  }
  return Math.round(tempC);
}

// Convert wind direction code to Indonesian
function formatWindDir(code) {
  const map = {
    N: 'Utara',
    NNE: 'Utara-Timur Laut',
    NE: 'Timur Laut',
    ENE: 'Timur-Timur Laut',
    E: 'Timur',
    ESE: 'Timur-Tenggara',
    SE: 'Tenggara',
    SSE: 'Selatan-Tenggara',
    S: 'Selatan',
    SSW: 'Selatan-Barat Daya',
    SW: 'Barat Daya',
    WSW: 'Barat-Barat Daya',
    W: 'Barat',
    WNW: 'Barat-Barat Laut',
    NW: 'Barat Laut',
    NNW: 'Utara-Barat Laut'
  };
  return map[code] || code || 'Bervariasi';
}

// Map BMKG weather descriptions & image paths to stylized visual icons
function getWeatherIconSvg(weatherDesc, isNight = false, bmkgImageUrl = '') {
  const desc = (weatherDesc || '').toLowerCase();

  // If BMKG direct SVG icon is available and valid
  if (bmkgImageUrl && bmkgImageUrl.startsWith('http')) {
    return `<img src="${bmkgImageUrl}" alt="${weatherDesc}" class="weather-icon-img" onerror="this.style.display='none'">`;
  }

  if (desc.includes('petir')) {
    return `
      <div class="weather-icon-dynamic icon-thunder">
        <i class="fa-solid fa-cloud-bolt fa-bounce"></i>
      </div>
    `;
  } else if (desc.includes('hujan lebat')) {
    return `
      <div class="weather-icon-dynamic icon-rain">
        <i class="fa-solid fa-cloud-showers-heavy"></i>
      </div>
    `;
  } else if (desc.includes('hujan')) {
    return `
      <div class="weather-icon-dynamic icon-rain">
        <i class="fa-solid fa-cloud-rain"></i>
      </div>
    `;
  } else if (desc.includes('berawan tebal')) {
    return `
      <div class="weather-icon-dynamic icon-cloud">
        <i class="fa-solid fa-cloud"></i>
      </div>
    `;
  } else if (desc.includes('berawan')) {
    return `
      <div class="weather-icon-dynamic icon-cloud">
        <i class="fa-solid ${isNight ? 'fa-cloud-moon' : 'fa-cloud-sun'}"></i>
      </div>
    `;
  } else if (desc.includes('kabut') || desc.includes('asap')) {
    return `
      <div class="weather-icon-dynamic icon-cloud">
        <i class="fa-solid fa-smog"></i>
      </div>
    `;
  } else {
    // Cerah (Clear)
    return `
      <div class="weather-icon-dynamic ${isNight ? 'icon-moon' : 'icon-sun'}">
        <i class="fa-solid ${isNight ? 'fa-moon' : 'fa-sun fa-spin-pulse'}"></i>
      </div>
    `;
  }
}

// Check if hour is nighttime (between 18:00 and 05:59)
function checkIsNight(dateTimeStr) {
  if (!dateTimeStr) {
    const h = new Date().getHours();
    return h < 6 || h >= 18;
  }
  const parts = dateTimeStr.split(' ');
  if (parts.length > 1) {
    const hour = parseInt(parts[1].split(':')[0], 10);
    return hour < 6 || hour >= 18;
  }
  return false;
}

// Format Indonesian Date & Time
function formatIndonesianTime(dateObj = new Date(), tzString = '+0700') {
  let tzLabel = 'WIB';
  if (tzString.includes('0800')) tzLabel = 'WITA';
  if (tzString.includes('0900')) tzLabel = 'WIT';

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const dayName = days[dateObj.getDay()];
  const dayNum = dateObj.getDate();
  const monthName = months[dateObj.getMonth()];
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return `${dayName}, ${dayNum} ${monthName} • ${hours}:${minutes} ${tzLabel}`;
}

// Fetch all cities from backend
async function fetchLocations() {
  try {
    const res = await fetch('/api/locations');
    state.locations = await res.json();
    renderFavoritesBar();
    renderCitiesList(state.locations);
  } catch (err) {
    console.error('Failed to load locations:', err);
  }
}

// Fetch weather data for specified ADM4
async function fetchWeather(adm4 = state.currentAdm4) {
  elements.refreshIcon.classList.add('fa-spin');
  elements.conditionText.textContent = 'Memperbarui data...';

  try {
    const res = await fetch(`/api/weather?adm4=${encodeURIComponent(adm4)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    state.weatherData = data;
    state.currentAdm4 = adm4;
    localStorage.setItem('bmkg_adm4', adm4);

    renderWeather(data);
    renderFavoritesBar();
  } catch (err) {
    console.error('Fetch weather failed:', err);
    elements.conditionText.textContent = 'Koneksi Terputus';
    elements.locationSub.textContent = 'Gagal memuat cuaca dari server BMKG. Coba lagi.';
  } finally {
    setTimeout(() => {
      elements.refreshIcon.classList.remove('fa-spin');
    }, 600);
  }
}

// Render complete weather view
function renderWeather(data) {
  const current = data.current;
  const lokasi = data.lokasi;
  const isNight = checkIsNight(current.local_datetime);

  // 1. Update Canvas Background
  if (weatherCanvas) {
    weatherCanvas.setCondition(current.weather_desc, isNight, current.ws || 10);
  }

  // 2. Update Ambient Audio Synth
  if (audioSynth) {
    audioSynth.setWeather(current.weather_desc, isNight);
  }

  // 3. Location & Header
  elements.locationName.textContent = lokasi.displayName || `${lokasi.desa}, ${lokasi.kotkab}`;
  elements.locationSub.textContent = `${lokasi.kecamatan}, ${lokasi.kotkab} • ${lokasi.provinsi}`;
  elements.localTimeStr.textContent = formatIndonesianTime(new Date(), lokasi.timezone);

  // 4. Hero Card
  elements.currentTemp.textContent = formatTemp(current.t);
  elements.conditionText.textContent = current.weather_desc || 'Cerah';
  elements.feelsLikeText.textContent = `Terasa seperti ${formatTemp(current.feelsLike)}°`;

  // Calculate High & Low from hourly
  let minTemp = current.t;
  let maxTemp = current.t;
  if (data.hourly && data.hourly.length) {
    data.hourly.slice(0, 8).forEach(s => {
      if (s.t < minTemp) minTemp = s.t;
      if (s.t > maxTemp) maxTemp = s.t;
    });
  }
  elements.highTemp.textContent = `${formatTemp(maxTemp)}°`;
  elements.lowTemp.textContent = `${formatTemp(minTemp)}°`;

  // Hero Animated Icon
  elements.heroIconContainer.innerHTML = getWeatherIconSvg(current.weather_desc, isNight, current.image);

  // Smart Advice Banner
  if (current.advice) {
    elements.adviceIcon.textContent = current.advice.icon;
    elements.adviceTitle.textContent = current.advice.title;
    elements.adviceMessage.textContent = current.advice.message;
  }

  // 5. Hourly Forecast & Chart
  renderHourlyForecast(data.hourly || []);

  // 6. 3-Day Forecast
  renderDailyForecast(data.daily || []);

  // 7. Bento Grid
  // Humidity
  elements.humidityVal.textContent = current.hu;
  elements.humidityBar.style.width = `${Math.min(100, current.hu)}%`;
  let humDesc = 'Kelembapan Nyaman';
  if (current.hu > 85) humDesc = 'Udara Sangat Lembap & Basah';
  else if (current.hu < 50) humDesc = 'Udara Kering & Terik';
  elements.humidityStatus.textContent = humDesc;

  // Wind & Compass
  elements.windSpeedVal.textContent = Math.round(current.ws);
  const windDirName = formatWindDir(current.wd);
  elements.windDirection.textContent = `Arah ${windDirName} (${current.wd_deg || 0}°)`;
  elements.compassNeedle.style.transform = `rotate(${current.wd_deg || 0}deg)`;

  // Cloud Cover
  elements.cloudCoverVal.textContent = current.tcc;
  elements.cloudBar.style.width = `${Math.min(100, current.tcc)}%`;
  let cloudDesc = 'Langit Cerah Terang';
  if (current.tcc > 80) cloudDesc = 'Tertutup Awan Tebal (Mendung)';
  else if (current.tcc > 40) cloudDesc = 'Awan Berarak Sejuk';
  elements.cloudStatus.textContent = cloudDesc;

  // Sun Cycle
  elements.sunriseTime.textContent = current.sunrise || '05:50';
  elements.sunsetTime.textContent = current.sunset || '17:55';
  updateSunArc(current.sunrise, current.sunset);

  // Heat Index
  elements.heatIndexVal.textContent = formatTemp(current.feelsLike);
  let comfort = 'Tingkat Nyaman';
  if (current.feelsLike >= 36) comfort = 'Sangat Panas (Waspada Dehidrasi)';
  else if (current.feelsLike >= 32) comfort = 'Cukup Hangat';
  else if (current.feelsLike <= 22) comfort = 'Sejuk & Dingin';
  elements.comfortCategory.textContent = comfort;

  // Visibility
  elements.visibilityVal.textContent = current.vs_text ? current.vs_text.replace('km', '').trim() : '10+';
  elements.visibilityStatus.textContent = 'Kondisi Jarak Pandang Bersih';

  // Geo Info
  elements.geoKec.textContent = lokasi.kecamatan || '--';
  elements.geoDesa.textContent = lokasi.desa || '--';
  elements.geoCoords.textContent = `${lokasi.lat?.toFixed(3)}, ${lokasi.lon?.toFixed(3)}`;
  elements.geoTz.textContent = `${lokasi.timezone} (${lokasi.timezone === '+0700' ? 'WIB' : lokasi.timezone === '+0800' ? 'WITA' : 'WIT'})`;

  // API Status & Timestamp
  const now = new Date();
  elements.lastUpdatedTime.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

// Render Hourly Forecast Slider & SVG Spline Chart
function renderHourlyForecast(hourlyData) {
  elements.hourlySlider.innerHTML = '';
  if (!hourlyData || hourlyData.length === 0) return;

  const points = [];
  const cardWidth = 86 + 12; // width + gap
  const svgWidth = hourlyData.length * cardWidth;
  const svgHeight = 70;

  // Find min and max for chart scaling
  let minT = Infinity;
  let maxT = -Infinity;
  hourlyData.forEach(item => {
    if (item.t < minT) minT = item.t;
    if (item.t > maxT) maxT = item.t;
  });
  if (maxT === minT) { maxT += 2; minT -= 2; }
  const range = maxT - minT;

  hourlyData.forEach((item, idx) => {
    const isSlotNight = checkIsNight(item.local_datetime);
    let timeLabel = item.local_datetime ? item.local_datetime.split(' ')[1].slice(0, 5) : '--:--';
    if (idx === 0) timeLabel = 'Sekarang';

    const card = document.createElement('div');
    card.className = `hour-card ${idx === 0 ? 'active' : ''}`;
    card.innerHTML = `
      <span class="hour-time">${timeLabel}</span>
      <img class="hour-icon" src="${item.image}" alt="${item.weather_desc}" onerror="this.src='https://api-apps.bmkg.go.id/storage/icon/cuaca/cerah%20berawan-am.svg'">
      <span class="hour-temp">${formatTemp(item.t)}°</span>
      <div class="hour-precip">
        <i class="fa-solid fa-droplet"></i>
        <span>${item.hu}%</span>
      </div>
      <span class="hour-wind">${Math.round(item.ws)} km/j</span>
    `;
    elements.hourlySlider.appendChild(card);

    // Calculate chart coordinate
    const x = idx * cardWidth + 43;
    const y = svgHeight - 16 - ((item.t - minT) / range) * (svgHeight - 32);
    points.push({ x, y, temp: item.t });
  });

  // Render SVG Smooth Spline
  renderSplineSvg(points, svgWidth, svgHeight);
}

// Generate smooth cubic bezier SVG path from points
function renderSplineSvg(points, width, height) {
  if (points.length < 2) return;
  elements.hourlyChartSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  elements.hourlyChartSvg.setAttribute('width', `${width}px`);

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  // Area path for gradient fill
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  let dotsHtml = '';
  points.forEach(p => {
    dotsHtml += `
      <circle cx="${p.x}" cy="${p.y}" r="4" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />
    `;
  });

  elements.hourlyChartSvg.innerHTML = `
    <defs>
      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.38"/>
        <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${areaD}" fill="url(#chartGradient)" />
    <path d="${pathD}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
    ${dotsHtml}
  `;
}

// Render 3-Day Forecast Section (iOS / Samsung Weather Gradient Bar)
function renderDailyForecast(dailyData) {
  elements.dailyList.innerHTML = '';
  if (!dailyData || dailyData.length === 0) return;

  // Find global min and max among all 3 days
  let globalMin = Infinity;
  let globalMax = -Infinity;
  dailyData.forEach(d => {
    if (d.minTemp < globalMin) globalMin = d.minTemp;
    if (d.maxTemp > globalMax) globalMax = d.maxTemp;
  });
  const tempRange = Math.max(1, globalMax - globalMin);

  const daysLabel = ['Hari Ini', 'Besok', 'Lusa'];

  dailyData.forEach((day, idx) => {
    const dayName = daysLabel[idx] || `Hari ke-${idx + 1}`;
    const leftPercent = Math.max(0, ((day.minTemp - globalMin) / tempRange) * 100);
    const widthPercent = Math.max(15, ((day.maxTemp - day.minTemp) / tempRange) * 100);

    const row = document.createElement('div');
    row.className = 'daily-row';
    row.innerHTML = `
      <div class="daily-day-info">
        <span class="daily-day-name">${dayName}</span>
        <span class="daily-day-date">${day.date || ''}</span>
      </div>
      <div class="daily-weather-info">
        <img class="daily-icon" src="${day.image}" alt="${day.weather_desc}">
        <span class="daily-desc">${day.weather_desc}</span>
      </div>
      <div class="daily-temp-bar-wrap">
        <span class="min-temp-label">${formatTemp(day.minTemp)}°</span>
        <div class="temp-gradient-bar">
          <div class="temp-gradient-fill" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
        </div>
        <span class="max-temp-label">${formatTemp(day.maxTemp)}°</span>
      </div>
      <div class="daily-extra">
        <div class="daily-extra-item" title="Kelembapan Rata-rata">
          <i class="fa-solid fa-droplet text-blue"></i>
          <span>${day.avgHumidity}%</span>
        </div>
        <div class="daily-extra-item" title="Kecepatan Angin Maksimal">
          <i class="fa-solid fa-wind text-teal"></i>
          <span>${day.maxWind} km/j</span>
        </div>
      </div>
    `;
    elements.dailyList.appendChild(row);
  });
}

// Update Sun Arc SVG animation based on current time
function updateSunArc(sunriseStr, sunsetStr) {
  if (!sunriseStr || !sunsetStr) return;
  const now = new Date();
  const curMinutes = now.getHours() * 60 + now.getMinutes();

  const [srH, srM] = sunriseStr.split(':').map(Number);
  const [ssH, ssM] = sunsetStr.split(':').map(Number);
  const riseMinutes = srH * 60 + srM;
  const setMinutes = ssH * 60 + ssM;

  let progress = (curMinutes - riseMinutes) / (setMinutes - riseMinutes);
  progress = Math.max(0, Math.min(1, progress));

  // Parametric quadratic bezier curve coordinates: M 20 80 Q 100 5 180 80
  const t = progress;
  const x = (1 - t) * (1 - t) * 20 + 2 * (1 - t) * t * 100 + t * t * 180;
  const y = (1 - t) * (1 - t) * 80 + 2 * (1 - t) * t * 5 + t * t * 80;

  elements.sunArcDot.setAttribute('cx', x);
  elements.sunArcDot.setAttribute('cy', y);
}

// Render Favorite Cities Chips Bar
function renderFavoritesBar() {
  elements.favoritesBar.innerHTML = '';

  state.favorites.forEach(adm4 => {
    const loc = state.locations.find(l => l.adm4 === adm4);
    if (!loc) return;

    const chip = document.createElement('div');
    chip.className = `fav-chip ${adm4 === state.currentAdm4 ? 'active' : ''}`;
    chip.innerHTML = `
      <i class="fa-solid fa-star text-yellow"></i>
      <span>${loc.name.split('(')[0].trim()}</span>
    `;
    chip.addEventListener('click', () => {
      fetchWeather(adm4);
    });
    elements.favoritesBar.appendChild(chip);
  });
}

// Toggle Add/Remove Current City to Favorites
function toggleCurrentFavorite() {
  const cur = state.currentAdm4;
  const idx = state.favorites.indexOf(cur);
  if (idx > -1) {
    state.favorites.splice(idx, 1);
  } else {
    state.favorites.push(cur);
  }
  localStorage.setItem('bmkg_favs', JSON.stringify(state.favorites));
  renderFavoritesBar();
}

// Render Cities in Search Modal
function renderCitiesList(cities) {
  elements.citiesList.innerHTML = '';
  if (!cities || cities.length === 0) {
    elements.citiesList.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--text-muted);">Tidak ada kota ditemukan</div>`;
    return;
  }

  cities.forEach(c => {
    const item = document.createElement('div');
    item.className = 'city-item';
    item.innerHTML = `
      <div class="city-item-left">
        <span class="city-item-name">${c.name}</span>
        <span class="city-item-sub">${c.city} • ${c.province}</span>
      </div>
      ${c.popular ? '<span class="city-item-badge">Populer</span>' : ''}
    `;
    item.addEventListener('click', () => {
      fetchWeather(c.adm4);
      closeSearchModal();
    });
    elements.citiesList.appendChild(item);
  });
}

// Filter cities in modal
function filterCities(query = '', category = 'all') {
  let filtered = state.locations;
  const q = query.trim().toLowerCase();

  if (category === 'popular') {
    filtered = filtered.filter(c => c.popular);
  } else if (category === 'wisata') {
    filtered = filtered.filter(c => c.name.toLowerCase().includes('bali') || c.name.toLowerCase().includes('lombok') || c.name.toLowerCase().includes('yogyakarta') || c.name.toLowerCase().includes('bandung') || c.name.toLowerCase().includes('malang'));
  }

  if (q) {
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.province.toLowerCase().includes(q)
    );
  }
  renderCitiesList(filtered);
}

// Modal controls
function openSearchModal() {
  elements.searchModal.classList.add('open');
  elements.citySearchInput.focus();
}

function closeSearchModal() {
  elements.searchModal.classList.remove('open');
  elements.citySearchInput.value = '';
  elements.clearSearchInput.style.display = 'none';
  filterCities('', 'all');
}

// Geolocation GPS detection
function detectCurrentLocation() {
  if (!navigator.geolocation) {
    alert('Geolokasi tidak didukung oleh browser Anda.');
    return;
  }

  elements.gpsQuickBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  elements.modalGpsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mendeteksi koordinat Anda...';

  navigator.geolocation.getCurrentPosition(
    async pos => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(`/api/nearest?lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        if (data && data.location) {
          fetchWeather(data.location.adm4);
          closeSearchModal();
        }
      } catch (err) {
        console.error('Failed to get nearest location:', err);
      } finally {
        elements.gpsQuickBtn.innerHTML = '<i class="fa-solid fa-crosshairs"></i>';
        elements.modalGpsBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> <span>Deteksi Otomatis Lokasi Terdekat Saya</span>';
      }
    },
    err => {
      console.warn('Geolocation error:', err.message);
      elements.gpsQuickBtn.innerHTML = '<i class="fa-solid fa-crosshairs"></i>';
      elements.modalGpsBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> <span>Deteksi Otomatis Lokasi Terdekat Saya</span>';
      alert('Izin akses lokasi belum diberikan. Silakan pilih kota secara manual dari daftar.');
    },
    { timeout: 8000 }
  );
}

// Setup Event Listeners
function setupEvents() {
  // Unit toggle (°C / °F)
  elements.unitToggleBtn.addEventListener('click', () => {
    state.unit = state.unit === 'C' ? 'F' : 'C';
    localStorage.setItem('bmkg_unit', state.unit);
    if (state.unit === 'C') {
      elements.unitC.classList.add('active');
      elements.unitF.classList.remove('active');
    } else {
      elements.unitC.classList.remove('active');
      elements.unitF.classList.add('active');
    }
    if (state.weatherData) {
      renderWeather(state.weatherData);
    }
  });

  // Sound toggle
  elements.soundToggleBtn.addEventListener('click', () => {
    if (!audioSynth) {
      audioSynth = new WeatherAudioSynth();
    }
    const isPlaying = audioSynth.toggle();
    state.isSoundPlaying = isPlaying;
    if (isPlaying) {
      elements.soundToggleBtn.classList.add('sound-playing');
      elements.soundIcon.className = 'fa-solid fa-volume-high';
    } else {
      elements.soundToggleBtn.classList.remove('sound-playing');
      elements.soundIcon.className = 'fa-solid fa-volume-xmark';
    }
  });

  // Refresh
  elements.refreshBtn.addEventListener('click', () => {
    fetchWeather(state.currentAdm4);
  });

  // Favorite button
  elements.addCurrentToFavBtn.addEventListener('click', toggleCurrentFavorite);

  // Search Modal
  elements.openSearchBtn.addEventListener('click', openSearchModal);
  elements.closeSearchBtn.addEventListener('click', closeSearchModal);
  elements.searchModal.addEventListener('click', e => {
    if (e.target === elements.searchModal) closeSearchModal();
  });

  // Search input typing
  elements.citySearchInput.addEventListener('input', e => {
    const val = e.target.value;
    elements.clearSearchInput.style.display = val ? 'block' : 'none';
    const activePill = document.querySelector('.pill-btn.active');
    const category = activePill ? activePill.dataset.filter : 'all';
    filterCities(val, category);
  });

  elements.clearSearchInput.addEventListener('click', () => {
    elements.citySearchInput.value = '';
    elements.clearSearchInput.style.display = 'none';
    const activePill = document.querySelector('.pill-btn.active');
    filterCities('', activePill ? activePill.dataset.filter : 'all');
  });

  // Filter Pills
  document.querySelectorAll('.pill-btn').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill-btn').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      filterCities(elements.citySearchInput.value, pill.dataset.filter);
    });
  });

  // GPS buttons
  elements.gpsQuickBtn.addEventListener('click', detectCurrentLocation);
  elements.modalGpsBtn.addEventListener('click', detectCurrentLocation);

  // Mouse wheel scroll horizontal on hourly slider
  elements.hourlySlider.addEventListener('wheel', e => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      elements.hourlySlider.scrollLeft += e.deltaY;
    }
  });

  // Periodic clock update
  setInterval(() => {
    if (state.weatherData && state.weatherData.lokasi) {
      elements.localTimeStr.textContent = formatIndonesianTime(new Date(), state.weatherData.lokasi.timezone);
      const cur = state.weatherData.current;
      updateSunArc(cur?.sunrise, cur?.sunset);
    }
  }, 10000);
}

// Initialization
window.addEventListener('DOMContentLoaded', async () => {
  // Initialize Canvas
  weatherCanvas = new WeatherCanvas('weatherCanvas');

  // Set initial unit styling
  if (state.unit === 'F') {
    elements.unitC.classList.remove('active');
    elements.unitF.classList.add('active');
  }

  setupEvents();
  await fetchLocations();
  await fetchWeather(state.currentAdm4);
});
