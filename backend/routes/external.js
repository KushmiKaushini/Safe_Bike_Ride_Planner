/**
 * External API Proxy Routes
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * Proxy endpoints that protect API keys by keeping them server-side.
 * Clients call these routes; the server forwards requests to third-party APIs.
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();
const { calculateSafetyScore } = require('../services/safetyScore');

const OWM_BASE = 'https://api.openweathermap.org/data/2.5';
const OWM_GEO_BASE = 'https://api.openweathermap.org/geo/1.0';
const GEOIP_BASE = 'https://api.ipgeolocation.io/ipgeo';

/* ============================================================
 * FIX-10: Input validation helpers
 * Prevent numeric injection / garbage lat-lon values from hitting
 * third-party APIs and wasting quota / producing nonsense results.
 * ============================================================ */

/**
 * Validate latitude and longitude query params.
 * @returns {string|null} Error message, or null if valid.
 */
function validateLatLon(lat, lon) {
  const la = parseFloat(lat);
  const lo = parseFloat(lon);
  if (isNaN(la) || la < -90  || la > 90)  return 'lat must be a number between -90 and 90';
  if (isNaN(lo) || lo < -180 || lo > 180) return 'lon must be a number between -180 and 180';
  return null;
}

/**
 * Validate a city name param.
 * @returns {string|null} Error message, or null if valid.
 */
function validateCity(city) {
  if (!city || !city.trim()) return 'city is required';
  if (!/^[a-zA-Z0-9\s,'\-\.]{1,100}$/.test(city.trim())) return 'city contains invalid characters';
  return null;
}

/**
 * GET /api/external/weather?lat=&lon=
 * Proxy to OpenWeatherMap Current Weather API
 * Returns: temp, feelsLike, humidity, windSpeed, description, icon, condition
 */
router.get('/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'lat and lon query parameters are required',
      });
    }

    // FIX-10: Validate numeric bounds before passing to third-party API
    const validationErr = validateLatLon(lat, lon);
    if (validationErr) {
      return res.status(400).json({ success: false, error: validationErr });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenWeatherMap API key not configured',
      });
    }

    const response = await axios.get(`${OWM_BASE}/weather`, {
      params: {
        lat,
        lon,
        appid: apiKey,
        units: 'metric',
      },
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
    return res.status(502).json({
      success: false,
      error: 'Failed to fetch weather data',
    });
  }
});

/**
 * GET /api/external/air-quality?lat=&lon=
 * Proxy to OpenWeatherMap Air Pollution API
 * Returns: aqi, components (pm2_5, pm10, o3, no2, so2, co)
 */
router.get('/air-quality', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'lat and lon query parameters are required',
      });
    }

    // FIX-10: Validate numeric bounds before passing to third-party API
    const validationErr = validateLatLon(lat, lon);
    if (validationErr) {
      return res.status(400).json({ success: false, error: validationErr });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenWeatherMap API key not configured',
      });
    }

    const response = await axios.get(`${OWM_BASE}/air_pollution`, {
      params: {
        lat,
        lon,
        appid: apiKey,
      },
      timeout: 8000,
    });

    const list = response.data.list;
    if (!list || list.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No air quality data available',
      });
    }

    const item = list[0];
    const components = item.components || {};
    
    // Determine main pollutant
    let mainPollutant = 'PM2.5';
    if (components.pm2_5 != null) mainPollutant = 'PM2.5';
    else if (components.pm10 != null) mainPollutant = 'PM10';
    else if (components.o3 != null) mainPollutant = 'O3';
    else if (components.no2 != null) mainPollutant = 'NO2';
    else if (components.so2 != null) mainPollutant = 'SO2';
    else if (components.co != null) mainPollutant = 'CO';

    return res.json({
      success: true,
      data: {
        aqi: item.main.aqi,
        mainPollutant,
        components: {
          pm2_5: components.pm2_5 || 0,
          pm10: components.pm10 || 0,
          o3: components.o3 || 0,
          no2: components.no2 || 0,
          so2: components.so2 || 0,
          co: components.co || 0,
        },
      },
    });
  } catch (err) {
    console.error('[External] Air Quality API error:', err.message);
    return res.status(502).json({
      success: false,
      error: 'Failed to fetch air quality data',
    });
  }
});

/**
 * GET /api/external/geolocation
 * Proxy to ipgeolocation.io API to get city, lat, lon from request IP
 * Supports ?ip= override for testing
 */
router.get('/geolocation', async (req, res) => {
  try {
    const apiKey = process.env.GEOLOCATION_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Geolocation API key not configured',
      });
    }

    // Use provided IP or fall back to request IP
    const ip = req.query.ip || req.ip || req.connection.remoteAddress;

    const response = await axios.get(GEOIP_BASE, {
      params: {
        apiKey,
        ip,
      },
      timeout: 8000,
    });

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
    return res.status(502).json({
      success: false,
      error: 'Failed to fetch geolocation data',
    });
  }
});

/**
 * GET /api/external/geocode?city=
 * Proxy to OpenWeatherMap Geocoding API to get lat/lon from city name
 */
router.get('/geocode', async (req, res) => {
  try {
    const { city } = req.query;

    if (!city || !city.trim()) {
      return res.status(400).json({
        success: false,
        error: 'city query parameter is required',
      });
    }

    // FIX-10: Validate city name format
    const cityErr = validateCity(city);
    if (cityErr) {
      return res.status(400).json({ success: false, error: cityErr });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenWeatherMap API key not configured',
      });
    }

    const response = await axios.get(`${OWM_GEO_BASE}/direct`, {
      params: {
        q: city.trim(),
        limit: 5,
        appid: apiKey,
      },
      timeout: 8000,
    });

    const results = response.data;

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No results found for city: ${city}`,
      });
    }

    // Return the best match (first result)
    const best = results[0];

    return res.json({
      success: true,
      data: {
        name: best.name,
        lat: best.lat,
        lon: best.lon,
        country: best.country,
        state: best.state || '',
        localNames: best.local_names || {},
      },
    });
  } catch (err) {
    console.error('[External] Geocode API error:', err.message);
    return res.status(502).json({
      success: false,
      error: 'Failed to fetch geocode data',
    });
  }
});

/**
 * GET /api/external/geocode/ip
 * Proxy to IP Geolocation API for IP-based location fallback
 */
router.get('/geocode/ip', async (req, res) => {
  try {
    const apiKey = process.env.GEOLOCATION_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Geolocation API key not configured',
      });
    }

    const ip = req.query.ip || req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress;

    const response = await axios.get(GEOIP_BASE, {
      params: {
        apiKey,
        ip: ip || '',
      },
      timeout: 8000,
    });

    const data = response.data;

    return res.json({
      success: true,
      data: {
        lat: parseFloat(data.latitude) || 0,
        lon: parseFloat(data.longitude) || 0,
        displayName: data.city || data.city_name || '',
      },
    });
  } catch (err) {
    console.error('[External] IP Geolocation error:', err.message);
    return res.status(502).json({
      success: false,
      error: 'Failed to fetch IP geolocation data',
    });
  }
});

/**
 * GET /api/external/geocode/reverse?lat=&lon=
 * Reverse geocode to get city name from coordinates (using OpenWeatherMap)
 */
router.get('/geocode/reverse', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'lat and lon query parameters are required',
      });
    }

    // FIX-10: Validate numeric bounds before passing to third-party API
    const validationErr = validateLatLon(lat, lon);
    if (validationErr) {
      return res.status(400).json({ success: false, error: validationErr });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenWeatherMap API key not configured',
      });
    }

    const response = await axios.get(`${OWM_GEO_BASE}/reverse`, {
      params: {
        lat,
        lon,
        limit: 1,
        appid: apiKey,
      },
      timeout: 8000,
    });

    const results = response.data;

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No location found for coordinates',
      });
    }

    const best = results[0];

    return res.json({
      success: true,
      city: best.name || '',
      lat: best.lat,
      lon: best.lon,
    });
  } catch (err) {
    console.error('[External] Reverse geocode error:', err.message);
    return res.status(502).json({
      success: false,
      error: 'Failed to fetch reverse geocode data',
    });
  }
});

/**
 * FIX-07: POST /api/external/score
 * Compute safety score server-side from raw weather + AQI inputs.
 * This allows the client to display the SAME score that will be saved to the DB,
 * eliminating the display-vs-saved discrepancy (up to 30 pts) from the old
 * duplicate client-side scoring logic.
 *
 * Body: { temp, humidity, windSpeed, condition, aqi }
 * Returns: { success: true, data: { safetyScore, level, recommendation, summary } }
 */
router.post('/score', (req, res) => {
  try {
    const { temp, humidity, windSpeed, condition, aqi } = req.body;
    const result = calculateSafetyScore({ temp, humidity, windSpeed, condition, aqi });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[External] Score calculation error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to calculate safety score' });
  }
});

module.exports = router;