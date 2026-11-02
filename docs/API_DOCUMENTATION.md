# Safe Bike Ride Planner — API Gateway REST API Documentation 🚴‍♂️📜

> **Base URL (Local Mobile Dev)**:  
> - Android Emulator: `http://10.0.2.2:8080`  
> - iOS Simulator: `http://localhost:8080`  
> - Production: `https://api.safebike.example.com`  
> **Protocol**: HTTPS / JSON  
> **Authentication**: `Authorization: Bearer <accessToken>` (Signed JWT)  
> **Rate Limiting**: 100 requests per 15-minute window per authenticated user or IP

---

## 1. Mobile Authentication & Token Services

All authentication flows use RFC 8252 / RFC 7636 OAuth 2.0 PKCE via the native mobile app.

### `POST /api/auth/mobile/token`
Exchanges the Google OAuth 2.0 `id_token` received after in-app PKCE flow for API Gateway JWT tokens.

- **Access Level**: Public
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "platform": "android"
}
```

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "rt_98a7f43b2c1e0d9a...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "665f8a9e1d2c3b4a5e6f7a8b",
      "displayName": "Kushmi Ekanayake",
      "email": "kushmi@example.com",
      "photo": "https://lh3.googleusercontent.com/a/..."
    }
  }
}
```

- **Error Codes**:
  - `400 Bad Request`: Missing or malformed `idToken`.
  - `401 Unauthorized`: Google token signature, audience, or expiry invalid.
  - `429 Too Many Requests`: Auth brute-force rate limit exceeded (10 requests / 15 minutes).

---

### `POST /api/auth/refresh`
Silently rotates an expiring access token using the securely stored refresh token.

- **Access Level**: Public
- **Request Body**:
```json
{
  "refreshToken": "rt_98a7f43b2c1e0d9a..."
}
```

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "rt_5f6e7d8c9b0a1a2b...",
    "expiresIn": 900
  }
}
```

---

### `POST /api/auth/logout`
Revokes the refresh token chain on the Gateway and terminates the mobile session.

- **Access Level**: 🔐 Protected (`Authorization: Bearer <accessToken>`)
- **Request Body**:
```json
{
  "refreshToken": "rt_5f6e7d8c9b0a1a2b..."
}
```

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Logged out successfully. Token revoked."
}
```

---

### `GET /api/auth/me`
Retrieves the profile details of the authenticated cyclist.

- **Access Level**: 🔐 Protected (`Authorization: Bearer <accessToken>`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "id": "665f8a9e1d2c3b4a5e6f7a8b",
    "displayName": "Kushmi Ekanayake",
    "email": "kushmi@example.com",
    "photo": "https://lh3.googleusercontent.com/a/...",
    "createdAt": "2026-11-02T08:00:00.000Z"
  }
}
```

---

## 2. Ride Safety Service Endpoints (`/api/safety/**`)

Routed via API Gateway to `ride-safety-service` (Port `8082`). Requires `Authorization: Bearer <accessToken>`.

### `GET /api/safety/conditions`
Evaluates real-time weather and air quality for coordinates and computes a cycling safety assessment.

- **Query Parameters**:
  - `lat` (number, required): Latitude (e.g., `6.9271`)
  - `lon` (number, required): Longitude (e.g., `79.8612`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "location": {
      "city": "Colombo",
      "lat": 6.9271,
      "lon": 79.8612
    },
    "safetyScore": 88,
    "level": "Safe",
    "recommendation": "safe",
    "summary": "🟢 Score 88/100 — Optimal conditions for cycling.",
    "subScores": {
      "weather": 90,
      "airQuality": 85,
      "condition": 90
    },
    "weather": {
      "temp": 28.4,
      "feelsLike": 31.2,
      "humidity": 68,
      "windSpeed": 3.8,
      "condition": "Clear",
      "description": "clear sky",
      "icon": "01d"
    },
    "airQuality": {
      "aqi": 1,
      "label": "Good",
      "mainPollutant": "pm2_5",
      "components": {
        "pm2_5": 8.4,
        "pm10": 15.2,
        "no2": 12.1,
        "o3": 25.4
      }
    },
    "thresholdProfile": "beginner",
    "computedAt": "2026-11-02T11:20:00Z"
  }
}
```

---

### `GET /api/safety/geocode`
Geocodes a search string into city coordinates.

- **Query Parameters**:
  - `city` (string, required): e.g., `Kandy`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "name": "Kandy",
    "lat": 7.2906,
    "lon": 80.6337,
    "country": "LK"
  }
}
```

---

### `GET /api/safety/geocode/reverse`
Reverse-geocodes GPS coordinates into a display city name.

- **Query Parameters**:
  - `lat` (number, required)
  - `lon` (number, required)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "name": "Colombo",
    "lat": 6.9271,
    "lon": 79.8612,
    "country": "LK"
  }
}
```

---

### `GET /api/safety/thresholds` & `PUT /api/safety/thresholds`
Retrieves or updates the cyclist's personal threshold preferences.

- **PUT Request Body**:
```json
{
  "profile": "experienced",
  "maxWindSpeedMs": 12.0,
  "minTempC": 10.0,
  "maxTempC": 35.0,
  "maxAqi": 3
}
```

---

## 3. Ride History Service Endpoints (`/api/rides/**`)

Routed via API Gateway to `ride-history-service` (Port `8083`). Requires `Authorization: Bearer <accessToken>`.

### `POST /api/rides`
Persists a verified safety check to the cyclist's history. The Gateway automatically injects `X-User-Id` derived from the verified JWT.

- **Request Body**:
```json
{
  "city": "Colombo",
  "lat": 6.9271,
  "lon": 79.8612,
  "safetyScore": 88,
  "weather": {
    "temp": 28.4,
    "windSpeed": 3.8,
    "humidity": 68,
    "condition": "Clear"
  },
  "airQuality": {
    "aqi": 1,
    "label": "Good"
  },
  "recommendation": "safe",
  "summary": "🟢 Score 88/100 — Optimal conditions for cycling."
}
```

- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "id": "6725e1a2f3a4b5c6d7e8f901",
    "createdAt": "2026-11-02T11:22:30.000Z"
  }
}
```

---

### `GET /api/rides`
Retrieves paginated ride checks for the authenticated cyclist.

- **Query Parameters**:
  - `limit` (number, optional, default: `20`)
  - `skip` (number, optional, default: `0`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "6725e1a2f3a4b5c6d7e8f901",
      "city": "Colombo",
      "safetyScore": 88,
      "recommendation": "safe",
      "createdAt": "2026-11-02T11:22:30.000Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "skip": 0,
    "hasMore": true
  }
}
```

---

### `GET /api/rides/{id}`
Retrieves complete details of a specific historical ride check.

---

### `DELETE /api/rides/{id}`
Deletes a specific saved ride check belonging to the authenticated cyclist.

- **Response `200 OK`**: `{ "success": true, "message": "Ride check deleted." }`

---

### `GET /api/rides/stats`
Returns aggregated analytics for the authenticated cyclist.

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "totalChecks": 42,
    "averageScore": 84.6,
    "safestCity": "Kandy",
    "safestScore": 96,
    "scoreDistribution": {
      "safe": 34,
      "caution": 7,
      "unsafe": 1
    }
  }
}
```

---

### `DELETE /api/rides/account`
GDPR Article 17 Right-to-Erasure endpoint. Permanently deletes the user profile and all associated ride records.

- **Response `200 OK`**: `{ "success": true, "message": "Account and all associated ride history permanently erased." }`

---

## 4. Mobile Rate-Limit Response Contract (HTTP 429)

When rate limits are exceeded, the API Gateway responds with standard headers and a structured JSON payload:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 90
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 90
```

```json
{
  "success": false,
  "error": "RATE_LIMITED",
  "message": "Too many requests. Please try again in 1 minute and 30 seconds.",
  "retryAfter": 90
}
```

---

## 5. Standard Error Format

All error responses return a uniform JSON format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable explanation of error."
}
```

| HTTP Status | Error Code | Description / Client Handling |
| :---: | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Malformed parameters or coordinates out of range. |
| `401` | `TOKEN_EXPIRED` | Expired access token. Mobile executes silent refresh via `/api/auth/refresh`. |
| `403` | `FORBIDDEN` | Attempting to access or delete another user's ride record. |
| `404` | `NOT_FOUND` | Ride record ID does not exist. |
| `429` | `RATE_LIMITED` | Rate limit exceeded. Mobile triggers non-blocking countdown banner. |
| `502` | `UPSTREAM_UNAVAILABLE` | External weather API or microservice failure. Mobile prompts retry. |
