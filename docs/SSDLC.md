# Secure Software Development Life Cycle (SSDLC)

## QueueTime - Speaker Queue Manager for Zoom

**Document Version**: 2.0
**Last Updated**: March 2, 2026
**Author**: Michelle Gallagher
**Application Version**: 1.0.0

---

## 1. Executive Summary

QueueTime is a client-side Zoom App that manages speaker queues and tracks speaking time during meetings and webinars. This document describes the end-to-end secure development lifecycle applied across all phases — from requirements through production deployment.

**Key Security Posture:**
- Zero data collection, storage, or transmission to external servers
- Client-side only (no backend, no database, no APIs beyond Zoom SDK)
- All participant data exists only in browser memory during the active session
- 0 known vulnerabilities (npm audit clean, Semgrep SAST clean)

---

## 2. SSDLC Phases

### Phase 1: Requirements & Security Planning

**Security Requirements Gathering:**
- Privacy-by-design: The app was architected from the start to collect zero persistent data
- Zoom SDK capabilities reviewed against principle of least privilege — only participant display names and meeting context are accessed
- No authentication system required (delegates entirely to Zoom's OAuth)
- No external network calls beyond the Zoom SDK iframe context

**Threat Modeling:**
| Threat | Mitigation | Status |
|--------|-----------|--------|
| XSS via participant names | React's built-in JSX escaping; no `dangerouslySetInnerHTML` | Mitigated |
| Data leakage to external servers | No network calls; no backend; CSP headers restrict origins | Mitigated |
| Session data persistence | All state in React `useState`; cleared on unmount/close | Mitigated |
| Dependency supply chain attacks | Minimal dependencies; `npm audit` in CI; lockfile pinning | Mitigated |
| Clickjacking | `X-Frame-Options` and CSP `frame-ancestors` restrict to `*.zoom.us` | Mitigated |
| Code injection | No `eval()`, no dynamic code execution, no `innerHTML` | Mitigated |

### Phase 2: Secure Architecture & Design

**Architecture Decisions:**
- **Client-side only**: Eliminates entire classes of server-side vulnerabilities (SQLi, SSRF, RCE, auth bypass)
- **No persistent storage**: No localStorage, cookies, IndexedDB, or sessionStorage used for participant data
- **Zoom SDK as only external interface**: All participant data flows through Zoom's authenticated SDK
- **Content Security Policy**: Headers restrict embedding to `*.zoom.us` and `*.zoom.com` domains only

**Technology Stack:**
| Component | Technology | Security Rationale |
|-----------|-----------|-------------------|
| UI Framework | React 19 | Built-in XSS protection via JSX escaping |
| Build Tool | Vite 7 | Production builds minified, no source maps |
| Zoom Integration | @zoom/appssdk 0.16 | Official SDK with Zoom-managed OAuth |
| Drag & Drop | @hello-pangea/dnd | Actively maintained, React 19 compatible |
| Testing | Vitest + Testing Library | Industry-standard testing framework |

**Dependency Minimization:**
- 4 production dependencies (React, ReactDOM, Zoom SDK, drag-drop)
- All other dependencies are devDependencies only (not shipped to production)
- No server-side runtime dependencies

### Phase 3: Secure Implementation

**Coding Standards Enforced:**
- ESLint with `eslint-plugin-react-hooks` for correctness
- No use of `eval()`, `Function()`, `document.write()`, or `innerHTML`
- All user-facing text rendered through React's JSX (auto-escaped)
- Input validation on time limit values (bounded to 10–600 seconds)
- Error boundaries catch and contain runtime errors gracefully

**Code Review Process:**
- All code changes reviewed before merge to `master`
- Automated ESLint checks on every build
- Manual review for security-sensitive patterns (event handlers, SDK calls, DOM manipulation)

**Secure Patterns Used:**
```
- React useState/useCallback/useMemo for state management (no global mutable state)
- Functional updates to avoid stale closure vulnerabilities
- Refs for time-sensitive values to prevent race conditions
- CSP-compliant style injection via insertRule() instead of innerHTML
- ErrorBoundary component for graceful failure handling
```

### Phase 4: Security Testing

**Static Application Security Testing (SAST):**
- **Semgrep**: 204 rules scanned across 27 source files — **0 findings**
- **npm audit**: **0 vulnerabilities** across all dependencies
- **ESLint**: Static analysis for code quality and React hook correctness

See [SAST-Report.md](./SAST-Report.md) for complete scan output and evidence.

**Manual Security Review:**
- Verified no sensitive data in source code, logs, or error messages
- Confirmed CSP headers block embedding outside Zoom
- Verified all Zoom SDK calls use only declared capabilities
- Confirmed no data leaves the browser context

**Testing Infrastructure:**
- Vitest unit tests for component behavior
- React Testing Library for DOM interaction tests
- Build verification (`npm run build`) required before deployment

### Phase 5: Deployment & Operations

**Build Pipeline:**
1. `npm run lint` — Static analysis
2. `npm run test` — Unit test suite
3. `npm audit` — Dependency vulnerability check
4. `npm run build` — Production build (minified, no source maps)
5. Deploy to Netlify via git push to `master`

**Hosting Security:**
- Hosted on Netlify with HTTPS enforced
- Custom `_headers` file configures:
  - `X-Content-Type-Options: nosniff`
  - `Content-Security-Policy: frame-ancestors https://*.zoom.us https://*.zoom.com`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: ALLOW-FROM https://*.zoom.us`

**Deployment Controls:**
- Production deploys only from `master` branch
- Git commit history provides full audit trail
- No secrets or API keys in source code (verified by Semgrep scan)

### Phase 6: Monitoring & Incident Response

**Vulnerability Management:**
- `npm audit` run before each deployment
- Dependabot/GitHub security advisories monitored for dependency alerts
- Dependencies updated promptly when security patches are available

**Incident Response Plan:**
1. **Detection**: Monitor npm audit alerts and Zoom Marketplace notifications
2. **Assessment**: Evaluate severity — note that no user data is at risk since nothing is stored
3. **Containment**: Disable affected features or pull app from Marketplace if critical
4. **Remediation**: Patch vulnerability, test, and redeploy
5. **Communication**: Notify Zoom Marketplace and users if warranted
6. **Post-Incident**: Update SSDLC documentation with lessons learned

**Contact for Security Issues:**
- Email: mgallagh@gmail.com

---

## 3. Data Handling & Privacy

### Data Inventory

| Data Element | Source | Storage | Retention | Transmitted Externally |
|-------------|--------|---------|-----------|----------------------|
| Participant display names | Zoom SDK | React state (memory) | Session only | No |
| Speaking time durations | Calculated locally | React state (memory) | Session only | No |
| Queue order | User-managed | React state (memory) | Session only | No |
| Timer settings | User input | React state (memory) | Session only | No |

### Privacy Controls
- **No data collection**: Nothing stored beyond browser memory
- **No tracking**: No analytics, cookies, or fingerprinting
- **No external calls**: Only Zoom SDK communication (within Zoom's iframe)
- **Session isolation**: Each meeting session starts with clean state
- **Automatic cleanup**: All data garbage-collected when app closes

---

## 4. Compliance

| Standard | Status | Notes |
|----------|--------|-------|
| GDPR | Compliant | No personal data stored or processed |
| CCPA | Compliant | No data collection |
| OWASP Top 10 | Addressed | Client-only architecture eliminates most categories |
| Zoom Marketplace Security | Compliant | CSP headers, SDK-only communication, privacy policy |

---

## 5. Third-Party Dependencies (Production)

| Package | Version | Purpose | Maintained | Last Security Audit |
|---------|---------|---------|-----------|-------------------|
| react | 19.1.1 | UI framework | Yes (Meta) | npm audit clean |
| react-dom | 19.1.1 | DOM rendering | Yes (Meta) | npm audit clean |
| @zoom/appssdk | 0.16.0 | Zoom integration | Yes (Zoom) | npm audit clean |
| @hello-pangea/dnd | latest | Drag-and-drop | Yes (active fork) | npm audit clean |

**Development-only dependencies** (not shipped to production): Vite, Vitest, ESLint, Testing Library

---

## 6. Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 2024 | Initial SSDLC documentation |
| 2.0 | March 2, 2026 | Comprehensive rewrite: added threat model, SAST evidence, incident response, deployment security, data inventory |
