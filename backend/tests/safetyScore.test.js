/**
 * Unit Tests for Safety Score Calculation Service
 * Tests FIX-03 (OWM AQI 1-5 scale), FIX-05 (wind thresholds), FIX-06 (thunderstorm condition)
 */

const {
  calculateSafetyScore,
  calculateWeatherScore,
  calculateAirQualityScore,
  calculateConditionScore,
} = require('../services/safetyScore');

describe('Air Quality Score (OWM 1-5 Scale)', () => {
  test('AQI 1 (Good) returns 100', () => {
    expect(calculateAirQualityScore(1)).toBe(100);
  });

  test('AQI 2 (Fair) returns 75', () => {
    expect(calculateAirQualityScore(2)).toBe(75);
  });

  test('AQI 3 (Moderate) returns 50', () => {
    expect(calculateAirQualityScore(3)).toBe(50);
  });

  test('AQI 4 (Poor) returns 25', () => {
    expect(calculateAirQualityScore(4)).toBe(25);
  });

  test('AQI 5 (Very Poor) returns 0', () => {
    expect(calculateAirQualityScore(5)).toBe(0);
  });

  test('Unknown AQI returns default 50', () => {
    expect(calculateAirQualityScore(99)).toBe(50);
  });
});

describe('Condition Score', () => {
  test('Clear returns 100', () => {
    expect(calculateConditionScore('Clear')).toBe(100);
  });

  test('Thunderstorm returns 10 (not rain score 40)', () => {
    expect(calculateConditionScore('Thunderstorm')).toBe(10);
    expect(calculateConditionScore('thunderstorm with rain')).toBe(10);
  });

  test('Rain returns 40', () => {
    expect(calculateConditionScore('Rain')).toBe(40);
    expect(calculateConditionScore('light rain')).toBe(40);
  });

  test('Snow returns 20', () => {
    expect(calculateConditionScore('Snow')).toBe(20);
  });
});

describe('Weather Score & Wind Thresholds', () => {
  test('Optimal conditions (20°C, 50% hum, 4 m/s wind, Clear) returns 100', () => {
    expect(calculateWeatherScore(20, 50, 4, 'Clear')).toBe(100);
  });

  test('Wind > 8 m/s begins deduction', () => {
    expect(calculateWeatherScore(20, 50, 9, 'Clear')).toBe(90);
  });

  test('Wind > 15 m/s causes heavy deduction (-40)', () => {
    expect(calculateWeatherScore(20, 50, 16, 'Clear')).toBe(60);
  });
});

describe('Composite Safety Score', () => {
  test('Ideal conditions return Safe 100', () => {
    const result = calculateSafetyScore({
      temp: 20,
      humidity: 55,
      windSpeed: 4,
      condition: 'Clear',
      aqi: 1,
    });
    expect(result.safetyScore).toBe(100);
    expect(result.level).toBe('Safe');
    expect(result.recommendation).toBe('safe');
  });

  test('Severe thunderstorm + poor AQI returns Unsafe', () => {
    const result = calculateSafetyScore({
      temp: 28,
      humidity: 95,
      windSpeed: 20,
      condition: 'Thunderstorm',
      aqi: 4,
    });
    expect(result.safetyScore).toBeLessThan(40);
    expect(result.level).toBe('Unsafe');
    expect(result.recommendation).toBe('unsafe');
  });

  test('Handles missing/undefined inputs gracefully', () => {
    const result = calculateSafetyScore({});
    expect(typeof result.safetyScore).toBe('number');
    expect(result.safetyScore).toBeGreaterThanOrEqual(0);
    expect(result.safetyScore).toBeLessThanOrEqual(100);
    expect(['Safe', 'Caution', 'Unsafe']).toContain(result.level);
  });
});
