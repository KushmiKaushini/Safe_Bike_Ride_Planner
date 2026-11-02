# Safe Bike Ride Planner — Architecture & System Design 🚴‍♂️🏗️

> **Scope**: Distributed system architecture, component topology, network flows, and API Gateway integration for the mobile platform.

---

## 1. High-Level Architecture Overview

The system utilizes a modern, mobile-first distributed microservices architecture. The native mobile client communicates exclusively with a centralized API Gateway, which secures, coordinates, rate-limits, and routes requests to underlying domain microservices.

```mermaid
flowchart TD
    subgraph MobileLayer["Mobile Client Tier (Android & iOS)"]
        FlutterApp["Flutter Mobile App (mobile-app/)"]
        SecureStorage[("Keychain / Keystore (Encrypted Storage)")]
        FlutterApp <--> SecureStorage
    end

    FlutterApp -->|"HTTPS / JSON + Authorization: Bearer <JWT>"| APIGateway["Central API Gateway (:8080)"]

    subgraph GatewayTier["API Gateway Security & Traffic Engine"]
        APIGateway --> AuthEngine["OAuth 2.0 PKCE & JWT Engine"]
        APIGateway --> RateLimiter["User & IP Rate Limiter (HTTP 429)"]
        APIGateway --> KeyInjector["Internal X-API-KEY Injector"]
        APIGateway --> CORSPolicy["Mobile & Dev CORS Enforcer"]
    end

    subgraph ServiceTier["Backend Microservices Tier (Docker Compose)"]
        KeyInjector -->|"Route: /api/v1/safety/**"| SafetyService["ride-safety-service (:8082 - Kushmi)"]
        KeyInjector -->|"Route: /api/v1/rides/**"| HistoryService["ride-history-service (:8083 - Haruka)"]
    end

    subgraph PersistenceExternal["Persistence & External Services"]
        HistoryService --> MongoDB[("MongoDB Cluster (:27017)")]
        AuthEngine --> MongoDB
        SafetyService --> OWM["OpenWeatherMap (Weather & AQI 1-5)"]
        SafetyService --> Geocoding["Geocoding & Location Services"]
    end
```

---

## 2. Component Design & Responsibilities

### 2.1 Native Mobile Client (`mobile-app/`)
- Built in Flutter 3.x for native Android and iOS deployment.
- Encapsulates UI, local cache, hardware geolocation (`geolocator`), and network state.
- Strictly interacts with the single `GATEWAY_BASE_URL` endpoint using a singleton `Dio` HTTP client.
- Performs in-app OAuth 2.0 PKCE authentication and persists tokens in hardware-backed storage (`flutter_secure_storage`).
- Implements `RateLimitInterceptor` to handle HTTP 429 responses with countdowns.

### 2.2 Central API Gateway (Port `8080`)
- **Single Public Entry Point**: The only service exposed publicly to mobile devices and emulators.
- **Mobile Authentication**: Validates Google OAuth `id_token` payloads via PKCE, registers/updates users, and issues signed JWT access and rotating refresh tokens.
- **Token Verification**: Verifies `Authorization: Bearer <token>` on all protected routes and injects authenticated user IDs into upstream headers (`X-User-Id`).
- **Internal Security Injection**: Injects internal `X-API-KEY` into upstream requests, rejecting direct unauthenticated calls to microservices.
- **Traffic Control & Rate Limiting**: Throttles clients exceeding 100 requests per 15 minutes, returning `429 Too Many Requests` with `Retry-After` headers and countdown data.
- **CORS Management**: Permissive for native mobile requests (no origin), configured for mobile dev tools.

### 2.3 `ride-safety-service` (Port `8082` — Lead: Kushmi)
- Core domain engine evaluating cycling safety scores (0–100).
- Normalizes European AQI (1–5) and meteorological factors (wind speed in m/s, temperature, precipitation).
- Manages rider threshold profiles (beginner vs. pro tolerances).
- Protected by mandatory `X-API-KEY` verification filters.
- Exposes interactive OpenAPI 3.0 / Swagger UI documentation at `/swagger-ui.html`.

### 2.4 `ride-history-service` (Port `8083` — Lead: Haruka)
- Manages persistence and retrieval of historical ride safety checks.
- Implements paginated history queries (`limit`, `skip`), individual ride inspection, and GDPR Article 17 account deletion.
- Aggregates user cycling statistics (average scores, safest routes, total distance/checks).
- Protected by mandatory `X-API-KEY` verification filters.
- Exposes interactive OpenAPI 3.0 / Swagger UI documentation at `/swagger-ui.html`.

### 2.5 Persistence Layer (MongoDB)
- Stores `users`, `ridechecks`, and hashed `refreshtokens`.
- Uses compound indexes (`{ userId: 1, createdAt: -1 }`) for fast pagination.
- Enforces TTL auto-expiry on refresh token sessions.

---

## 3. End-to-End Sequence Diagrams

### 3.1 Mobile OAuth 2.0 PKCE Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    actor Cyclist as Cyclist
    participant Mobile as Flutter Client
    participant Browser as Chrome Custom Tab / ASWeb
    participant Google as Google Identity Provider
    participant Gateway as Central API Gateway (:8080)
    participant DB as MongoDB

    Cyclist->>Mobile: Tap "Sign in with Google"
    Mobile->>Mobile: Generate PKCE code_verifier + code_challenge
    Mobile->>Browser: Launch Auth URL with PKCE challenge
    Browser->>Google: Authenticate & Request Scopes
    Google->>Cyclist: Show Consent Screen
    Cyclist->>Google: Approve Access
    Google-->>Browser: Redirect with Auth Code
    Browser-->>Mobile: Intercept redirect: com.safebike.planner:/oauth2redirect
    Mobile->>Google: Exchange Auth Code + code_verifier
    Google-->>Mobile: Return Google id_token
    Mobile->>Gateway: POST /api/auth/mobile/token { idToken }
    Gateway->>Gateway: Verify id_token signature, aud & expiry
    Gateway->>DB: Upsert User record & persist hashed refresh token
    Gateway-->>Mobile: 200 OK { accessToken (JWT), refreshToken, user }
    Mobile->>Mobile: Persist tokens in Keystore / Keychain
    Mobile->>Gateway: GET /api/safety/conditions (Authorization: Bearer <accessToken>)
```

### 3.2 Real-Time Safety Assessment & Ride Check Persistence

```mermaid
sequenceDiagram
    autonumber
    actor Cyclist as Cyclist
    participant Mobile as Flutter Client
    participant Gateway as Central API Gateway (:8080)
    participant Safety as ride-safety-service (:8082)
    participant History as ride-history-service (:8083)
    participant OWM as Weather & AQI APIs
    participant DB as MongoDB

    Cyclist->>Mobile: Tap "Check City" or "Use Current Location"
    Mobile->>Gateway: GET /api/safety/conditions?lat=6.92&lon=79.86<br/>Header: Authorization: Bearer <accessToken>
    Gateway->>Gateway: Validate JWT signature & claims
    Gateway->>Safety: Forward: GET /api/v1/safety/conditions?lat=...<br/>Header: X-API-KEY: [secret]
    Safety->>OWM: Fetch Weather & European AQI (1-5)
    OWM-->>Safety: Weather data + Air Quality readings
    Safety->>Safety: Compute 0-100 composite safety score & recommendation
    Safety-->>Gateway: Return safety report payload
    Gateway-->>Mobile: 200 OK { safetyScore: 88, level: "Safe", weather, aqi }
    Mobile->>Cyclist: Render circular score gauge & condition metrics

    Cyclist->>Mobile: Tap "Save This Report"
    Mobile->>Gateway: POST /api/rides { lat, lon, city, ... }<br/>Header: Authorization: Bearer <accessToken>
    Gateway->>Gateway: Extract userId from JWT "sub" claim
    Gateway->>History: Forward: POST /api/v1/rides<br/>Headers: X-API-KEY: [secret], X-User-Id: [userId]
    History->>DB: Insert new RideCheck document
    History-->>Gateway: 201 Created { rideCheckId, status: "saved" }
    Gateway-->>Mobile: 201 Created
    Mobile->>Cyclist: Display success snackbar
```

### 3.3 Mobile Rate-Limiting (HTTP 429) & UI Resilience Flow

```mermaid
sequenceDiagram
    autonumber
    actor Cyclist as Cyclist
    participant Mobile as Flutter Client
    participant Gateway as Central API Gateway (:8080)

    loop Rapid Requests Exceeding Rate Limit
        Mobile->>Gateway: GET /api/safety/conditions (Rapid Calls)
    end
    Gateway->>Gateway: Threshold exceeded (>100 req/15 min)
    Gateway-->>Mobile: HTTP 429 Too Many Requests<br/>Retry-After: 90<br/>{ error: "RATE_LIMITED", retryAfter: 90 }
    
    Note over Mobile: RateLimitInterceptor triggers RateLimitBanner
    Mobile->>Cyclist: Show top countdown banner ("Actions unlock in 01:30")
    Mobile->>Mobile: Disable "Check", "Locate" and "Save" buttons
    Mobile->>Cyclist: Preserve existing safety report & cached history
    
    Note over Mobile: Countdown ticker reaches 00:00
    Mobile->>Mobile: Auto-dismiss banner & re-enable buttons
    Mobile->>Gateway: Retries previous GET request
    Gateway-->>Mobile: 200 OK
```

---

## 4. Network Security & Isolation Architecture

1. **Edge Demarcation**: Only the API Gateway (`8080`) is exposed on the host machine or public interfaces.
2. **Internal API Key Isolation**: Microservices `ride-safety-service` and `ride-history-service` check for an `X-API-KEY` header matching the internal shared secret. Calls arriving without this header are rejected with `401 Unauthorized`.
3. **Identity Propagation**: The mobile client never provides a `userId` in query parameters or request bodies. The API Gateway extracts the verified subject (`sub`) claim from the JWT and injects it as an `X-User-Id` header for upstream services, eliminating IDOR vulnerabilities.
4. **Mobile Platform Transport**:
   - Android: TLS 1.3 enforced via `network_security_config.xml`. Cleartext restricted to emulator testing (`10.0.2.2`).
   - iOS: App Transport Security (ATS) enforced via `Info.plist`.
