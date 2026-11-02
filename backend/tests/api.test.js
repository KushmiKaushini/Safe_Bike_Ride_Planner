/**
 * Integration Tests for API Endpoints
 * Tests POST /api/external/score and GET /health
 */

const request = require('supertest');
const express = require('express');

// Create test instance with external routes and health check
const externalRoutes = require('../routes/external');

const app = express();
app.use(express.json());
app.use('/api/external', externalRoutes);
app.get('/health', (req, res) => {
  return res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'test',
    uptime: process.uptime(),
  });
});

describe('API Integration Tests', () => {
  test('GET /health returns 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  test('POST /api/external/score calculates safety score accurately', async () => {
    const res = await request(app)
      .post('/api/external/score')
      .send({
        temp: 22,
        humidity: 50,
        windSpeed: 4,
        condition: 'Clear',
        aqi: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.safetyScore).toBe(100);
    expect(res.body.data.level).toBe('Safe');
    expect(res.body.data.recommendation).toBe('safe');
  });

  test('POST /api/external/score handles missing payload with defaults', async () => {
    const res = await request(app)
      .post('/api/external/score')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.safetyScore).toBe('number');
  });
});
