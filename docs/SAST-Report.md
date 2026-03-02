# Static Application Security Testing (SAST) Report

## QueueTime - Speaker Queue Manager for Zoom

**Scan Date**: March 2, 2026
**Application Version**: 1.0.0
**Scanned By**: Michelle Gallagher
**Report Version**: 1.0

---

## Executive Summary

| Metric | Result |
|--------|--------|
| **Overall Status** | PASS |
| **Critical Findings** | 0 |
| **High Findings** | 0 |
| **Medium Findings** | 0 |
| **Low Findings** | 0 |
| **Dependency Vulnerabilities** | 0 |

All static analysis scans completed with zero security findings.

---

## 1. Semgrep SAST Scan

**Tool**: Semgrep v1.153.1 (open-source SAST)
**Configuration**: `--config auto` (Community ruleset)
**Scope**: All source files in `src/` directory

### Scan Output

```
┌─────────────┐
│ Scan Status │
└─────────────┘
  Scanning 27 files tracked by git with 1064 Code rules:

  Language      Rules   Files          Origin      Rules
 ─────────────────────────────        ───────────────────
  <multilang>      48      27          Community    1064
  js              156      16

┌──────────────┐
│ Scan Summary │
└──────────────┘
✅ Scan completed successfully.
 • Findings: 0 (0 blocking)
 • Rules run: 204
 • Targets scanned: 27
 • Parsed lines: ~100.0%

Ran 204 rules on 27 files: 0 findings.
```

### Rules Coverage

The Semgrep scan included rules for:
- **Injection**: XSS, code injection, command injection, prototype pollution
- **Cryptography**: Insecure algorithms, weak randomness
- **Secrets**: Hardcoded passwords, API keys, tokens
- **Data exposure**: Sensitive data in logs, error messages, comments
- **Insecure patterns**: `eval()`, `innerHTML`, `document.write()`, unsafe redirects
- **React-specific**: Dangerous JSX patterns, insecure component practices
- **JavaScript/ES6**: Prototype pollution, type confusion, unsafe deserialization

### Result: **0 findings across 204 rules and 27 files**

---

## 2. npm Dependency Audit

**Tool**: npm audit (built into npm)
**Scope**: All production and development dependencies

### Scan Output

```
$ npm audit

found 0 vulnerabilities
```

### Dependency Summary

| Category | Count | Vulnerabilities |
|----------|-------|----------------|
| Production dependencies | 4 | 0 |
| Development dependencies | 12 | 0 |
| Total transitive dependencies | 304 | 0 |

### Production Dependencies Audited

| Package | Version | Status |
|---------|---------|--------|
| react | 19.1.1 | Clean |
| react-dom | 19.1.1 | Clean |
| @zoom/appssdk | 0.16.0 | Clean |
| @hello-pangea/dnd | latest | Clean |

### Remediation Actions Taken

Prior to this scan, `npm audit` identified 5 vulnerabilities (2 high, 3 moderate) in development dependencies:

| Package | Severity | Issue | Resolution |
|---------|----------|-------|-----------|
| rollup | High | Arbitrary File Write via Path Traversal | Updated via `npm audit fix` |
| minimatch | High | ReDoS via repeated wildcards | Updated via `npm audit fix` |
| vite | Moderate | server.fs.deny bypass on Windows | Updated via `npm audit fix` |
| ajv | Moderate | ReDoS with `$data` option | Updated via `npm audit fix` |
| js-yaml | Moderate | Prototype pollution in merge | Updated via `npm audit fix` |

Additionally, `react-beautiful-dnd` (unmaintained, React 18 peer dep conflict) was replaced with `@hello-pangea/dnd` (actively maintained fork with React 19 support) to resolve peer dependency conflicts that were blocking security updates.

**All vulnerabilities have been resolved. Current status: 0 vulnerabilities.**

---

## 3. ESLint Static Analysis

**Tool**: ESLint 9.33 with react-hooks plugin
**Scope**: All source files

### Security-Relevant Findings

| Category | Count |
|----------|-------|
| Security vulnerabilities (XSS, injection, etc.) | 0 |
| Code quality warnings (unused variables) | 37 |
| React hooks correctness warnings | 4 |

**No security-relevant findings.** All flagged items are code quality issues (unused variables) with no security impact. These do not affect the application's security posture.

---

## 4. Manual Security Review

### OWASP Top 10 Assessment

| OWASP Category | Risk | Notes |
|---------------|------|-------|
| A01: Broken Access Control | N/A | No backend; Zoom SDK handles auth |
| A02: Cryptographic Failures | N/A | No encryption needed; no secrets stored |
| A03: Injection | Not Vulnerable | No dynamic queries; React auto-escapes JSX |
| A04: Insecure Design | Not Vulnerable | Client-only; no persistent data |
| A05: Security Misconfiguration | Not Vulnerable | CSP headers configured; HTTPS enforced |
| A06: Vulnerable Components | Not Vulnerable | 0 known vulnerabilities (npm audit clean) |
| A07: Auth Failures | N/A | Delegated to Zoom SDK |
| A08: Data Integrity Failures | N/A | No serialization; no CI/CD pipeline compromise vectors |
| A09: Logging Failures | N/A | No sensitive data logged |
| A10: SSRF | N/A | No server-side requests |

### Code Pattern Review

| Pattern | Found | Details |
|---------|-------|---------|
| `eval()` | No | Not used anywhere |
| `innerHTML` / `dangerouslySetInnerHTML` | No | Not used; React JSX used exclusively |
| `document.write()` | No | Not used |
| Hardcoded secrets/keys | No | Confirmed by Semgrep scan |
| External network requests | No | Only Zoom SDK communication |
| localStorage/cookies | No | All data in React state only |
| Dynamic `<script>` injection | No | Not used |

---

## 5. Build Verification

```
$ npm run build

vite v7.3.1 building client environment for production...
transforming...
✓ 62 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.95 kB │ gzip:   0.48 kB
dist/assets/index-CQO90lhZ.css   20.27 kB │ gzip:   3.92 kB
dist/assets/index-C-aa0BTl.js   387.45 kB │ gzip: 115.11 kB
✓ built in 1.68s
```

Production build completes successfully with:
- Minified JavaScript (no source maps)
- CSS extraction and optimization
- No warnings or errors

---

## 6. Conclusion

QueueTime demonstrates a strong security posture:

1. **Zero SAST findings** from 204 Semgrep rules across 27 files
2. **Zero dependency vulnerabilities** from npm audit
3. **Zero security-relevant findings** from ESLint
4. **Client-only architecture** eliminates server-side attack surface entirely
5. **No data persistence** means no data breach risk
6. **CSP headers** restrict app to Zoom's domain only

The application is suitable for deployment on the Zoom Marketplace from a security perspective.

---

*Report generated March 2, 2026*
