# Safe Bike Ride Planner — Project Documentation Hub 🚴‍♂️📱

Welcome to the official technical documentation for the **Safe Bike Ride Planner** mobile application and distributed microservices ecosystem. This documentation provides architecture designs, mobile engineering specifications, API contracts, security profiles, operational guidelines, and development plans.

---

## 📚 Documentation Index

| Document | Purpose | Key Topics Covered |
| :--- | :--- | :--- |
| **[Mobile Client Specification](MOBILE_CLIENT_SPECIFICATION.md)** | Unified mobile application specification | Flutter 3.x stack, Gateway-only routing, OAuth 2.0 PKCE, Secure Token Storage, CORS, 429 rate-limiting UX, SC1–SC10 screens, screenshot checklists |
| **[Mobile UX & UI Design System](MOBILE_UX_AND_UI_DESIGN.md)** | Client-side engineering and mobile user experience | Flutter Material 3 design system, screens SC1–SC10, state management (Riverpod), navigation (go_router), 429 countdown banners, accessibility |
| **[Architecture & System Design](ARCHITECTURE_AND_SYSTEM_DESIGN.md)** | System architecture and operational flows | Mobile-first architecture, API Gateway routing, OAuth 2.0 PKCE verification, microservice proxy pattern, sequence flows |
| **[Project Plan & Work Distribution](PROJECT_PLAN_AND_WORK_DISTRIBUTION.md)** | Academic project plan, WBS, team roles & roadmap | 2-member plan (Kushmi & Haruka), Spring Boot microservices, API Gateway, Flutter mobile app, WBS, RACI |
| **[API Documentation](API_DOCUMENTATION.md)** | Complete API Gateway & REST API reference | Mobile auth endpoints (PKCE token exchange, refresh, logout), microservice routes, error formats, 429 rate-limit contracts |
| **[Security Audit Report](SECURITY_AUDIT_REPORT.md)** | Security evaluation and vulnerability audit | Mobile OAuth 2.0 PKCE, Keychain/Keystore token storage, Bearer auth, Gateway CORS/rate limiting, microservice `X-API-KEY` protection |
| **[Database & Data Model Report](DATABASE_DATA_MODEL_REPORT.md)** | Database design and persistence layer | MongoDB collections (`users`, `ridechecks`, `refreshtokens`), schema models, compound indexes, GDPR erasure |
| **[Safety Score Algorithm Analysis](SAFETY_SCORE_ALGORITHM_ANALYSIS.md)** | Algorithmic evaluation of cycling safety | Server-side scoring engine, European AQI 1–5 scoring, threshold profiles, mobile display-only contract |
| **[Code Quality & Technical Debt](CODE_QUALITY_AND_TECHNICAL_DEBT.md)** | Code review, standards, and code health | Flutter code quality standards, API Gateway standards, test coverage targets, technical debt remediation |
| **[DevOps & Deployment Guide](DEVOPS_DEPLOYMENT_GUIDE.md)** | Infrastructure, containerization, and builds | Docker Compose (Gateway + Microservices + DB), Flutter mobile builds (Android APK / iOS IPA), Docker exemption, CI/CD |
| **[Project Analysis Report](PROJECT_ANALYSIS_REPORT.md)** | Project executive summary and technical analysis | Executive summary, mobile stack evaluation, feature breakdown, risk assessment, roadmap |
| **[Implementation & Remediation Plan](IMPLEMENTATION_PLAN.md)** | Phased implementation roadmap | Setup, microservices development, API Gateway & security, Flutter mobile client implementation, verification |

---

## 🛠️ Project At A Glance

- **Repository**: `Safe_Bike_Ride_Planner`
- **Client Stack**: **Flutter 3.x / Dart 3** (`mobile-app/` for Android & iOS)
- **Team**: 2 Members — **Kushmi** (Lead: `ride-safety-service` & Mobile Safety/Auth) & **Haruka** (Lead: `ride-history-service` & Mobile History/Rate-Limit)
- **Primary Function**: Real-time outdoor weather and air quality assessment for cycling safety delivered via a native mobile experience
- **Core Architecture**: Flutter Mobile App $\rightarrow$ Central API Gateway $\rightarrow$ Distributed Spring Boot Microservices (`ride-safety-service`, `ride-history-service`) + MongoDB
- **Gateway & Traffic Control**: Single entry point for all mobile traffic handling OAuth 2.0 PKCE token exchange, JWT issuance/validation, client-aware CORS, and IP/User Rate Limiting with `429 Too Many Requests` + `Retry-After` headers
- **Internal Security**: Upstream microservices isolated behind API Gateway using internal `X-API-KEY` verification
- **Containerization**: Backend 100% Docker containerized with single root `docker compose up` orchestration (mobile app is exempt and built via Flutter SDK)

---

## 🧭 How to Use This Documentation

- **For Mobile Developers**: Start with [Mobile Client Specification](MOBILE_CLIENT_SPECIFICATION.md) and [Mobile UX & UI Design System](MOBILE_UX_AND_UI_DESIGN.md).
- **For Backend & Gateway Engineers**: Consult [Architecture & System Design](ARCHITECTURE_AND_SYSTEM_DESIGN.md) and [API Documentation](API_DOCUMENTATION.md).
- **For Security Auditors**: Review [Security Audit Report](SECURITY_AUDIT_REPORT.md).
- **For DevOps Engineers**: Follow the [DevOps & Deployment Guide](DEVOPS_DEPLOYMENT_GUIDE.md).
