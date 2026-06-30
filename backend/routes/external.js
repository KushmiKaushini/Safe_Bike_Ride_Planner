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

const OWM_BASE = 'https://api.openweathermap.org/data/2.5';
const OWM_GEO_BASE = 'https://api.openweathermap.org/geo/1.0';
const GEOIP_BASE = 'https://api.ipgeolocation.io/ipgeo';

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

    return res.json({
      success: true,
      data: {
        aqi: item.main.aqi,
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

module.exports = router;