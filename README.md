# Safe Bike Ride Planner 🚴‍♂️ — Distributed Microservices Platform

> Real-time cycling safety assessments based on hyper-local weather conditions and air quality data. Built with Spring Boot microservices, API Gateway, OAuth 2.0 security, and a unified Client Application.

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-17+-orange.svg)](https://www.oracle.com/java/)
[![Node.js](https://img.shields.io/badge/Gateway-Express%20%2F%20Node-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-blue.svg)](docker-compose.yml)
[![OpenAPI 3.0](https://img.shields.io/badge/OpenAPI-Swagger%203.0-yellowgreen.svg)](docs/PROJECT_PLAN_AND_WORK_DISTRIBUTION.md)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 👥 Project Team & Work Distribution

This project is developed by a **2-member engineering team**, where each member owns a dedicated Spring Boot microservice, shared gateway infrastructure, containerization, and frontend integration:

| Team Member | Role | Core Microservice / Domain | Academic Responsibilities |
| :--- | :--- | :--- | :--- |
| **Kushmi**<br>*(Member 1)* | Microservices Lead<br>& Auth Engineer | **`ride-safety-service`**<br>(Spring Boot — Port `8082`) | • Core weather & OWM AQI (1–5) safety scoring engine<br>• Custom threshold evaluation endpoints<br>• Central Gateway OAuth 2.0 integration<br>• API Key security filter on Safety Service<br>• Swagger UI / OpenAPI 3.0 documentation<br>• Frontend Safety Scoring & Search interface |
| **Haruka**<br>*(Member 2)* | Microservices Lead<br>& Data Engineer | **`ride-history-service`**<br>(Spring Boot — Port `8083`) | • Historical ride checks CRUD & MongoDB persistence<br>• Server-side pagination (`limit`/`skip`) & analytics<br>• GDPR right-to-erasure account deletion<br>• Gateway IP rate limiting & CORS security<br>• API Key security filter on History Service<br>• Swagger UI / OpenAPI 3.0 documentation<br>• Frontend History Dashboard & modal interface |

> Detailed WBS, RACI matrix, and sprint schedules are documented in **[`docs/PROJECT_PLAN_AND_WORK_DISTRIBUTION.md`](docs/PROJECT_PLAN_AND_WORK_DISTRIBUTION.md)**.

---

## 🏗️ Distributed System Architecture

All client requests enter through a central **API Gateway**, which enforces OAuth 2.0 user authentication, IP rate limiting, and CORS headers. The Gateway injects a trusted internal `X-API-KEY` into upstream requests, protecting microservices from unauthorized direct access.

```
                               ┌─────────────────────────────┐
                               │  Unified Client Application │
                               │   (HTML5 / CSS3 / PWA SPA)  │
                               └──────────────┬──────────────┘
                                              │ HTTP / JSON (Port 3000 / 8080)
                                              │ OAuth 2.0 / Session Cookie
                               ┌──────────────▼──────────────┐
                               │      CENTRAL API GATEWAY    │
                               │  - Request Path Routing     │
                               │  - OAuth 2.0 User Auth      │
                               │  - Rate Limiting (100/15m)  │
                               │  - CORS Policy Enforcer     │
                               │  - Injects X-API-KEY Header │
                               └───────┬─────────────┬───────┘
                                       │             │
        Forward to /api/safety/**      │             │ Forward to /api/rides/**
        (Header: X-API-KEY: [secret])  │             │ (Header: X-API-KEY: [secret])
                                       │             │
         ┌─────────────────────────────▼─┐         ┌─▼─────────────────────────────┐
         │     RIDE-SAFETY-SERVICE       │         │     RIDE-HISTORY-SERVICE      │
         │  (Spring Boot — Kushmi)       │         │   (Spring Boot — Haruka)      │
         │  Port: 8082                   │         │   Port: 8083                  │
         ├───────────────────────────────┤         ├───────────────────────────────┤
         │ • Weather & AQI 1-5 Engine    │         │ • Ride Check Records CRUD     │
         │ • Safety Score Calculator     │         │ • History Pagination          │
         │ • Custom Threshold Profiles   │         │ • User Cycling Statistics     │
         │ • API Key Security Filter     │         │ • GDPR Account Erasure        │
         │ • Swagger UI (Port 8082)      │         │ • API Key Security Filter     │
         └──────────────┬────────────────┘         │ • Swagger UI (Port 8083)      │
                        │                          └──────────────┬────────────────┘
                        │ HTTPS External Calls                    │
         ┌──────────────▼────────────────┐         ┌──────────────▼────────────────┐
         │       External Providers      │         │       Database Service        │
         │  - OpenWeatherMap (Weather)   │         │       (MongoDB Container)     │
         │  - OpenWeatherMap (AQI 1-5)   │         │       Port: 27017             │
         │  - IPGeolocation API          │         │       Volume: mongodb_data    │
         └───────────────────────────────┘         └───────────────────────────────┘
```

---

## 🧩 Microservices Specification & Endpoints

### 1. `ride-safety-service` (Lead: Kushmi)
- **Port**: `8082` | **Swagger UI**: `http://localhost:8082/swagger-ui.html`
- **Security**: Verifies incoming `X-API-KEY` header against internal secret.
- **Key Endpoints** (Minimum 3–4 domain/CRUD operations):
  - `POST /api/v1/safety/evaluate` — Evaluates temperature, humidity, wind, condition, and AQI, returning score (0–100).
  - `GET /api/v1/safety/conditions?lat={lat}&lon={lon}` — Real-time weather and pollution assessment for coordinates.
  - `GET /api/v1/safety/thresholds` — Retrieve current safety scoring parameter weights.
  - `PUT /api/v1/safety/thresholds` — Update rider threshold configuration (e.g. beginner vs. pro rider tolerances).

### 2. `ride-history-service` (Lead: Haruka)
- **Port**: `8083` | **Swagger UI**: `http://localhost:8083/swagger-ui.html`
- **Security**: Verifies incoming `X-API-KEY` header against internal secret.
- **Key Endpoints** (Minimum 3–4 domain/CRUD operations):
  - `POST /api/v1/rides` — Persist new ride check assessment for the authenticated user.
  - `GET /api/v1/rides?userId={userId}&limit=20&skip=0` — Retrieve user ride history with pagination.
  - `GET /api/v1/rides/{id}` — Retrieve detailed summary for an individual ride check.
  - `DELETE /api/v1/rides/{id}` — Delete a single ride check record.
  - `DELETE /api/v1/rides/account?userId={userId}` — GDPR Article 17 right-to-erasure cascade deletion.

---

## 🔒 Security Architecture

1. **API Key Verification**: Direct client access to ports `8082` or `8083` without a valid `X-API-KEY` is rejected with `401 Unauthorized` or `403 Forbidden`.
2. **Centralized OAuth 2.0**: User sign-in is managed at the Gateway via Google OAuth 2.0 with session cookies / JWT tokens.
3. **Rate Limiting**: Gateway throttles traffic to 100 requests per 15 minutes per IP/client to mitigate brute-force and DoS.
4. **CORS Hardening**: Strict origin whitelisting permits only the registered frontend host.
5. **NoSQL Injection & CSP**: Sanitized database queries (`express-mongo-sanitize`) and strict Content Security Policies (`helmet`).

---

## 📊 Safety Score Algorithm

$$\text{Safety Score} = \text{round}(0.40 \times \text{Weather} + 0.40 \times \text{Air Quality} + 0.20 \times \text{Condition})$$

### Air Quality Scale (European OpenWeatherMap 1–5 Scale)
- **1 (Good)**: 100/100 sub-score — Optimal conditions for outdoor cycling.
- **2 (Fair)**: 75/100 sub-score — Acceptable for regular commuting.
- **3 (Moderate)**: 50/100 sub-score — Sensitive individuals should reduce intense cardio.
- **4 (Poor)**: 25/100 sub-score — Unfavorable; high pollutant exposure risk.
- **5 (Very Poor)**: 0/100 sub-score — Hazardous; outdoor cycling should be postponed.

### Safety Levels
- 🟢 **Safe (70–100)**: Great conditions for riding.
- 🟡 **Caution (40–69)**: Marginal conditions — inspect individual factors before departing.
- 🔴 **Unsafe (0–39)**: Adverse conditions — consider postponing.

---

## 🚀 Quick Start (Single-Command Docker Launch)

The entire distributed ecosystem is containerized and launches with a single command via the root `docker-compose.yml`:

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS / Linux)
- Git

### Launch System
```bash
# 1. Clone repository
git clone https://github.com/KushmiKaushini/safe-bike-ride-planner.git
cd safe-bike-ride-planner

# 2. Configure environment
cp .env.example .env

# 3. Spin up all services with Docker Compose
docker compose up -d
```

### Access URLs & Endpoints

| Component | URL | Credentials / Notes |
| :--- | :--- | :--- |
| **Unified Client App** | [http://localhost:3000](http://localhost:3000) | Public frontend interface & PWA |
| **API Gateway** | [http://localhost:3000/api](http://localhost:3000) | Reverse proxy & OAuth entry point |
| **Gateway Health Check** | [http://localhost:3000/health](http://localhost:3000/health) | `{"status":"OK","environment":"development"}` |
| **Safety Service Swagger UI** | `http://localhost:8082/swagger-ui.html` | Interactive OpenAPI 3.0 docs (Kushmi) |
| **History Service Swagger UI** | `http://localhost:8083/swagger-ui.html` | Interactive OpenAPI 3.0 docs (Haruka) |
| **Mongo Express DB Admin** | [http://localhost:8081](http://localhost:8081) | Web DB GUI (No auth required in dev) |
| **MongoDB Database** | `localhost:27017` | `safe-bike-planner` database |

---

## 🔑 Test Credentials & API Key Headers

- **Internal API Key Header**:
  ```http
  X-API-KEY: change-this-to-a-random-string
  ```
- **Demo / Test User (Mock)**:
  - User ID: `test-cyclist-001`
  - Email: `demo.cyclist@example.com`
- **Google OAuth Login**:
  - Click **"Sign in with Google"** on [http://localhost:3000](http://localhost:3000) to authenticate via your personal Google account.

---

## 📁 Repository Structure

```
Safe_Bike_Ride_Planner/
├── docker-compose.yml                # Root multi-container orchestration
├── .env.example                      # Root environment configuration template
├── README.md                         # This file
├── docs/                             # Academic & technical documentation hub
│   ├── README.md                     # Documentation hub index
│   ├── PROJECT_PLAN_AND_WORK_DISTRIBUTION.md # Academic plan, WBS, team distribution
│   ├── FIXING_PLAN.md                # 24-point remediation audit & verification
│   ├── ARCHITECTURE_AND_SYSTEM_DESIGN.md
│   ├── API_DOCUMENTATION.md
│   ├── SAFETY_SCORE_ALGORITHM_ANALYSIS.md
│   ├── SECURITY_AUDIT_REPORT.md
│   ├── DATABASE_DATA_MODEL_REPORT.md
│   ├── FRONTEND_UX_ANALYSIS.md
│   ├── CODE_QUALITY_AND_TECHNICAL_DEBT.md
│   └── DEVOPS_DEPLOYMENT_GUIDE.md
├── backend/                          # Gateway & Core REST Service
│   ├── config/                       # DB and Passport OAuth configuration
│   ├── middleware/                   # Rate limiting, CSRF, auth guards
│   ├── models/                       # User & RideCheck schemas
│   ├── routes/                       # Auth, external proxy, ride checks
│   ├── services/                     # Safety score business logic
│   ├── tests/                        # Jest test suites (19 tests passing)
│   ├── Dockerfile
│   └── package.json
└── public/                           # Client Application (Vanilla JS / CSS3 / PWA)
    ├── css/style.css                 # Dark-theme design system & WCAG styles
    ├── js/app.js                     # SPA engine & DOM controller
    ├── js/auth.js                    # OAuth auth state controller
    ├── icons/                        # PWA installable icons (192px & 512px)
    ├── manifest.json                 # Web App Manifest
    ├── sw.js                         # Service Worker offline shell cache
    └── index.html                    # Single-page application shell
```

---

## 📚 Academic Deliverable Compliance Checklist

- [x] **Spring Boot Microservices**: Individual service allocation per student (`ride-safety-service` & `ride-history-service`).
- [x] **CRUD / Domain Endpoints**: Each microservice exposes 4+ specialized endpoints.
- [x] **API Key Verification**: Internal service-to-service security filter rejecting unauthorized calls.
- [x] **API Gateway**: Central reverse proxy routing traffic to appropriate microservices.
- [x] **OAuth 2.0 Security**: Google OAuth single sign-on integration.
- [x] **Traffic Control**: IP-based Rate Limiting (100 req/15min) and CORS protection.
- [x] **Unified Frontend**: Single PWA interface integrating search, real-time safety scores, and historical checks.
- [x] **Docker Containerization**: Single `docker compose up` orchestration for the full distributed stack.
- [x] **Interactive Documentation**: Swagger UI / OpenAPI 3.0 endpoints for all microservices.
- [x] **Deliverable 1 Quality**: Clear commit history per member, component directories, comprehensive documentation.

---

## 📝 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
