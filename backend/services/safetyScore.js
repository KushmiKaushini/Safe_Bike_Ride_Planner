/**
 * Safety Score Calculation Service
 * K K K Ekanayake — Safe Bike Ride Planner Backend
 *
 * Expert algorithm that evaluates cycling safety based on weather and air quality.
 *
 * Scoring Algorithm (Weighted):
 * - Weather Score (40%):  Optimal temp 15-25°C, wind < 8 m/s, no precipitation,
 *                          humidity 40-70%
 * - Air Quality Score (40%): AQI 0-50=100, 51-100=75, 101-150=50,
 *                             151-200=25, 200+=0
 * - Condition Score (20%): Clear=100, Clouds=70, Rain=40, Drizzle=30,
 *                           Thunderstorm=10, Snow=20, Atmosphere=50, Mist=60
 *
 * Levels:
 * - Safe (70-100):   🟢 Great conditions for cycling
 * - Caution (40-69): 🟡 Exercise caution — check conditions before riding
 * - Unsafe (0-39):   🔴 Consider postponing — conditions are poor
 *
 * Returns: { safetyScore, level, recommendation, summary }
 */

/**
 * Calculate the weather sub-score (0-100).
 * Optimal: temp 15-25°C, wind < 8 m/s, humidity 40-70%, no rain/snow/thunderstorm
 */
function calculateWeatherScore(temp, humidity, windSpeed, condition) {
  let score = 100;

  // Temperature scoring (ideal range 15-25°C)
  if (temp < 0) {
    score -= 40;
  } else if (temp < 5) {
    score -= 30;
  } else if (temp < 10) {
    score -= 20;
  } else if (temp < 15) {
    score -= 10;
  } else if (temp <= 25) {
    // Optimal range — no deduction
  } else if (temp <= 30) {
    score -= 10;
  } else if (temp <= 35) {
    score -= 25;
  } else if (temp <= 40) {
    score -= 35;
  } else {
    score -= 50;
  }

  // Humidity scoring (ideal range 40-70%)
  if (humidity < 20) {
    score -= 20;
  } else if (humidity < 40) {
    score -= 10;
  } else if (humidity <= 70) {
    // Optimal range — no deduction
  } else if (humidity <= 85) {
    score -= 15;
  } else {
    score -= 30;
  }

  // Wind speed scoring (ideal < 8 m/s)
  if (windSpeed > 15) {
    score -= 40;
  } else if (windSpeed > 10) {
    score -= 25;
  } else if (windSpeed > 8) {
    score -= 10;
  }

  // Weather condition scoring
  const conditionLower = (condition || '').toLowerCase();
  if (conditionLower.includes('thunderstorm')) {
    score -= 60;
  } else if (conditionLower.includes('snow') || conditionLower.includes('sleet')) {
    score -= 50;
  } else if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
    score -= 30;
  } else if (conditionLower.includes('mist') || conditionLower.includes('fog') || conditionLower.includes('haze')) {
    score -= 15;
  } else if (conditionLower.includes('dust') || conditionLower.includes('sand') || conditionLower.includes('smoke')) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate the air quality sub-score (0-100).
 * Based on EPA AQI breakpoints.
 */
function calculateAirQualityScore(aqi) {
  if (aqi <= 50) return 100;       // Good
  if (aqi <= 100) return 75;       // Moderate
  if (aqi <= 150) return 50;       // Unhealthy for Sensitive Groups
  if (aqi <= 200) return 25;       // Unhealthy
  return 0;                         // Very Unhealthy / Hazardous
}

/**
 * Calculate the condition sub-score (0-100).
 * Maps weather condition text to a score.
 */
function calculateConditionScore(condition) {
  const conditionLower = (condition || '').toLowerCase();

  if (conditionLower === 'clear') return 100;
  if (conditionLower.includes('clouds') || conditionLower === 'clouds') return 70;
  if (conditionLower.includes('rain')) return 40;
  if (conditionLower.includes('drizzle')) return 30;
  if (conditionLower.includes('thunderstorm')) return 10;
  if (conditionLower.includes('snow') || conditionLower.includes('sleet')) return 20;
  if (conditionLower.includes('atmosphere') || conditionLower === 'atmosphere') return 50;
  if (conditionLower.includes('mist') || conditionLower.includes('fog') || conditionLower.includes('haze')) return 60;
  if (conditionLower.includes('dust') || conditionLower.includes('sand') || conditionLower.includes('smoke')) return 40;
  if (conditionLower.includes('tornado')) return 0;
  if (conditionLower.includes('squall')) return 15;

  // Default for unknown conditions
  return 50;
}

/**
 * Calculate overall safety score and recommendation.
 *
 * @param {Object} params
 * @param {number} params.temp - Temperature in Celsius
 * @param {number} params.humidity - Humidity percentage
 * @param {number} params.windSpeed - Wind speed in m/s
 * @param {string} params.condition - Weather condition (e.g., 'Clear', 'Rain')
 * @param {number} params.aqi - Air Quality Index
 * @returns {{ safetyScore: number, level: string, recommendation: string, summary: string }}
 */
function calculateSafetyScore({ temp, humidity, windSpeed, condition, aqi }) {
  // Default values to prevent NaN scores
  const t = typeof temp === 'number' ? temp : 20;
  const h = typeof humidity === 'number' ? humidity : 50;
  const w = typeof windSpeed === 'number' ? windSpeed : 5;
  const c = condition || 'Clear';
  const a = typeof aqi === 'number' ? aqi : 30;

  const weatherScore = calculateWeatherScore(t, h, w, c);
  const airScore = calculateAirQualityScore(a);
  const conditionScore = calculateConditionScore(c);

  // Weighted composite score
  const safetyScore = Math.round(
    weatherScore * 0.4 + airScore * 0.4 + conditionScore * 0.2
  );

  // Clamp to 0-100
  const clampedScore = Math.max(0, Math.min(100, safetyScore));

  // Determine level and recommendation
  let level, recommendation;

  if (clampedScore >= 70) {
    level = 'Safe';
    recommendation = 'safe';
  } else if (clampedScore >= 40) {
    level = 'Caution';
    recommendation = 'caution';
  } else {
    level = 'Unsafe';
    recommendation = 'unsafe';
  }

  // Generate a human-readable summary
  const scoreEmoji = clampedScore >= 70 ? '🟢' : clampedScore >= 40 ? '🟡' : '🔴';
  const summary = `${scoreEmoji} Score ${clampedScore}/100 — ${level}. Weather: ${weatherScore}/100, Air: ${airScore}/100, Conditions: ${conditionScore}/100.`;

  return { safetyScore: clampedScore, level, recommendation, summary };
}

module.exports = { calculateSafetyScore, calculateWeatherScore, calculateAirQualityScore, calculateConditionScore };