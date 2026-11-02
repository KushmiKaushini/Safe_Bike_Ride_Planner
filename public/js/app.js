/*
 * =============================================================================
 * Safe Bike Ride Planner — Application Logic
 * K K K Ekanayake — Senior Web Developer
 * =============================================================================
 * Core SPA logic: state management, API calls, rendering, animations.
 * All API calls use relative URLs to the Express backend proxy.
 * =============================================================================
 */

/* ================================ Global State ================================ */
window.appState = {
  user: null,
  currentReport: null,
  history: [],
  loading: false,
  error: null,
};

/* ================================ Initialization ================================ */

/**
 * initApp — Entry point fired on DOMContentLoaded.
 * FIX-19: Smart auth-aware reveal. Waits for auth check AND minimum 1.5s
 * rather than hardcoded 3.2s delay, preventing blocked interaction.
 */
function initApp() {
  // Handle OAuth redirect first (clean URL before anything else)
  handleOAuthRedirect();

  const MIN_MS = 1500;
  const t0 = Date.now();

  const authDone = checkAuth().then(function (user) {
    if (user) {
      loadHistory();
    }
    return user;
  });

  Promise.all([authDone, new Promise(function (r) { setTimeout(r, MIN_MS); })]).then(function () {
    const elapsed = Date.now() - t0;
    const remaining = Math.max(0, MIN_MS - elapsed);
    setTimeout(function () {
      var splash = document.getElementById('splash-screen');
      var app = document.getElementById('app');
      if (splash) splash.classList.add('hidden');
      if (app) app.classList.add('visible');
    }, remaining);
  });

  // Set up enter key for search input
  var searchInput = document.getElementById('city-search');
  if (searchInput) {
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCityCheck();
      }
    });
  }
}

/* ================================ Location Detection ================================ */

/**
 * detectLocation — Use browser Geolocation API; fall back to IP-based geolocation.
 */
function detectLocation() {
  if (!navigator.geolocation) {
    fallbackGeolocation();
    return;
  }

  showLoading('Detecting your location...');

  navigator.geolocation.getCurrentPosition(
    function (position) {
      var lat = position.coords.latitude;
      var lon = position.coords.longitude;
      checkByCoords(lat, lon);
    },
    function (err) {
      console.warn('[Geo] Browser geolocation failed:', err.message);
      fallbackGeolocation();
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }
  );
}

/**
 * fallbackGeolocation — Use IP-based geolocation API via backend proxy.
 */
async function fallbackGeolocation() {
  showLoading('Detecting location via IP...');

  try {
    var res = await fetch('/api/external/geocode/ip', {
      credentials: 'same-origin',
    });

    if (!res.ok) {
      throw new Error('Geolocation service unavailable');
    }

    var data = await res.json();

    if (data && (data.lat != null || (data.data && data.data.lat != null))) {
      checkByCoords(data.lat || (data.data && data.data.lat), data.lon || (data.data && data.data.lon));
    } else {
      throw new Error('Could not determine your location');
    }
  } catch (err) {
    console.error('[Geo] Fallback geolocation failed:', err.message);
    showError('Could not detect your location. Please enter a city name.');
    hideLoading();
  }
}

/* ================================ Core Check Functions ================================ */

/**
 * checkCity — Geocode a city name, then fetch weather + AQI and render report.
 * @param {string} cityName - City name to check
 */
async function checkCity(cityName) {
  if (!cityName || cityName.trim() === '') {
    showError('Please enter a city name.');
    return;
  }

  showLoading('Checking conditions for ' + cityName + '...');
  clearError();

  try {
    var geoRes = await fetch(
      '/api/external/geocode?city=' + encodeURIComponent(cityName.trim()),
      { credentials: 'same-origin' }
    );

    if (!geoRes.ok) {
      var geoErr = await geoRes.json().catch(function () {
        return { error: 'City not found' };
      });
      throw new Error(geoErr.error || 'City not found. Please check the spelling.');
    }

    var geoData = await geoRes.json();
    var lat = geoData.data ? geoData.data.lat : geoData.lat;
    var lon = geoData.data ? geoData.data.lon : geoData.lon;
    var displayName = (geoData.data && geoData.data.name) || (geoData.data && geoData.data.displayName) || cityName.trim();

    await fetchReportData(lat, lon, displayName);
  } catch (err) {
    console.error('[Check] City check failed:', err.message);
    showError(err.message);
    hideLoading();
  }
}

/**
 * checkByCoords — Fetch weather + AQI by coordinates and render report.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 */
async function checkByCoords(lat, lon) {
  showLoading('Checking conditions...');
  clearError();

  try {
    // Try reverse geocode to get city name
    var displayName = 'Your Location';

    try {
      var revGeoRes = await fetch(
        '/api/external/geocode/reverse?lat=' + lat + '&lon=' + lon,
        { credentials: 'same-origin' }
      );
      if (revGeoRes.ok) {
        var revGeoData = await revGeoRes.json();
        if (revGeoData && (revGeoData.city || (revGeoData.data && revGeoData.data.city))) {
          displayName = revGeoData.city || revGeoData.data.city;
        }
      }
    } catch (e) {
      // Non-critical; use fallback name
    }

    await fetchReportData(lat, lon, displayName);
  } catch (err) {
    console.error('[Check] Coords check failed:', err.message);
    showError(err.message);
    hideLoading();
  }
}

/**
 * fetchReportData — Fetch weather and AQI data, calculate score, render.
 * FIX-07: Score is now calculated server-side via POST /api/external/score.
 * This ensures the displayed score is always identical to the saved score.
 * @param {number} lat
 * @param {number} lon
 * @param {string} displayName
 */
async function fetchReportData(lat, lon, displayName) {
  try {
    var weatherRes = await fetch(
      '/api/external/weather?lat=' + lat + '&lon=' + lon,
      { credentials: 'same-origin' }
    );

    if (!weatherRes.ok) {
      throw new Error('Weather data unavailable. Please try again.');
    }

    var weatherData = await weatherRes.json();

    // Fetch AQI (allow failure — degrade gracefully)
    var aqiData = null;
    try {
      var aqiRes = await fetch(
        '/api/external/air-quality?lat=' + lat + '&lon=' + lon,
        { credentials: 'same-origin' }
      );
      if (aqiRes.ok) {
        aqiData = await aqiRes.json();
      }
    } catch (e) {
      console.warn('[AQI] Air quality fetch failed, degrading gracefully:', e.message);
    }

    // FIX-07: Delegate scoring to the backend so the displayed score matches what gets saved.
    // Previously the browser computed its own score that could differ by up to 30 pts from the DB value.
    var serverScore = null;
    try {
      var scoreRes = await fetch('/api/external/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          temp:      weatherData.data ? weatherData.data.temp      : null,
          humidity:  weatherData.data ? weatherData.data.humidity  : null,
          windSpeed: weatherData.data ? weatherData.data.windSpeed : null,
          condition: weatherData.data ? weatherData.data.condition : null,
          aqi:       aqiData && aqiData.data ? aqiData.data.aqi    : null,
        }),
      });
      if (scoreRes.ok) {
        var scoreData = await scoreRes.json();
        if (scoreData.success) serverScore = scoreData.data;
      }
    } catch (e) {
      console.warn('[Score] Server score fetch failed, falling back to local calculation:', e.message);
    }

    // Build combined data (passes serverScore so buildSafetyReport uses it when available)
    var report = buildSafetyReport(weatherData, aqiData, displayName, lat, lon, serverScore);

    // Store in state
    window.appState.currentReport = report;

    // Render
    renderReport(report);
    hideLoading();
  } catch (err) {
    console.error('[Report] Failed to fetch report data:', err.message);
    showError(err.message);
    hideLoading();
  }
}

/* ================================ Safety Score Calculation ================================ */

/**
 * buildSafetyReport — Calculate safety score from weather + AQI data.
 * FIX-07: If `serverScore` is provided (from POST /api/external/score), it takes
 * precedence over the local calculation so displayed score always matches DB.
 * The local calculation remains as a graceful fallback if the score endpoint is unavailable.
 * Weighting: Weather 40%, Air Quality 40%, Road Conditions 20%.
 *
 * Weather scoring:
 *   - Temperature: ideal 15-25°C = 100, penalize extremes
 *   - Wind: <15 km/h = 100, >40 km/h = 0
 *   - Rain/snow: clear = 100, heavy precipitation = 0
 *
 * AQI scoring:
 *   - US EPA AQI: 0-50 (good)=100, 51-100=75, 101-150=50, 151-200=25, 201+=0
 *
 * @param {Object} weather - Weather API response
 * @param {Object|null} aqi - Air quality API response
 * @param {string} displayName - City name
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Object} Complete report object
 */
function buildSafetyReport(weather, aqi, displayName, lat, lon, serverScore) {
  // --- Weather scoring ---
  var weatherScore = 75; // default moderate

  if (weather) {
    var temp = weather.temp != null ? weather.temp : 20;
    var wind = weather.windSpeed != null ? weather.windSpeed : 10;
    var condition = (weather.condition || weather.description || '').toLowerCase();
    var humidity = weather.humidity != null ? weather.humidity : 50;

    // Temperature score: ideal 15-25°C
    var tempScore = 100;
    if (temp < 15) tempScore = Math.max(0, 100 - (15 - temp) * 5);
    if (temp > 25) tempScore = Math.max(0, 100 - (temp - 25) * 5);
    if (temp < 0) tempScore = 10;
    if (temp > 40) tempScore = 10;

    // FIX-05: Wind speed from OWM is in m/s. Safe cycling threshold is ≤ 8 m/s (~29 km/h).
    // Old thresholds (> 15, > 50) were treating 54 km/h winds as perfectly safe.
    var windScore = 100;
    if (wind > 8)  windScore = Math.max(0, 100 - (wind - 8) * 10);
    if (wind > 18) windScore = 0;

    // Condition score based on weather description
    // FIX-06: Thunderstorm must be checked BEFORE rain — "thunderstorm" contains "rain"
    // so it would previously match the rain branch and score 40 (Caution) instead of 10 (Unsafe).
    var conditionScore = 100;
    if (condition.includes('thunderstorm')) {
      conditionScore = 10;
    } else if (
      condition.includes('rain') ||
      condition.includes('drizzle')
    ) {
      conditionScore = 40;
    }
    if (
      condition.includes('heavy') ||
      condition.includes('snow') ||
      condition.includes('blizzard')
    ) {
      conditionScore = 15;
    }
    if (condition.includes('fog') || condition.includes('mist') || condition.includes('haze')) {
      conditionScore = 50;
    }
    if (condition.includes('clear') || condition.includes('sunny')) {
      conditionScore = 100;
    }
    if (condition.includes('cloud')) {
      conditionScore = 85;
    }

    // Humidity impact
    var humidityPenalty = 0;
    if (humidity > 85) humidityPenalty = 10;
    if (humidity < 20) humidityPenalty = 5;

    weatherScore = Math.round(tempScore * 0.3 + windScore * 0.35 + conditionScore * 0.35 - humidityPenalty);
    weatherScore = Math.max(0, Math.min(100, weatherScore));
  }

  // --- AQI scoring ---
  var aqiScore = 75; // default moderate
  var aqiValue = null;
  var mainPollutant = null;

  if (aqi) {
    aqiValue = aqi.aqi != null ? aqi.aqi : aqi.index;
    mainPollutant = aqi.mainPollutant || null;

    // FIX-03: OWM Air Pollution API returns 1–5 European scale, NOT US EPA 0–500.
    // 1 = Good, 2 = Fair, 3 = Moderate, 4 = Poor, 5 = Very Poor
    var aqiScoreMap = { 1: 100, 2: 75, 3: 50, 4: 25, 5: 0 };
    if (aqiValue != null) {
      aqiScore = (aqiScoreMap[aqiValue] !== undefined) ? aqiScoreMap[aqiValue] : 50;
    }
  }

  // --- Composite score ---
  // Weather: 40%, Air Quality: 40%, Condition (general): 20%
  var conditionScore = Math.round(weatherScore * 0.5 + aqiScore * 0.5);
  var totalScore = Math.round(weatherScore * 0.4 + aqiScore * 0.4 + conditionScore * 0.2);
  totalScore = Math.max(0, Math.min(100, totalScore));

  // FIX-07: If the server returned an authoritative score, use it instead of local calculation.
  // This guarantees that displayed score == saved score in the DB.
  if (serverScore && typeof serverScore.safetyScore === 'number') {
    totalScore    = serverScore.safetyScore;
    conditionScore = totalScore; // keep conditionScore in ballpark for UI progress bars
  }

  // --- Recommendation ---
  var level, recommendation, tips;

  if (totalScore >= 70) {
    level = 'safe';
    recommendation = 'Safe to Ride';
    tips = [
      'Weather conditions are favorable for cycling.',
      'Stay hydrated and enjoy the ride!',
      'Always wear a helmet and follow traffic rules.',
    ];
  } else if (totalScore >= 40) {
    level = 'caution';
    recommendation = 'Exercise Caution';
    tips = [];

    if (weather && weather.windSpeed > 20) {
      tips.push('Wind is strong — consider sheltered routes.');
    }
    if (weather && weather.temp > 35) {
      tips.push('Extreme heat — ride early morning or evening.');
    }
    if (weather && weather.temp < 5) {
      tips.push('Cold temperatures — dress in layers and keep extremities warm.');
    }
    if (aqiValue != null && aqiValue > 100) {
      tips.push('Air quality is moderate — consider a mask if sensitive.');
    }
    if (weather && weather.condition && (weather.condition.toLowerCase().includes('rain') || weather.condition.toLowerCase().includes('drizzle'))) {
      tips.push('Light precipitation — wet roads reduce traction.');
    }

    if (tips.length === 0) {
      tips.push('Conditions are acceptable but check local weather changes.');
      tips.push('Consider a shorter ride than usual.');
    }
  } else {
    level = 'unsafe';
    recommendation = 'Not Recommended';
    tips = [];

    if (weather && weather.windSpeed > 35) {
      tips.push('High wind speeds make cycling dangerous — stay indoors.');
    }
    if (weather && weather.temp > 40) {
      tips.push('Extreme heat warning — avoid outdoor activity.');
    }
    if (weather && weather.temp < -5) {
      tips.push('Freezing temperatures — risk of hypothermia and icy roads.');
    }
    if (weather && weather.condition && weather.condition.toLowerCase().includes('thunderstorm')) {
      tips.push('Thunderstorms — seek shelter immediately.');
    }
    if (aqiValue != null && aqiValue > 150) {
      tips.push('Poor air quality — limit outdoor exposure.');
    }
    if (weather && weather.condition && weather.condition.toLowerCase().includes('snow')) {
      tips.push('Snow makes roads hazardous — consider alternative transport.');
    }

    if (tips.length === 0) {
      tips.push('Conditions are not suitable for cycling today.');
      tips.push('Check back later or try a different location.');
    }
  }

  return {
    city: displayName,
    lat: lat,
    lon: lon,
    safetyScore: totalScore,
    weatherScore: weatherScore,
    aqiScore: aqiScore,
    conditionScore: conditionScore,
    level: level,
    recommendation: recommendation,
    tips: tips,
    weather: {
      temp: weather ? weather.temp : null,
      feelsLike: weather ? weather.feelsLike : null,
      humidity: weather ? weather.humidity : null,
      windSpeed: weather ? weather.windSpeed : null,
      description: weather ? (weather.description || weather.condition || '') : '',
      icon: weather ? weather.icon : null,
      tempMin: weather ? weather.tempMin : null,
      tempMax: weather ? weather.tempMax : null,
    },
    airQuality: {
      aqi: aqiValue,
      mainPollutant: mainPollutant,
      level: getAQILabel(aqiValue),
    },
    summary: recommendation + ' — ' + displayName + ' scores ' + totalScore + '/100.',
  };
}

/**
 * Get human-readable AQI label.
 * @param {number|null} aqi
 * @returns {string}
 */
function getAQILabel(aqi) {
  if (aqi == null) return 'Unavailable';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

/* ================================ Rendering ================================ */

/**
 * renderReport — Build and display the full safety report card with animations.
 * @param {Object} data - Report data from buildSafetyReport
 */
function renderReport(data) {
  if (!data) return;

  var reportSection = document.getElementById('report-section');
  if (!reportSection) return;

  // Show the report section with animation
  reportSection.classList.add('active');

  // --- City & Temp ---
  var cityNameEl = document.getElementById('report-city-name');
  var cityTempEl = document.getElementById('report-temp-value');
  if (cityNameEl) cityNameEl.textContent = data.city;
  if (cityTempEl) {
    cityTempEl.textContent = data.weather.temp != null ? Math.round(data.weather.temp) + '°C' : '--';
  }

  // --- Score Gauge ---
  renderGauge(data.safetyScore, data.level);

  // --- Weather Cards ---
  renderWeatherCards(data);

  // --- Condition Breakdown ---
  renderConditionBreakdown(data);

  // --- Recommendation ---
  renderRecommendation(data);

  // --- Report Actions (save/history) ---
  var reportActions = document.getElementById('report-actions');
  if (reportActions) {
    if (window.appState.user) {
      reportActions.classList.remove('auth-hidden');
    } else {
      reportActions.classList.add('auth-hidden');
    }
  }

  // Scroll to report
  setTimeout(function () {
    reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

/**
 * renderGauge — Render SVG score gauge with counting animation.
 * @param {number} score - 0-100
 * @param {string} level - 'safe', 'caution', 'unsafe'
 */
function renderGauge(score, level) {
  var gaugeFill = document.getElementById('gauge-fill');
  var scoreNumber = document.getElementById('score-number');
  var scoreLabel = document.getElementById('score-label');

  if (!gaugeFill || !scoreNumber || !scoreLabel) return;

  // Circle circumference: 2 * PI * r (r = 78 for viewBox 0 0 200 200)
  var radius = 78;
  var circumference = 2 * Math.PI * radius;
  var offset = circumference - (score / 100) * circumference;

  // Set gauge color based on level
  var color;
  var labelText;
  var labelClass;

  if (level === 'safe') {
    color = 'url(#gauge-gradient-safe)';
    labelText = 'Safe to Ride';
    labelClass = 'score-safe';
  } else if (level === 'caution') {
    color = 'url(#gauge-gradient-caution)';
    labelText = 'Exercise Caution';
    labelClass = 'score-caution';
  } else {
    color = 'url(#gauge-gradient-unsafe)';
    labelText = 'Not Recommended';
    labelClass = 'score-unsafe';
  }

  // Set SVG stroke and reset for animation
  gaugeFill.setAttribute('stroke', color);
  gaugeFill.style.strokeDasharray = circumference;
  gaugeFill.style.strokeDashoffset = circumference;

  // Animate stroke with slight delay
  requestAnimationFrame(function () {
    gaugeFill.style.strokeDashoffset = offset;
  });

  // Animate number counting up
  scoreLabel.textContent = labelText;
  scoreLabel.className = 'score-label ' + labelClass;

  animateCounter(scoreNumber, 0, score, 1500);
}

/**
 * animateCounter — Animate number from start to end over duration.
 * @param {HTMLElement} el - Element to update
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} duration - Animation duration in ms
 */
function animateCounter(el, start, end, duration) {
  var startTime = performance.now();

  function update(currentTime) {
    var elapsed = currentTime - startTime;
    var progress = Math.min(elapsed / duration, 1);

    // Ease out cubic
    var eased = 1 - Math.pow(1 - progress, 3);
    var current = Math.round(start + (end - start) * eased);

    el.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * renderWeatherCards — Populate temperature, wind, and air quality cards.
 * @param {Object} data - Report data
 */
function renderWeatherCards(data) {
  var w = data.weather;

  // Temperature card
  var tempVal = document.getElementById('temp-value');
  var tempSub = document.getElementById('temp-sub');
  if (tempVal) {
    tempVal.textContent = w.temp != null ? Math.round(w.temp) + '°C' : '--';
  }
  if (tempSub) {
    var parts = [];
    if (w.feelsLike != null) parts.push('Feels ' + Math.round(w.feelsLike) + '°C');
    if (w.tempMin != null && w.tempMax != null) {
      parts.push('H:' + Math.round(w.tempMax) + '° L:' + Math.round(w.tempMin) + '°');
    }
    tempSub.textContent = parts.join(' · ') || '--';
  }

  // Wind card
  var windVal = document.getElementById('wind-value');
  var windSub = document.getElementById('wind-sub');
  if (windVal) {
    windVal.textContent = w.windSpeed != null ? Math.round(w.windSpeed) + ' km/h' : '--';
  }
  if (windSub) {
    windSub.textContent = w.windSpeed != null ? getWindDirection(w.windSpeed) : '--';
  }

  // Air quality card
  var aqiVal = document.getElementById('aqi-value');
  var aqiSub = document.getElementById('aqi-sub');
  var a = data.airQuality;
  if (aqiVal) {
    aqiVal.textContent = a.aqi != null ? a.aqi : '--';
  }
  if (aqiSub) {
    var parts = [];
    parts.push(a.level || 'N/A');
    if (a.mainPollutant) parts.push(a.mainPollutant.toUpperCase());
    aqiSub.textContent = parts.join(' · ') || '--';
  }
}

/**
 * getWindDirection — Simple wind descriptor based on speed.
 * @param {number} speed - Wind speed in km/h
 * @returns {string}
 */
function getWindDirection(speed) {
  if (speed < 5) return 'Calm';
  if (speed < 15) return 'Light breeze';
  if (speed < 25) return 'Moderate breeze';
  if (speed < 35) return 'Strong breeze';
  if (speed < 45) return 'Strong wind';
  return 'Very strong wind';
}

/**
 * renderConditionBreakdown — Render weather, air quality, condition bars.
 * @param {Object} data - Report data
 */
function renderConditionBreakdown(data) {
  var bars = [
    { id: 'bar-weather', label: 'Weather', score: data.weatherScore },
    { id: 'bar-aqi', label: 'Air Quality', score: data.aqiScore },
    { id: 'bar-condition', label: 'Overall Condition', score: data.conditionScore },
  ];

  bars.forEach(function (bar) {
    var fillEl = document.getElementById(bar.id + '-fill');
    var scoreEl = document.getElementById(bar.id + '-score');
    var labelEl = document.getElementById(bar.id + '-label');

    if (labelEl) labelEl.textContent = bar.label;
    if (scoreEl) scoreEl.textContent = bar.score;

    if (fillEl) {
      var cls = bar.score >= 70 ? 'good' : bar.score >= 40 ? 'moderate' : 'poor';
      fillEl.className = 'condition-fill ' + cls;

      // Animate width
      requestAnimationFrame(function () {
        fillEl.style.width = bar.score + '%';
      });
    }
  });
}

/**
 * renderRecommendation — Render ride recommendation with tips.
 * @param {Object} data - Report data
 */
function renderRecommendation(data) {
  var recIcon = document.getElementById('recommendation-icon');
  var recTitle = document.getElementById('recommendation-title');
  var recSummary = document.getElementById('recommendation-summary');
  var recTips = document.getElementById('recommendation-tips');

  if (recIcon) {
    recIcon.className = 'recommendation-icon ' + data.level;
    // Icons are set in HTML; the class changes color
  }

  if (recTitle) {
    recTitle.textContent = data.recommendation;
    recTitle.className = 'recommendation-title ' + data.level;
  }

  if (recSummary) {
    recSummary.textContent = data.summary;
  }

  if (recTips) {
    recTips.innerHTML = '';
    data.tips.forEach(function (tip) {
      var li = document.createElement('li');
      li.textContent = tip;
      recTips.appendChild(li);
    });
  }
}

/* ================================ Save / History API ================================ */

/**
 * saveReport — Save the current report to the user's history.
 */
async function saveReport() {
  var report = window.appState.currentReport;
  if (!report) {
    showError('No report to save. Check a location first.');
    return;
  }

  if (!window.appState.user) {
    showError('Please sign in to save reports.');
    return;
  }

  var saveBtn = document.getElementById('save-report-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }

  try {
    var res = await fetch('/api/ridechecks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        city: report.city,
        lat: report.lat,
        lon: report.lon,
        safetyScore: report.safetyScore,
        weather: {
          temp: report.weather.temp,
          feelsLike: report.weather.feelsLike,
          humidity: report.weather.humidity,
          windSpeed: report.weather.windSpeed,
          description: report.weather.description,
          icon: report.weather.icon,
          condition: report.weather.description,
        },
        airQuality: {
          aqi: report.airQuality.aqi,
          // FIX-04: Removed duplicate `index` field (was storing same value as `aqi`).
          // Added pm25 / pm10 for richer data if available on the report object.
          pm25: report.airQuality.pm25,
          pm10: report.airQuality.pm10,
          mainPollutant: report.airQuality.mainPollutant,
        },
        recommendation: report.level,
        summary: report.summary,
      }),
    });

    if (!res.ok) {
      var errData = await res.json().catch(function () {
        return { error: 'Failed to save report.' };
      });
      throw new Error(errData.error || 'Failed to save report.');
    }

    // Reload history
    await loadHistory();

    if (saveBtn) {
      saveBtn.textContent = '✓ Saved!';
      setTimeout(function () {
        saveBtn.textContent = 'Save This Report';
        saveBtn.disabled = false;
      }, 2000);
    }
  } catch (err) {
    console.error('[Save] Failed to save report:', err.message);
    showError(err.message);
    if (saveBtn) {
      saveBtn.textContent = 'Save This Report';
      saveBtn.disabled = false;
    }
  }
}

/**
 * loadHistory — Fetch the user's saved ride checks.
 */
async function loadHistory() {
  if (!window.appState.user) return;

  try {
    var res = await fetch('/api/ridechecks', {
      credentials: 'same-origin',
    });

    if (!res.ok) {
      if (res.status === 401) return;
      throw new Error('Failed to load history.');
    }

    var data = await res.json();
    // FIX-02: Guard against server error objects being silently treated as empty history.
    // Previously `data.data || data || []` would treat an error object as truthy.
    if (!data.success) throw new Error(data.error || 'Failed to fetch history');
    var checks = data.data || [];

    window.appState.history = checks;
    renderHistory(checks);
    renderStats(checks);
  } catch (err) {
    console.error('[History] Failed to load history:', err.message);
  }
}

/**
 * deleteReport — Delete a saved ride check.
 * @param {string} id - Ride check ID
 * @param {Event} e - Click event (to stop propagation)
 */
async function deleteReport(id, e) {
  if (e) {
    e.stopPropagation();
  }

  if (!confirm('Delete this ride check?')) return;

  try {
    var res = await fetch('/api/ridechecks/' + id, {
      method: 'DELETE',
      credentials: 'same-origin',
    });

    if (!res.ok) {
      throw new Error('Failed to delete report.');
    }

    // Remove from local state
    window.appState.history = window.appState.history.filter(function (r) {
      return r._id !== id;
    });

    renderHistory(window.appState.history);
    renderStats(window.appState.history);
  } catch (err) {
    console.error('[Delete] Failed to delete report:', err.message);
    showError(err.message);
  }
}

/* ================================ Render History & Stats ================================ */

/**
 * renderHistory — Render the history list in the modal.
 * @param {Array} checks - Array of ride check objects
 */
function renderHistory(checks) {
  var container = document.getElementById('history-list');
  var empty = document.getElementById('history-empty');
  var count = document.getElementById('history-count');

  if (!container) return;

  if (!checks || checks.length === 0) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'block';
    if (count) count.textContent = '0';
    return;
  }

  if (empty) empty.style.display = 'none';
  if (count) count.textContent = checks.length;

  container.innerHTML = '';

  // Sort newest first
  var sorted = checks.slice().sort(function (a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  sorted.forEach(function (check) {
    var item = document.createElement('div');
    item.className = 'history-item';
    item.setAttribute('data-id', check._id);

    var score = check.safetyScore || 0;
    var level = getLevelFromScore(score);

    var dateStr = '--';
    if (check.createdAt) {
      dateStr = new Date(check.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    var weatherSummary = '';
    if (check.weather && check.weather.temp != null) {
      weatherSummary = Math.round(check.weather.temp) + '°C';
      if (check.weather.description) {
        weatherSummary += ' · ' + check.weather.description;
      }
    }

    item.innerHTML =
      '<div class="history-score ' +
      level +
      '">' +
      score +
      '</div>' +
      '<div class="history-info">' +
      '<div class="history-city">' +
      escapeHtml(check.city || 'Unknown') +
      '</div>' +
      '<div class="history-meta">' +
      escapeHtml(dateStr) +
      (weatherSummary ? ' · ' + escapeHtml(weatherSummary) : '') +
      '</div>' +
      '</div>' +
      '<button class="history-delete" onclick="event.stopPropagation(); deleteReport(\'' +
      check._id +
      '\', event)" title="Delete">' +
      '<svg viewBox="0 0 24 24"><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z"/></svg>' +
      '</button>';

    // Click to load the report
    item.addEventListener('click', function () {
      loadReportFromHistory(check);
    });

    container.appendChild(item);
  });
}

/**
 * getLevelFromScore — Get level string from score.
 * @param {number} score
 * @returns {string}
 */
function getLevelFromScore(score) {
  if (score >= 70) return 'safe';
  if (score >= 40) return 'caution';
  return 'unsafe';
}

/**
 * loadReportFromHistory — Re-render a report from history data.
 * @param {Object} check - Saved ride check object
 */
function loadReportFromHistory(check) {
  if (!check) return;

  // Build a report object from history data
  var report = {
    city: check.city || 'Unknown',
    lat: check.lat,
    lon: check.lon,
    safetyScore: check.safetyScore || 0,
    weatherScore: calculateSubScore(check.weather, 'weather'),
    aqiScore: calculateSubScore(check.airQuality, 'aqi'),
    conditionScore: Math.round(
      ((calculateSubScore(check.weather, 'weather') +
        calculateSubScore(check.airQuality, 'aqi')) /
        2) *
        1
    ),
    level: check.recommendation || getLevelFromScore(check.safetyScore || 0),
    recommendation: getRecommendationText(
      check.recommendation || getLevelFromScore(check.safetyScore || 0)
    ),
    tips: [],
    weather: {
      temp: check.weather ? check.weather.temp : null,
      feelsLike: check.weather ? check.weather.feelsLike : null,
      humidity: check.weather ? check.weather.humidity : null,
      windSpeed: check.weather ? check.weather.windSpeed : null,
      description: check.weather ? check.weather.description || check.weather.condition : '',
      icon: check.weather ? check.weather.icon : null,
      tempMin: null,
      tempMax: null,
    },
    airQuality: {
      aqi: check.airQuality ? check.airQuality.aqi || check.airQuality.index : null,
      mainPollutant: check.airQuality ? check.airQuality.mainPollutant : null,
      level: getAQILabel(check.airQuality ? check.airQuality.aqi || check.airQuality.index : null),
    },
    summary: check.summary || '',
  };

  // Generate tips based on level
  if (report.level === 'safe') {
    report.tips = [
      'Weather conditions are favorable for cycling.',
      'Stay hydrated and enjoy the ride!',
      'Always wear a helmet and follow traffic rules.',
    ];
  } else if (report.level === 'caution') {
    report.tips = [
      'Conditions are acceptable but check local weather changes.',
      'Consider a shorter ride than usual.',
    ];
  } else {
    report.tips = [
      'Conditions are not suitable for cycling today.',
      'Check back later or try a different location.',
    ];
  }

  window.appState.currentReport = report;
  renderReport(report);

  // Close modal if open
  closeHistoryModal();
}

/**
 * calculateSubScore — Estimate sub-score from partial history data.
 * @param {Object|null} data
 * @param {string} type - 'weather' or 'aqi'
 * @returns {number}
 */
function calculateSubScore(data, type) {
  if (!data) return 75;

  if (type === 'weather') {
    // Use wind speed if available (m/s)
    if (data.windSpeed != null) {
      if (data.windSpeed <= 8) return 100;
      if (data.windSpeed <= 12) return 85;
      if (data.windSpeed <= 15) return 70;
      if (data.windSpeed <= 20) return 50;
      return 30;
    }
    // Use temperature if wind not available
    var temp = data.temp;
    if (temp != null) {
      if (temp >= 15 && temp <= 25) return 90;
      if (temp >= 10 && temp <= 30) return 75;
      return 50;
    }
    return 75;
  }

  if (type === 'aqi') {
    var aqi = data.aqi != null ? data.aqi : data.index;
    if (aqi == null) return 75;
    if (aqi <= 50) return 100;
    if (aqi <= 100) return 75;
    if (aqi <= 150) return 50;
    return 25;
  }

  return 75;
}

/**
 * getRecommendationText — Map level to display text.
 * @param {string} level
 * @returns {string}
 */
function getRecommendationText(level) {
  if (level === 'safe') return 'Safe to Ride';
  if (level === 'caution') return 'Exercise Caution';
  return 'Not Recommended';
}

/**
 * renderStats — Render statistics from history data.
 * @param {Array} checks - Array of ride check objects
 */
function renderStats(checks) {
  var statsSection = document.getElementById('stats-section');
  if (!statsSection) return;

  if (!checks || checks.length === 0 || !window.appState.user) {
    statsSection.classList.remove('active');
    return;
  }

  var total = checks.length;
  var totalScore = 0;
  var safe = 0;
  var caution = 0;
  var unsafe = 0;

  checks.forEach(function (c) {
    var score = c.safetyScore || 0;
    totalScore += score;
    if (score >= 70) safe++;
    else if (score >= 40) caution++;
    else unsafe++;
  });

  var avgScore = Math.round(totalScore / total);

  // Update numbers
  var totalEl = document.getElementById('stat-total');
  var avgEl = document.getElementById('stat-avg');
  if (totalEl) totalEl.textContent = total;
  if (avgEl) avgEl.textContent = avgScore;

  // Update breakdown bar
  var safeBar = document.getElementById('stat-bar-safe');
  var cautionBar = document.getElementById('stat-bar-caution');
  var unsafeBar = document.getElementById('stat-bar-unsafe');

  if (safeBar) {
    safeBar.style.width = (safe / total) * 100 + '%';
    safeBar.title = safe + ' safe rides';
  }
  if (cautionBar) {
    cautionBar.style.width = (caution / total) * 100 + '%';
    cautionBar.title = caution + ' cautious rides';
  }
  if (unsafeBar) {
    unsafeBar.style.width = (unsafe / total) * 100 + '%';
    unsafeBar.title = unsafe + ' unsafe rides';
  }

  statsSection.classList.add('active');
}

/* ================================ Modal Functions ================================ */

var lastFocusedElement = null;

/**
 * FIX-20: trapFocus — Traps keyboard Tab navigation inside active modal.
 */
function trapFocus(el) {
  var focusable = el.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable || focusable.length === 0) return;
  var first = focusable[0];
  var last = focusable[focusable.length - 1];

  el.onkeydown = function (e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
}

/**
 * openHistoryModal — Show the history modal and load data.
 */
function openHistoryModal() {
  var modal = document.getElementById('history-modal');
  if (!modal) return;

  lastFocusedElement = document.activeElement;
  modal.classList.add('active');
  trapFocus(modal);

  // Focus close button or first focusable element
  var closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) closeBtn.focus();

  // Reload history data
  if (window.appState.user) {
    loadHistory();
  }
}

/**
 * closeHistoryModal — Hide the history modal.
 */
function closeHistoryModal() {
  var modal = document.getElementById('history-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.onkeydown = null;
  }
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

/* ================================ UI Helpers ================================ */

/**
 * showLoading — Show loading spinner with custom message.
 * @param {string} message
 */
function showLoading(message) {
  window.appState.loading = true;

  var container = document.getElementById('loading-container');
  var text = document.getElementById('loading-text');
  if (container) container.classList.add('active');
  if (text) text.textContent = message || 'Loading...';
}

/**
 * hideLoading — Hide loading spinner.
 */
function hideLoading() {
  window.appState.loading = false;

  var container = document.getElementById('loading-container');
  if (container) container.classList.remove('active');
}

/**
 * showError — Display error message.
 * @param {string} message
 */
function showError(message) {
  window.appState.error = message;

  var el = document.getElementById('error-message');
  if (el) {
    el.textContent = message;
    el.classList.add('active');
  }
}

/**
 * clearError — Clear error message.
 */
function clearError() {
  window.appState.error = null;

  var el = document.getElementById('error-message');
  if (el) el.classList.remove('active');
}

/**
 * handleCityCheck — Read city input and trigger check.
 */
function handleCityCheck() {
  var input = document.getElementById('city-search');
  if (!input) return;

  var city = input.value.trim();
  checkCity(city);
}

/* ================================ Event Listeners & Init ================================ */

// Close modal on overlay click
document.addEventListener('click', function (e) {
  var modal = document.getElementById('history-modal');
  if (modal && modal.classList.contains('active')) {
    if (e.target === modal) {
      closeHistoryModal();
    }
  }
});

// Escape key closes modal
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeHistoryModal();
  }
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initApp);

// FIX-18: Register Service Worker for PWA capability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('/sw.js')
      .then(function (reg) {
        console.log('[SW] ServiceWorker registered with scope:', reg.scope);
      })
      .catch(function (err) {
        console.warn('[SW] ServiceWorker registration failed:', err);
      });
  });
}

// Expose functions globally for inline onclick handlers
window.detectLocation = detectLocation;
window.checkCity = checkCity;
window.checkByCoords = checkByCoords;
window.saveReport = saveReport;
window.loadHistory = loadHistory;
window.deleteReport = deleteReport;
window.openHistoryModal = openHistoryModal;
window.closeHistoryModal = closeHistoryModal;
window.handleCityCheck = handleCityCheck;
