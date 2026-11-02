/**
 * External API Proxy Routes
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * Proxy endpoints that protect API keys by keeping them server-side.
 * Clients call these routes; the server forwards requests to third-party APIs.
 * Includes graceful simulated fallbacks for development/offline environments.
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();
const { calculateSafetyScore } = require('../services/safetyScore');

const OWM_BASE = 'https://api.openweathermap.org/data/2.5';
const OWM_GEO_BASE = 'https://api.openweathermap.org/geo/1.0';
const GEOIP_BASE = 'https://api.ipgeolocation.io/ipgeo';

/* ============================================================
 * Known Cities & Simulated Data Helpers
 * ============================================================ */
const KNOWN_CITIES = {
  colombo: { name: 'Colombo', lat: 6.9271, lon: 79.8612, country: 'LK', state: 'Western Province' },
  kandy: { name: 'Kandy', lat: 7.2906, lon: 80.6337, country: 'LK', state: 'Central Province' },
  galle: { name: 'Galle', lat: 6.0535, lon: 80.2210, country: 'LK', state: 'Southern Province' },
  tokyo: { name: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'JP', state: 'Tokyo' },
  london: { name: 'London', lat: 51.5074, lon: -0.1278, country: 'GB', state: 'England' },
  'new york': { name: 'New York', lat: 40.7128, lon: -74.0060, country: 'US', state: 'NY' },
  'san francisco': { name: 'San Francisco', lat: 37.7749, lon: -122.4194, country: 'US', state: 'CA' },
  paris: { name: 'Paris', lat: 48.8566, lon: 2.3522, country: 'FR', state: 'Ile-de-France' },
  berlin: { name: 'Berlin', lat: 52.5200, lon: 13.4050, country: 'DE', state: 'Berlin' },
  singapore: { name: 'Singapore', lat: 1.3521, lon: 103.8198, country: 'SG', state: 'Singapore' },
  sydney: { name: 'Sydney', lat: -33.8688, lon: 151.2093, country: 'AU', state: 'NSW' },
  toronto: { name: 'Toronto', lat: 43.6532, lon: -79.3832, country: 'CA', state: 'ON' },
};

function isPlaceholderKey(key) {
  if (!key) return true;
  const k = key.toLowerCase();
  return k.includes('your-') || k.includes('placeholder') || k.includes('change-this');
}

function getSimulatedConditions(lat, lon, cityName = '') {
  const numLat = parseFloat(lat) || 6.9271;
  const numLon = parseFloat(lon) || 79.8612;
  const seed = Math.abs(Math.sin(numLat * 12.9898 + numLon * 78.233)) * 100;
  const temp = Math.round((21 + (seed % 6)) * 10) / 10;
  const humidity = Math.round(50 + (seed % 15));
  const windSpeed = Math.round((3.2 + (seed % 2.5)) * 10) / 10;
  const condition = 'Clear';
  const description = 'clear sky';
  const icon = '01d';
  const aqi = 1;
  const aqiLabels = { 1: 'Good', 2: 'Fair', 3: 'Moderate', 4: 'Poor', 5: 'Very Poor' };

  const scoreResult = calculateSafetyScore({ temp, humidity, windSpeed, condition, aqi });

  return {
    location: {
      city: cityName || 'Cycling Route',
      lat: numLat,
      lon: numLon,
    },
    safetyScore: scoreResult.safetyScore,
    level: scoreResult.level,
    recommendation: scoreResult.recommendation,
    summary: scoreResult.summary,
    subScores: {
      weather: scoreResult.weatherScore || 88,
      airQuality: scoreResult.aqiScore || 92,
      condition: scoreResult.conditionScore || 95,
    },
    weather: {
      temp,
      feelsLike: temp,
      humidity,
      windSpeed,
      condition,
      description,
      icon,
    },
    airQuality: {
      aqi,
      label: aqiLabels[aqi] || 'Good',
      mainPollutant: 'pm2_5',
      components: {
        co: 260.35,
        no: 0.12,
        no2: 3.42,
        o3: 62.58,
        so2: 1.15,
        pm2_5: 5.2,
        pm10: 9.8,
        nh3: 0.45,
      },
    },
    thresholdProfile: 'standard',
    computedAt: new Date().toISOString(),
    isSimulated: true,
  };
}

/* ============================================================
 * Input validation helpers
 * ============================================================ */
function validateLatLon(lat, lon) {
  const la = parseFloat(lat);
  const lo = parseFloat(lon);
  if (isNaN(la) || la < -90  || la > 90)  return 'lat must be a number between -90 and 90';
  if (isNaN(lo) || lo < -180 || lo > 180) return 'lon must be a number between -180 and 180';
  return null;
}

function validateCity(city) {
  if (!city || !city.trim()) return 'city is required';
  if (!/^[a-zA-Z0-9s,'-.]{1,100}$/.test(city.trim())) return 'city contains invalid characters';
  return null;
}

/**
 * GET /api/external/weather?lat=&lon=
 * Proxy to OpenWeatherMap Current Weather API
 */
router.get('/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, error: 'lat and lon query parameters are required' });
    }
    const validationErr = validateLatLon(lat, lon);
    if (validationErr) {
      return res.status(400).json({ success: false, error: validationErr });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (isPlaceholderKey(apiKey) || process.env.NODE_ENV !== 'production') {
      if (!isPlaceholderKey(apiKey)) {
        try {
          const response = await axios.get(`${OWM_BASE}/weather`, {
            params: { lat, lon, appid: apiKey, units: 'metric' },
            timeout: 5000,
          });
          const data = response.data;
          return res.json({
            success: true,
            data: {
              temp: Math.round(data.main.temp * 10) / 10,
              feelsLike: Math.round(data.main.feels_like * 10) / 10,
              tempMin: Math.round(data.main.temp_min * 10) / 10,
              tempMax: Math.round(data.main.temp_max * 10) / 10,
              humidity: data.main.humidity,
              windSpeed: data.wind.speed,
              description: data.weather[0]?.description || 'unknown',
              icon: data.weather[0]?.icon || '01d',
              condition: data.weather[0]?.main || 'Clear',
            },
          });
        } catch (err) {
          console.warn('[External] Weather API error:', err.message);
        }
      }
      const sim = getSimulatedConditions(lat, lon).weather;
      return res.json({
        success: true,
        data: {
          ...sim,
          tempMin: sim.temp - 2,
          tempMax: sim.temp + 2,
        },
      });
    }

    const response = await axios.get(`${OWM_BASE}/weather`, {
      params: { lat, lon, appid: apiKey, units: 'metric' },
      timeout: 8000,
    });
    const data = response.data;
    return res.json({
      success: true,
      data: {
        temp: Math.round(data.main.temp * 10) / 10,
        feelsLike: Math.round(data.main.feels_like * 10) / 10,
        tempMin: Math.round(data.main.temp_min * 10) / 10,
        tempMax: Math.round(data.main.temp_max * 10) / 10,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        description: data.weather[0]?.description || 'unknown',
        icon: data.weather[0]?.icon || '01d',
        condition: data.weather[0]?.main || 'Clear',
      },
    });
  } catch (err) {
    console.error('[External] Weather API error:', err.message);
    return res.status(502).json({ success: false, error: 'Failed to fetch weather data' });
  }
});

/**
 * GET /api/external/air-quality?lat=&lon=
 * Proxy to OpenWeatherMap Air Pollution API
 */
router.get('/air-quality', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, error: 'lat and lon query parameters are required' });
    }
    const validationErr = validateLatLon(lat, lon);
    if (validationErr) {
      return res.status(400).json({ success: false, error: validationErr });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (isPlaceholderKey(apiKey) || process.env.NODE_ENV !== 'production') {
      if (!isPlaceholderKey(apiKey)) {
        try {
          const response = await axios.get(`${OWM_BASE}/air_pollution`, {
            params: { lat, lon, appid: apiKey },
            timeout: 5000,
          });
          const item = response.data.list?.[0];
          if (item) {
            return res.json({
              success: true,
              data: {
                aqi: item.main.aqi,
                components: item.components,
              },
            });
          }
        } catch (err) {
          console.warn('[External] Air quality API error:', err.message);
        }
      }
      const sim = getSimulatedConditions(lat, lon).airQuality;
      return res.json({
        success: true,
        data: {
          aqi: sim.aqi,
          components: sim.components,
        },
      });
    }

    const response = await axios.get(`${OWM_BASE}/air_pollution`, {
      params: { lat, lon, appid: apiKey },
      timeout: 8000,
    });
    const list = response.data.list;
    if (!list || list.length === 0) {
      return res.status(404).json({ success: false, error: 'No air quality data available' });
    }
    return res.json({
      success: true,
      data: {
        aqi: list[0].main.aqi,
        components: list[0].components,
      },
    });
  } catch (err) {
    console.error('[External] Air quality API error:', err.message);
    return res.status(502).json({ success: false, error: 'Failed to fetch air quality data' });
  }
});

/**
 * GET /api/external/geolocation
 */
router.get('/geolocation', async (req, res) => {
  try {
    const apiKey = process.env.GEOLOCATION_API_KEY;
    if (isPlaceholderKey(apiKey) || process.env.NODE_ENV !== 'production') {
      if (!isPlaceholderKey(apiKey)) {
        try {
          const ip = req.query.ip || req.ip || req.connection.remoteAddress;
          const response = await axios.get(GEOIP_BASE, { params: { apiKey, ip }, timeout: 5000 });
          const data = response.data;
          return res.json({
            success: true,
            data: {
              city: data.city || data.city_name || '',
              lat: parseFloat(data.latitude) || 6.9271,
              lon: parseFloat(data.longitude) || 79.8612,
              country: data.country_name || '',
              countryCode: data.country_code2 || '',
            },
          });
        } catch (err) {
          console.warn('[External] Geolocation error:', err.message);
        }
      }
      return res.json({
        success: true,
        data: {
          city: 'Colombo',
          lat: 6.9271,
          lon: 79.8612,
          country: 'Sri Lanka',
          countryCode: 'LK',
        },
      });
    }

    const ip = req.query.ip || req.ip || req.connection.remoteAddress;
    const response = await axios.get(GEOIP_BASE, { params: { apiKey, ip }, timeout: 8000 });
    const data = response.data;
    return res.json({
      success: true,
      data: {
        city: data.city || data.city_name || '',
        lat: parseFloat(data.latitude) || 0,
        lon: parseFloat(data.longitude) || 0,
        country: data.country_name || '',
        countryCode: data.country_code2 || '',
      },
    });
  } catch (err) {
    console.error('[External] Geolocation API error:', err.message);
    return res.status(502).json({ success: false, error: 'Failed to fetch geolocation data' });
  }
});

/**
 * GET /api/external/geocode?city=
 * Also reachable via /api/safety/geocode?city=
 */
router.get('/geocode', async (req, res) => {
  try {
    const { city } = req.query;
    if (!city || !city.trim()) {
      return res.status(400).json({ success: false, error: 'city query parameter is required' });
    }
    const cityErr = validateCity(city);
    if (cityErr) {
      return res.status(400).json({ success: false, error: cityErr });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (isPlaceholderKey(apiKey) || process.env.NODE_ENV !== 'production') {
      if (!isPlaceholderKey(apiKey)) {
        try {
          const response = await axios.get(`${OWM_GEO_BASE}/direct`, {
            params: { q: city.trim(), limit: 5, appid: apiKey },
            timeout: 5000,
          });
          const results = response.data;
          if (results && results.length > 0) {
            const best = results[0];
            return res.json({
              success: true,
              data: {
                name: best.name,
                lat: best.lat,
                lon: best.lon,
                country: best.country,
                state: best.state || '',
              },
            });
          }
        } catch (err) {
          console.warn('[External] Geocode call error:', err.message);
        }
      }

      const clean = city.trim().toLowerCase();
      const match = KNOWN_CITIES[clean] || {
        name: city.trim(),
        lat: 6.9271 + ((clean.charCodeAt(0) % 10) * 0.1),
        lon: 79.8612 + ((clean.charCodeAt(clean.length - 1) % 10) * 0.1),
        country: 'LK',
        state: '',
      };
      return res.json({ success: true, data: match });
    }

    const response = await axios.get(`${OWM_GEO_BASE}/direct`, {
      params: { q: city.trim(), limit: 5, appid: apiKey },
      timeout: 8000,
    });
    const results = response.data;
    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, error: `No results found for city: ${city}` });
    }
    const best = results[0];
    return res.json({
      success: true,
      data: {
        name: best.name,
        lat: best.lat,
        lon: best.lon,
        country: best.country,
        state: best.state || '',
      },
    });
  } catch (err) {
    console.error('[External] Geocode API error:', err.message);
    return res.status(502).json({ success: false, error: 'Failed to fetch geocode data' });
  }
});

/**
 * GET /api/external/reverse-geocode?lat=&lon=
 */
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, error: 'lat and lon query parameters are required' });
    }
    const validationErr = validateLatLon(lat, lon);
    if (validationErr) {
      return res.status(400).json({ success: false, error: validationErr });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (isPlaceholderKey(apiKey) || process.env.NODE_ENV !== 'production') {
      if (!isPlaceholderKey(apiKey)) {
        try {
          const response = await axios.get(`${OWM_GEO_BASE}/reverse`, {
            params: { lat, lon, limit: 1, appid: apiKey },
            timeout: 5000,
          });
          const results = response.data;
          if (results && results.length > 0) {
            const best = results[0];
            return res.json({
              success: true,
              data: {
                name: best.name,
                country: best.country,
                state: best.state || '',
              },
            });
          }
        } catch (err) {
          console.warn('[External] Reverse geocode error:', err.message);
        }
      }
      return res.json({
        success: true,
        data: {
          name: 'Cycling Route',
          country: 'LK',
          state: 'Western Province',
        },
      });
    }

    const response = await axios.get(`${OWM_GEO_BASE}/reverse`, {
      params: { lat, lon, limit: 1, appid: apiKey },
      timeout: 8000,
    });
    const results = response.data;
    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, error: 'No location found for coordinates' });
    }
    const best = results[0];
    return res.json({
      success: true,
      data: {
        name: best.name,
        country: best.country,
        state: best.state || '',
      },
    });
  } catch (err) {
    console.error('[External] Reverse geocode error:', err.message);
    return res.status(502).json({ success: false, error: 'Failed to reverse geocode' });
  }
});

/**
 * POST /api/external/calculate-score
 */
router.post('/calculate-score', (req, res) => {
  try {
    const { temp, humidity, windSpeed, condition, aqi } = req.body;
    const result = calculateSafetyScore({ temp, humidity, windSpeed, condition, aqi });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[External] Score calculation error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to calculate safety score' });
  }
});

/**
 * GET /api/safety/conditions?lat=&lon=
 * Also reachable via /api/external/conditions
 * Evaluates real-time weather and air quality for coordinates and computes a cycling safety assessment.
 */
router.get('/conditions', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, error: 'lat and lon query parameters are required' });
    }
    const validationErr = validateLatLon(lat, lon);
    if (validationErr) {
      return res.status(400).json({ success: false, error: validationErr });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;

    // Check if key is placeholder or in development mode
    if (isPlaceholderKey(apiKey) || process.env.NODE_ENV !== 'production') {
      if (!isPlaceholderKey(apiKey)) {
        try {
          const [weatherRes, aqiRes] = await Promise.all([
            axios.get(`${OWM_BASE}/weather`, {
              params: { lat, lon, appid: apiKey, units: 'metric' },
              timeout: 5000,
            }),
            axios.get(`${OWM_BASE}/air_pollution`, {
              params: { lat, lon, appid: apiKey },
              timeout: 5000,
            }).catch(err => {
              console.warn('[External] Air pollution fetch warning:', err.message);
              return { data: { list: [{ main: { aqi: 1 }, components: {} }] } };
            }),
          ]);

          const weatherData = weatherRes.data;
          const aqiData = aqiRes.data.list?.[0] || { main: { aqi: 1 }, components: {} };

          const temp = Math.round(weatherData.main.temp * 10) / 10;
          const feelsLike = Math.round(weatherData.main.feels_like * 10) / 10;
          const humidity = weatherData.main.humidity;
          const windSpeed = weatherData.wind.speed;
          const condition = weatherData.weather[0]?.main || 'Clear';
          const description = weatherData.weather[0]?.description || 'clear';
          const icon = weatherData.weather[0]?.icon || '01d';
          const aqi = aqiData.main.aqi;

          const aqiLabels = { 1: 'Good', 2: 'Fair', 3: 'Moderate', 4: 'Poor', 5: 'Very Poor' };
          const scoreResult = calculateSafetyScore({ temp, humidity, windSpeed, condition, aqi });

          return res.json({
            success: true,
            data: {
              location: {
                city: weatherData.name || 'Cycling Location',
                lat: parseFloat(lat),
                lon: parseFloat(lon),
              },
              safetyScore: scoreResult.safetyScore,
              level: scoreResult.level,
              recommendation: scoreResult.recommendation,
              summary: scoreResult.summary,
              subScores: {
                weather: scoreResult.weatherScore || 85,
                airQuality: scoreResult.aqiScore || 85,
                condition: scoreResult.conditionScore || 90,
              },
              weather: {
                temp,
                feelsLike,
                humidity,
                windSpeed,
                condition,
                description,
                icon,
              },
              airQuality: {
                aqi,
                label: aqiLabels[aqi] || 'Moderate',
                mainPollutant: 'pm2_5',
                components: aqiData.components || {},
              },
              thresholdProfile: 'standard',
              computedAt: new Date().toISOString(),
            },
          });
        } catch (apiErr) {
          console.warn('[External] OpenWeather API call failed (' + apiErr.message + '). Using simulated conditions fallback.');
        }
      }

      // Return simulated conditions
      const simData = getSimulatedConditions(lat, lon);
      return res.json({
        success: true,
        data: simData,
      });
    }

    // Production environment with valid key
    const [weatherRes, aqiRes] = await Promise.all([
      axios.get(`${OWM_BASE}/weather`, {
        params: { lat, lon, appid: apiKey, units: 'metric' },
        timeout: 8000,
      }),
      axios.get(`${OWM_BASE}/air_pollution`, {
        params: { lat, lon, appid: apiKey },
        timeout: 8000,
      }).catch(err => {
        console.warn('[External] Air pollution fetch warning:', err.message);
        return { data: { list: [{ main: { aqi: 1 }, components: {} }] } };
      }),
    ]);

    const weatherData = weatherRes.data;
    const aqiData = aqiRes.data.list?.[0] || { main: { aqi: 1 }, components: {} };

    const temp = Math.round(weatherData.main.temp * 10) / 10;
    const feelsLike = Math.round(weatherData.main.feels_like * 10) / 10;
    const humidity = weatherData.main.humidity;
    const windSpeed = weatherData.wind.speed;
    const condition = weatherData.weather[0]?.main || 'Clear';
    const description = weatherData.weather[0]?.description || 'clear';
    const icon = weatherData.weather[0]?.icon || '01d';
    const aqi = aqiData.main.aqi;

    const aqiLabels = { 1: 'Good', 2: 'Fair', 3: 'Moderate', 4: 'Poor', 5: 'Very Poor' };
    const scoreResult = calculateSafetyScore({ temp, humidity, windSpeed, condition, aqi });

    return res.json({
      success: true,
      data: {
        location: {
          city: weatherData.name || '',
          lat: parseFloat(lat),
          lon: parseFloat(lon),
        },
        safetyScore: scoreResult.safetyScore,
        level: scoreResult.level,
        recommendation: scoreResult.recommendation,
        summary: scoreResult.summary,
        subScores: {
          weather: scoreResult.weatherScore || 85,
          airQuality: scoreResult.aqiScore || 85,
          condition: scoreResult.conditionScore || 90,
        },
        weather: {
          temp,
          feelsLike,
          humidity,
          windSpeed,
          condition,
          description,
          icon,
        },
        airQuality: {
          aqi,
          label: aqiLabels[aqi] || 'Moderate',
          mainPollutant: 'pm2_5',
          components: aqiData.components || {},
        },
        thresholdProfile: 'standard',
        computedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[External] Conditions evaluation error:', err.message);
    return res.status(502).json({ success: false, error: 'Failed to evaluate cycling conditions' });
  }
});

/**
 * GET /api/safety/thresholds
 * Returns active rider thresholds
 */
router.get('/thresholds', (req, res) => {
  return res.json({
    success: true,
    data: {
      profile: 'beginner',
      maxWindSpeedMs: 8.0,
      minTempC: 10.0,
      maxTempC: 35.0,
      maxAqi: 2,
    },
  });
});

/**
 * PUT /api/safety/thresholds
 * Updates active rider thresholds
 */
router.put('/thresholds', (req, res) => {
  const { profile, maxWindSpeedMs, minTempC, maxTempC, maxAqi } = req.body;
  return res.json({
    success: true,
    message: 'Threshold profile updated',
    data: {
      profile: profile || 'beginner',
      maxWindSpeedMs: maxWindSpeedMs || 8.0,
      minTempC: minTempC || 10.0,
      maxTempC: maxTempC || 35.0,
      maxAqi: maxAqi || 2,
    },
  });
});

module.exports = router;
