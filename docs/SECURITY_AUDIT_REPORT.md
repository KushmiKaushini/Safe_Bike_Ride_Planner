# Safe Bike Ride Planner — Security Audit Report 🔒📱

> **Scope**: Mobile client architecture (`mobile-app/`), API Gateway perimeter security, OAuth 2.0 PKCE, token storage, microservice isolation, and threat modeling.

---

## 1. Executive Summary

This security audit outlines the defenses and requirements for the **Safe Bike Ride Planner** mobile application and distributed microservices ecosystem. Transitioning from legacy web-session architectures to native mobile token-based security eliminates browser-borne attack vectors (such as cross-site request forgery) while introducing requirements for secure client-side cryptographic storage, OAuth 2.0 PKCE enforcement, and gateway-level authorization validation.

---

## 2. Mobile Client Security Controls

### 2.1 RFC 8252 & RFC 7636 OAuth 2.0 PKCE
- **Zero Embedded WebViews**: User authentication runs exclusively within system-provided secure browsers (`ASWebAuthenticationSession` on iOS and Chrome Custom Tabs on Android). Embedded `WebView` components are strictly prohibited to prevent password sniffing and session hijacking.
- **PKCE Defense**: Uses a cryptographically randomized `code_verifier` (43–128 characters) and SHA-256 `code_challenge`. Even if a malicious app intercepts the custom scheme redirect (`com.safebike.planner:/oauth2redirect`), it cannot exchange the authorization code without the plaintext `code_verifier`.

### 2.2 Hardware-Backed Token Storage
- Mobile access and refresh tokens are stored using `flutter_secure_storage`:
  - **Android**: Uses `EncryptedSharedPreferences` backed by the **Android Keystore System** with AES-256 GCM encryption.
  - **iOS**: Uses the **iOS Keychain** configured with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`.
- Unencrypted `SharedPreferences`, `NSUserDefaults`, or local SQLite databases are strictly prohibited for secret storage.

### 2.3 Strict Secret Isolation (Zero Client Secrets)
- No microservice API keys (`X-API-KEY`), database credentials, or Google client secrets are compiled into the Android APK or iOS IPA binaries.
- The mobile client interacts exclusively with the public API Gateway; upstream credentials remain isolated within backend container environments.

---

## 3. Gateway & Network Perimeter Defenses

### 3.1 Gateway Authentication & Identity Propagation
- **JWT Signature Verification**: All protected API routes require `Authorization: Bearer <token>`. The Gateway verifies the RSA/HMAC signature and expiration.
- **Elimination of IDOR (Insecure Direct Object References)**: The client never submits its `userId`. The Gateway extracts the verified `sub` claim from the JWT and injects it into upstream request headers as `X-User-Id`.

### 3.2 Internal Microservice Isolation (`X-API-KEY`)
- Individual microservices (`ride-safety-service` and `ride-history-service`) do not expose public ports to external mobile traffic.
- Every internal endpoint requires an `X-API-KEY` header injected exclusively by the API Gateway. Direct requests lacking this key are rejected with `401 Unauthorized`.

### 3.3 Mobile-Aware CORS & Rate Limiting
- **CORS Policy**: Configured to permit requests lacking `Origin` headers (standard native mobile clients), while allowing local mobile debugging origins (Flutter DevTools).
- **Dual-Tier Rate Limiting**:
  - Global API: 100 requests per 15-minute window per authenticated user ID (`sub`).
  - Auth Endpoints: 10 requests per 15-minute window per IP to prevent credential brute-forcing.
  - Exceeding requests receive `429 Too Many Requests` along with standard `Retry-After` headers.

---

## 4. Threat Modeling Matrix (STRIDE)

| Threat Category | Potential Attack Vector | Applied Mitigation |
| :--- | :--- | :--- |
| **Spoofing** | Attacker intercepts authorization code during redirect. | **PKCE (RFC 7636)**: Gateway requires original `code_verifier` matching `code_challenge`. Intercepted code cannot be redeemed. |
| **Tampering** | Man-in-the-middle alters weather/score response. | **TLS 1.3 / HTTPS**: Enforced via Android `network_security_config.xml` and iOS ATS. Cleartext disabled in production. |
| **Repudiation** | User denies saving or deleting a ride check. | **Server-side audit logging**: Gateway logs authenticated `userId` and timestamp for all mutating operations. |
| **Information Disclosure** | Decompilation of APK/IPA extracts backend API keys. | **Gateway Proxy Pattern**: Zero internal API keys or service credentials exist within mobile binaries. |
| **Denial of Service** | Malicious script spams safety score evaluation endpoint. | **Rate Limiting**: Gateway throttles calls to 100 req/15 min, returning `429` with `Retry-After` headers. |
| **Elevation of Privilege** | Cyclist modifies another user's ride history record. | **Identity Extraction**: Microservices accept `userId` exclusively from Gateway-injected headers, preventing query-string tampering. |

---

## 5. Security Verification Checklist

- [x] All mobile network calls route through `GATEWAY_BASE_URL` on port `8080`.
- [x] Tokens stored exclusively via `flutter_secure_storage` (Keychain / Keystore).
- [x] No credentials or `X-API-KEY` strings compiled into the mobile codebase.
- [x] Cleartext HTTP blocked in production Android and iOS manifests.
- [x] Gateway rejects unauthorized or expired JWT tokens with `401`.
- [x] Rate limiting returns structured JSON and `Retry-After` headers upon HTTP 429.
- [x] Refresh tokens hashed with SHA-256 before storage in MongoDB.
- [x] GDPR Article 17 endpoint permanently cascades deletion across all user data.
