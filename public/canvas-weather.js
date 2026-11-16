/**
 * Canvas Weather Background Animation Engine
 * Procedural visual effects: Rain with ripples, Thunderstorm & Lightning,
 * Floating Volumetric Clouds, Sun Rays & Dust motes, Twinkling Starry Night & Meteors, Mist/Fog.
 */
class WeatherCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.width = (this.canvas.width = window.innerWidth);
    this.height = (this.canvas.height = window.innerHeight);

    this.condition = 'clear'; // 'clear', 'partly-cloudy', 'cloudy', 'rain', 'thunderstorm', 'fog'
    this.isNight = false;
    this.windSpeed = 10; // km/h

    this.particles = [];
    this.clouds = [];
    this.stars = [];
    this.shootingStars = [];
    this.ripples = [];
    this.lightningBolts = [];
    this.flashOpacity = 0;
    this.sunAngle = 0;

    this.animationFrameId = null;
    this.initListeners();
    this.initStars();
    this.initClouds();
    this.start();
  }

  initListeners() {
    window.addEventListener('resize', () => {
      this.width = this.canvas.width = window.innerWidth;
      this.height = this.canvas.height = window.innerHeight;
      this.initStars();
      this.initClouds();
    });
  }

  setCondition(weatherDesc, isNight = false, windSpeed = 10) {
    this.isNight = isNight;
    this.windSpeed = windSpeed;
    const desc = (weatherDesc || '').toLowerCase();

    if (desc.includes('petir')) {
      this.condition = 'thunderstorm';
    } else if (desc.includes('hujan')) {
      this.condition = 'rain';
    } else if (desc.includes('kabut') || desc.includes('asap')) {
      this.condition = 'fog';
    } else if (desc.includes('cerah berawan')) {
      this.condition = 'partly-cloudy';
    } else if (desc.includes('berawan')) {
      this.condition = 'cloudy';
    } else {
      this.condition = 'clear';
    }

    this.resetParticles();
  }

  resetParticles() {
    this.particles = [];
    this.ripples = [];
    this.lightningBolts = [];

    if (this.condition === 'rain' || this.condition === 'thunderstorm') {
      const count = this.condition === 'thunderstorm' ? 180 : 120;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * (this.width + 200) - 100,
          y: Math.random() * this.height,
          length: 14 + Math.random() * 18,
          speed: 12 + Math.random() * 10,
          opacity: 0.3 + Math.random() * 0.5,
          thickness: 1 + Math.random() * 1.2
        });
      }
    } else if (this.condition === 'clear' && !this.isNight) {
      // Golden dust motes
      for (let i = 0; i < 40; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: 1 + Math.random() * 2.5,
          speedY: -(0.2 + Math.random() * 0.4),
          speedX: (Math.random() - 0.5) * 0.4,
          opacity: 0.2 + Math.random() * 0.5,
          pulse: Math.random() * Math.PI * 2
        });
      }
    } else if (this.condition === 'fog') {
      for (let i = 0; i < 25; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: 120 + Math.random() * 160,
          speedX: 0.15 + Math.random() * 0.3,
          opacity: 0.04 + Math.random() * 0.08
        });
      }
    }
  }

  initStars() {
    this.stars = [];
    const count = Math.floor((this.width * this.height) / 4500);
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.height * 0.8),
        size: 0.6 + Math.random() * 1.8,
        baseAlpha: 0.2 + Math.random() * 0.7,
        alphaOffset: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03
      });
    }
  }

  initClouds() {
    this.clouds = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      this.clouds.push({
        x: (i * this.width) / count + Math.random() * 100,
        y: 40 + Math.random() * (this.height * 0.28),
        scale: 0.7 + Math.random() * 0.7,
        speed: 0.15 + (i * 0.06),
        opacity: 0.25 + Math.random() * 0.25
      });
    }
  }

  triggerLightning() {
    this.flashOpacity = 0.85;
    const startX = Math.random() * this.width;
    const bolt = [];
    let curX = startX;
    let curY = 0;
    const targetY = this.height * (0.6 + Math.random() * 0.3);

    while (curY < targetY) {
      curY += 12 + Math.random() * 20;
      curX += (Math.random() - 0.5) * 45;
      bolt.push({ x: curX, y: curY });
    }
    this.lightningBolts.push({
      segments: bolt,
      life: 8,
      thickness: 2.5 + Math.random() * 2
    });
  }

  drawSkyBackground() {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);

    if (this.isNight) {
      if (this.condition === 'thunderstorm') {
        grad.addColorStop(0, '#0a0d17');
        grad.addColorStop(0.5, '#121626');
        grad.addColorStop(1, '#070911');
      } else if (this.condition === 'rain') {
        grad.addColorStop(0, '#0d1627');
        grad.addColorStop(0.6, '#182438');
        grad.addColorStop(1, '#0b111e');
      } else if (this.condition === 'cloudy' || this.condition === 'partly-cloudy') {
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#1e293b');
        grad.addColorStop(1, '#0b0f19');
      } else {
        // Clear Starry Night
        grad.addColorStop(0, '#070b19');
        grad.addColorStop(0.4, '#0e1738');
        grad.addColorStop(0.85, '#15254f');
        grad.addColorStop(1, '#0a1024');
      }
    } else {
      // Day
      if (this.condition === 'thunderstorm') {
        grad.addColorStop(0, '#1c2233');
        grad.addColorStop(0.5, '#2b3447');
        grad.addColorStop(1, '#151924');
      } else if (this.condition === 'rain') {
        grad.addColorStop(0, '#2d3e52');
        grad.addColorStop(0.5, '#40546d');
        grad.addColorStop(1, '#253547');
      } else if (this.condition === 'cloudy') {
        grad.addColorStop(0, '#4b6584');
        grad.addColorStop(0.5, '#778ca3');
        grad.addColorStop(1, '#475d74');
      } else if (this.condition === 'partly-cloudy') {
        grad.addColorStop(0, '#2b6cb0');
        grad.addColorStop(0.5, '#4299e1');
        grad.addColorStop(1, '#90cdf4');
      } else if (this.condition === 'fog') {
        grad.addColorStop(0, '#576574');
        grad.addColorStop(0.6, '#8395a7');
        grad.addColorStop(1, '#576574');
      } else {
        // Clear bright day
        grad.addColorStop(0, '#1a73e8');
        grad.addColorStop(0.45, '#4285f4');
        grad.addColorStop(0.85, '#6ba5f7');
        grad.addColorStop(1, '#a1c4fd');
      }
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawStars() {
    if (!this.isNight) return;
    const ctx = this.ctx;
    const t = Date.now() * 0.002;

    this.stars.forEach(s => {
      const alpha = s.baseAlpha * (0.6 + 0.4 * Math.sin(t * s.speed * 20 + s.alphaOffset));
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, alpha)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Random shooting star
    if (Math.random() < 0.008 && this.shootingStars.length < 2) {
      this.shootingStars.push({
        x: Math.random() * (this.width * 0.8),
        y: Math.random() * (this.height * 0.4),
        length: 70 + Math.random() * 60,
        speed: 14 + Math.random() * 8,
        opacity: 1,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3
      });
    }

    // Render & update shooting stars
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const m = this.shootingStars[i];
      m.x += Math.cos(m.angle) * m.speed;
      m.y += Math.sin(m.angle) * m.speed;
      m.opacity -= 0.025;

      if (m.opacity <= 0) {
        this.shootingStars.splice(i, 1);
        continue;
      }

      ctx.save();
      const tailX = m.x - Math.cos(m.angle) * m.length;
      const tailY = m.y - Math.sin(m.angle) * m.length;
      const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, `rgba(255,255,255,${m.opacity})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawSunRays() {
    if (this.isNight || this.condition !== 'clear') return;
    const ctx = this.ctx;
    const sunX = this.width * 0.82;
    const sunY = this.height * 0.16;

    this.sunAngle += 0.002;

    // Glowing sun core
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 260);
    sunGlow.addColorStop(0, 'rgba(255, 236, 179, 0.95)');
    sunGlow.addColorStop(0.2, 'rgba(255, 214, 102, 0.45)');
    sunGlow.addColorStop(0.6, 'rgba(255, 183, 77, 0.15)');
    sunGlow.addColorStop(1, 'rgba(255, 183, 77, 0)');

    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 260, 0, Math.PI * 2);
    ctx.fill();

    // Rotating soft God Rays
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(this.sunAngle);
    const rayCount = 10;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i * Math.PI * 2) / rayCount;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const r = 500;
      ctx.arc(0, 0, r, angle - 0.08, angle + 0.08);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 250, 220, 0.04)';
      ctx.fill();
    }
    ctx.restore();
  }

  drawMoon() {
    if (!this.isNight || (this.condition !== 'clear' && this.condition !== 'partly-cloudy')) return;
    const ctx = this.ctx;
    const moonX = this.width * 0.82;
    const moonY = this.height * 0.16;
    const moonR = 34;

    // Outer glow
    const glow = ctx.createRadialGradient(moonX, moonY, moonR, moonX, moonY, moonR * 3.5);
    glow.addColorStop(0, 'rgba(224, 242, 254, 0.35)');
    glow.addColorStop(0.6, 'rgba(186, 230, 253, 0.1)');
    glow.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Moon body
    ctx.save();
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();

    // Subtle moon craters
    ctx.fillStyle = 'rgba(203, 213, 225, 0.35)';
    [
      { dx: -10, dy: -8, r: 6 },
      { dx: 12, dy: 6, r: 8 },
      { dx: -4, dy: 14, r: 5 },
      { dx: 7, dy: -12, r: 4 }
    ].forEach(c => {
      ctx.beginPath();
      ctx.arc(moonX + c.dx, moonY + c.dy, c.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawClouds() {
    if (this.condition === 'clear' && this.isNight) return;
    const ctx = this.ctx;

    this.clouds.forEach(c => {
      c.x += c.speed;
      if (c.x - 250 * c.scale > this.width) {
        c.x = -300 * c.scale;
        c.y = 30 + Math.random() * (this.height * 0.3);
      }

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);

      const cloudAlpha = this.condition === 'clear' ? c.opacity * 0.4 : c.opacity;
      const cloudColor = this.isNight
        ? `rgba(20, 30, 50, ${cloudAlpha})`
        : this.condition === 'thunderstorm'
        ? `rgba(35, 42, 58, ${cloudAlpha * 1.3})`
        : this.condition === 'rain'
        ? `rgba(180, 195, 215, ${cloudAlpha * 0.9})`
        : `rgba(255, 255, 255, ${cloudAlpha})`;

      ctx.fillStyle = cloudColor;
      ctx.beginPath();
      ctx.arc(0, 0, 55, 0, Math.PI * 2);
      ctx.arc(45, -20, 65, 0, Math.PI * 2);
      ctx.arc(105, -10, 50, 0, Math.PI * 2);
      ctx.arc(145, 10, 40, 0, Math.PI * 2);
      ctx.arc(60, 20, 55, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  drawRain() {
    if (this.condition !== 'rain' && this.condition !== 'thunderstorm') return;
    const ctx = this.ctx;
    const windTilt = (this.windSpeed / 10) * 1.5;

    ctx.strokeStyle = this.condition === 'thunderstorm' ? 'rgba(210, 230, 255, 0.65)' : 'rgba(200, 225, 255, 0.55)';
    ctx.lineCap = 'round';

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.y += p.speed;
      p.x += windTilt;

      ctx.lineWidth = p.thickness;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + windTilt * 1.8, p.y + p.length);
      ctx.stroke();

      // Hit bottom -> produce ripple splash
      if (p.y > this.height - 25) {
        if (Math.random() < 0.3) {
          this.ripples.push({
            x: p.x,
            y: this.height - 5 - Math.random() * 20,
            radius: 1,
            maxRadius: 10 + Math.random() * 12,
            opacity: 0.6
          });
        }
        p.y = -20;
        p.x = Math.random() * (this.width + 200) - 100;
      }
    }

    // Draw ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += 0.6;
      r.opacity -= 0.025;

      if (r.opacity <= 0 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(180, 220, 255, ${r.opacity})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawLightning() {
    if (this.condition !== 'thunderstorm') return;
    const ctx = this.ctx;

    // Random trigger
    if (Math.random() < 0.007 && this.lightningBolts.length === 0) {
      this.triggerLightning();
    }

    // Screen flash
    if (this.flashOpacity > 0) {
      ctx.fillStyle = `rgba(240, 245, 255, ${this.flashOpacity})`;
      ctx.fillRect(0, 0, this.width, this.height);
      this.flashOpacity -= 0.08;
    }

    // Render bolts
    for (let bIdx = this.lightningBolts.length - 1; bIdx >= 0; bIdx--) {
      const bolt = this.lightningBolts[bIdx];
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 15;
      ctx.lineWidth = bolt.thickness;
      ctx.lineJoin = 'bevel';

      ctx.beginPath();
      ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
      for (let s = 1; s < bolt.segments.length; s++) {
        ctx.lineTo(bolt.segments[s].x, bolt.segments[s].y);
      }
      ctx.stroke();
      ctx.restore();

      bolt.life--;
      if (bolt.life <= 0) {
        this.lightningBolts.splice(bIdx, 1);
      }
    }
  }

  drawFog() {
    if (this.condition !== 'fog') return;
    const ctx = this.ctx;

    this.particles.forEach(p => {
      p.x += p.speedX;
      if (p.x - p.radius > this.width) {
        p.x = -p.radius;
      }
      const grad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.2, p.x, p.y, p.radius);
      grad.addColorStop(0, `rgba(230, 235, 245, ${p.opacity})`);
      grad.addColorStop(1, 'rgba(230, 235, 245, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawParticles() {
    if (this.condition !== 'clear' || this.isNight) return;
    const ctx = this.ctx;

    this.particles.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.pulse += 0.03;

      if (p.y < 0) p.y = this.height;
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;

      const alpha = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));
      ctx.fillStyle = `rgba(255, 236, 179, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawSkyBackground();
    this.drawStars();
    this.drawMoon();
    this.drawSunRays();
    this.drawClouds();
    this.drawFog();
    this.drawParticles();
    this.drawRain();
    this.drawLightning();

    this.animationFrameId = requestAnimationFrame(() => this.render());
  }

  start() {
    if (!this.animationFrameId) {
      this.render();
    }
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

window.WeatherCanvas = WeatherCanvas;
