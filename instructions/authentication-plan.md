# Authentication Strategy for Thad Chat Billing Dashboard

## Executive Summary

This document outlines the authentication strategy for securing the Thad Chat Billing Dashboard, which currently has no access control. The application contains sensitive financial data, client support tickets, and API integration tokens that require protection.

**Current State:** No authentication - publicly accessible at `velocity.peakonedigital.com/billing-overview`

**Recommended Approach:** Two-phase implementation
- **Phase 1:** Traefik BasicAuth (immediate protection)
- **Phase 2:** JWT-based authentication (production-grade security)

---

## Application Architecture

### Technology Stack
- **Frontend:** React 18 + Vite + TypeScript
- **Backend:** Express.js REST API (Node.js)
- **Database:** MySQL 8.0
- **Deployment:** Docker Compose with Traefik reverse proxy
- **Network:** `traefik-general` external network for reverse proxy

### Current Routes
- **Frontend:** `https://velocity.peakonedigital.com/billing-overview`
- **Backend API:** `https://velocity.peakonedigital.com/billing-overview-api`

### Sensitive Data Requiring Protection
1. **Financial Data:**
   - Client billing information
   - Support ticket hours and revenue calculations
   - Project revenue and invoicing status
   - Hosting MRR (Monthly Recurring Revenue)

2. **Client Information:**
   - Support request summaries
   - Website URLs and property data
   - Project details and completion dates

3. **API Credentials:**
   - Twenty CRM API token
   - FluentSupport WordPress credentials
   - MySQL database credentials

---

## Security Gaps

### Current Vulnerabilities
1. ❌ **No authentication layer** - anyone with URL can access dashboard
2. ❌ **No authorization** - no role-based access control
3. ❌ **No audit logging** - cannot track who accessed what data
4. ❌ **Exposed API endpoints** - direct database access via REST API
5. ❌ **Session management** - no concept of logged-in users

### Risk Assessment
- **Risk Level:** HIGH
- **Impact:** Data breach exposing financial and client information
- **Likelihood:** HIGH (publicly accessible URL)
- **Mitigation Priority:** IMMEDIATE

---

## Authentication Options Analysis

### Option 1: Traefik BasicAuth Middleware ⭐ **PHASE 1**

#### Overview
HTTP Basic Authentication implemented at the Traefik reverse proxy level using middleware.

#### How It Works
1. Traefik intercepts all requests to protected routes
2. Browser presents login dialog for username/password
3. Credentials sent as Base64-encoded `Authorization` header
4. Traefik validates against `htpasswd` hash
5. If valid, request forwarded to backend; if invalid, 401 Unauthorized

#### Implementation Steps
1. Generate password hash: `htpasswd -nb username password`
2. Add BasicAuth middleware to Traefik labels in `docker-compose.yml`
3. Apply middleware to frontend and backend routes
4. Store credentials in `.env.docker`
5. Restart Docker Compose services

#### Pros
- ✅ **Fast implementation:** 5-10 minutes
- ✅ **Zero code changes:** No frontend or backend modifications
- ✅ **Broad compatibility:** Works in all browsers
- ✅ **Password manager support:** Browser autofill works
- ✅ **Stateless:** No session management needed
- ✅ **HTTPS compatible:** Secure over TLS

#### Cons
- ❌ **Single credential:** Cannot differentiate between users
- ❌ **No user management:** Must regenerate hash to change password
- ❌ **Basic encoding:** Credentials Base64-encoded (not encrypted) - HTTPS required
- ❌ **No session concept:** Cannot implement logout
- ❌ **No granular permissions:** All-or-nothing access

#### Security Level
**Medium** - Adequate for:
- Internal team access (5-10 users)
- Trusted networks
- Development/staging environments
- Short-term protection

**Not suitable for:**
- Public-facing applications
- Compliance requirements (SOC 2, HIPAA)
- Audit logging requirements

#### Configuration Example
```yaml
# docker-compose.yml
labels:
  - "traefik.http.middlewares.billing-auth.basicauth.users=${BASIC_AUTH_USERS}"
  - "traefik.http.routers.billing-overview.middlewares=billing-auth"
```

```bash
# .env.docker
BASIC_AUTH_USERS=admin:$$apr1$$abcd1234$$hashedpassword
```

---

### Option 2: JWT-Based Authentication ⭐ **PHASE 2**

#### Overview
Industry-standard JSON Web Token authentication with per-user accounts, session management, and role-based access control.

#### How It Works
1. User enters credentials in React login form
2. Backend validates against `users` table in MySQL
3. If valid, backend generates JWT token with user ID and role
4. Frontend stores token in localStorage/sessionStorage
5. All API requests include token in `Authorization: Bearer <token>` header
6. Backend middleware validates token on every request
7. Token expires after configured time (e.g., 1 hour)
8. Refresh token used to get new access token without re-login

#### Architecture Components

**Database Layer:**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'viewer', 'editor') DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,
  INDEX idx_email (email)
);
```

**Backend API Endpoints:**
- `POST /api/auth/login` - Authenticate user, return JWT
- `POST /api/auth/logout` - Invalidate refresh token
- `POST /api/auth/refresh` - Get new access token
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/register` - Create new user (admin only)

**Frontend Components:**
- `Login.tsx` - Login form component
- `AuthContext.tsx` - React context for auth state
- `ProtectedRoute.tsx` - HOC for protected pages
- `useAuth.ts` - Custom hook for auth operations

**Middleware:**
- `authMiddleware.js` - Validate JWT on API requests
- `roleMiddleware.js` - Check user role/permissions

#### Implementation Steps

**1. Database Setup (30 minutes)**
- Create `users` table
- Add seed script for initial admin user
- Create migration file

**2. Backend Implementation (1-2 hours)**
- Install dependencies: `jsonwebtoken`, `bcryptjs`
- Create `models/User.js`
- Create `middleware/auth.js`
- Create `routes/auth.js`
- Add JWT secret to environment variables
- Protect existing API routes with middleware

**3. Frontend Implementation (1-2 hours)**
- Create `contexts/AuthContext.tsx`
- Create `components/Login.tsx`
- Update `App.tsx` with protected routing
- Add token refresh logic
- Add logout button to Sidebar
- Handle 401 responses globally

**4. Configuration**
- Add `JWT_SECRET`, `JWT_EXPIRES_IN` to `.env.docker`
- Add `ADMIN_EMAIL`, `ADMIN_PASSWORD` for initial user
- Update CORS settings for credentials

**5. Testing**
- Test login/logout flow
- Test token expiration and refresh
- Test role-based access control
- Test API protection

#### Pros
- ✅ **Per-user accounts:** Individual credentials for each team member
- ✅ **Role-based access:** admin, editor, viewer roles
- ✅ **Session management:** Login/logout functionality
- ✅ **Token expiration:** Automatic security through time-limited tokens
- ✅ **Stateless:** Scales horizontally
- ✅ **Industry standard:** Well-documented patterns
- ✅ **Audit capability:** Can log who accessed what (with additional implementation)
- ✅ **Logout support:** Users can invalidate sessions

#### Cons
- ❌ **Development time:** 2-4 hours initial implementation
- ❌ **Complexity:** More moving parts to maintain
- ❌ **Database changes:** Requires schema migration
- ❌ **Password management:** Need reset password flow
- ❌ **Token storage:** Must handle refresh token securely

#### Security Level
**High** - Suitable for:
- Production environments
- Multi-user applications
- Compliance requirements
- Audit logging needs
- Sensitive financial data

#### Security Best Practices
1. **Password Storage:** bcrypt with salt rounds ≥10
2. **JWT Secret:** Cryptographically random, 256+ bits
3. **Token Expiration:** Access tokens 15-60 minutes, refresh tokens 7 days
4. **HTTPS Only:** Never transmit tokens over HTTP
5. **HttpOnly Cookies:** Store refresh tokens in HttpOnly cookies (alternative to localStorage)
6. **Token Rotation:** Rotate refresh tokens on use
7. **Blacklist:** Implement token revocation for logout

#### Configuration Example
```javascript
// backend/.env
JWT_SECRET=your-256-bit-secret-key-here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
ADMIN_EMAIL=admin@peakonedigital.com
ADMIN_PASSWORD=initial-admin-password
```

---

### Option 3: Traefik + Authelia/Authentik ⭐ **ENTERPRISE**

#### Overview
Dedicated authentication service with advanced features like SSO, MFA, and centralized user management.

#### How It Works
1. Deploy Authelia or Authentik as separate Docker container
2. Configure Traefik ForwardAuth middleware
3. Traefik sends auth request to Authelia before forwarding to app
4. Authelia validates session and user permissions
5. Supports LDAP, Active Directory, OIDC, SAML integrations

#### Architecture
```
Browser → Traefik → Authelia (auth check) → Application
                         ↓
                   Redis (sessions)
                         ↓
                   MySQL (users)
```

#### Implementation Steps
1. Add Authelia/Authentik container to `docker-compose.yml`
2. Add Redis container for session storage
3. Configure Authelia with LDAP or file-based users
4. Add ForwardAuth middleware to Traefik
5. Configure session cookies and domains
6. Setup MFA (TOTP, WebAuthn)
7. Configure access policies per route

#### Pros
- ✅ **Enterprise-grade security:** MFA, 2FA, WebAuthn
- ✅ **Single Sign-On (SSO):** One login for multiple apps
- ✅ **Centralized management:** Manage all users in one place
- ✅ **LDAP/AD integration:** Connect to existing directory
- ✅ **No app changes:** Transparent to application
- ✅ **Audit logging:** Built-in access logs
- ✅ **Session management:** Configurable timeouts
- ✅ **Access policies:** Granular control per route/subdomain

#### Cons
- ❌ **Complex setup:** 4-8 hours initial configuration
- ❌ **Additional infrastructure:** Redis, separate auth container
- ❌ **Requires HTTPS:** Must have valid TLS certificates
- ❌ **Learning curve:** New system to learn and maintain
- ❌ **Resource overhead:** Additional containers and memory

#### Security Level
**Very High** - Required for:
- Enterprise deployments
- Compliance mandates (SOC 2, ISO 27001, HIPAA)
- Multi-application environments
- Organizations with existing LDAP/AD

#### Use Cases
- Large organizations (50+ users)
- Multiple applications needing SSO
- Compliance requirements
- Zero-trust architecture

#### Configuration Example (Authelia)
```yaml
# docker-compose.yml
authelia:
  image: authelia/authelia
  volumes:
    - ./authelia:/config
  environment:
    - TZ=America/New_York
  labels:
    - "traefik.http.middlewares.authelia.forwardauth.address=http://authelia:9091/api/verify?rd=https://auth.example.com"
```

---

### Option 4: OAuth2 with External Provider (Google/GitHub)

#### Overview
Delegate authentication to trusted OAuth2 providers like Google Workspace, GitHub, or Microsoft Azure AD.

#### How It Works
1. User clicks "Login with Google" button
2. Redirected to Google OAuth consent screen
3. User approves access
4. Google redirects back with authorization code
5. Backend exchanges code for access token
6. Backend creates local session/JWT
7. User info retrieved from OAuth provider

#### Implementation Steps
1. Register OAuth application with provider (Google Cloud Console, GitHub Apps)
2. Install OAuth client library: `passport`, `passport-google-oauth20`
3. Create OAuth routes: `/auth/google`, `/auth/google/callback`
4. Store OAuth tokens securely
5. Map OAuth profile to local user
6. Create session/JWT after OAuth success

#### Pros
- ✅ **No password management:** Provider handles credentials
- ✅ **MFA included:** Provider's MFA applies automatically
- ✅ **Corporate account leverage:** Use existing Google/Microsoft accounts
- ✅ **User convenience:** One-click login
- ✅ **Automatic updates:** Profile info synced from provider
- ✅ **Reduced liability:** No plaintext passwords stored

#### Cons
- ❌ **External dependency:** Requires internet access and provider uptime
- ❌ **Privacy concerns:** Provider tracks login activity
- ❌ **Vendor lock-in:** Tied to provider's API changes
- ❌ **Configuration complexity:** OAuth flow setup
- ❌ **Limited control:** Cannot customize auth flow

#### Security Level
**High** - Depends on OAuth provider's security

#### Use Cases
- Teams using Google Workspace or Microsoft 365
- Developer teams with GitHub organization
- Applications requiring social login
- Startups wanting to avoid password management

#### Configuration Example
```javascript
// backend/auth/google.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://velocity.peakonedigital.com/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
  // Find or create user in database
  User.findOrCreate({ email: profile.emails[0].value }, done);
}));
```

---

## Recommended Implementation Plan

### Phase 1: Immediate Protection (Traefik BasicAuth) ⏱️ 5-10 minutes

**Goal:** Secure the application immediately with minimal effort

**Steps:**
1. Generate password hash using htpasswd
2. Add BasicAuth middleware to `docker-compose.yml`
3. Update `.env.docker` with credentials
4. Restart services: `docker-compose --env-file .env.docker up -d`
5. Test login at browser prompt

**Deliverables:**
- ✅ Application protected with username/password
- ✅ Browser login prompt on access
- ✅ Single shared credential for team

**Timeline:** Complete in same day

---

### Phase 2: Production Authentication (JWT) ⏱️ 2-4 hours

**Goal:** Implement production-grade authentication with per-user accounts

**Steps:**
1. **Database (30 min):**
   - Create `users` table schema
   - Add seed script for admin user
   - Run migration

2. **Backend API (1-2 hours):**
   - Install `jsonwebtoken` and `bcryptjs`
   - Create `models/User.js` with password hashing
   - Create `middleware/auth.js` for JWT validation
   - Create `routes/auth.js` with login/logout/refresh
   - Protect existing routes with auth middleware
   - Add JWT secret to environment

3. **Frontend UI (1-2 hours):**
   - Create `contexts/AuthContext.tsx`
   - Create `components/Login.tsx` with form
   - Add protected route wrapper
   - Implement token storage and refresh
   - Add logout to Sidebar
   - Handle 401 responses globally

4. **Testing (30 min):**
   - Test login/logout flow
   - Test token expiration
   - Test API protection
   - Test role-based access

**Deliverables:**
- ✅ Per-user authentication
- ✅ Login/logout functionality
- ✅ Session management with JWT
- ✅ Role-based access control (admin, viewer)
- ✅ Protected API endpoints

**Timeline:** Complete in 1-2 development sessions

---

### Phase 3: Advanced Features (Optional) ⏱️ 4+ hours

**Features to consider:**
1. **Password reset flow** - Email-based password recovery
2. **User management UI** - Admin page to add/edit/delete users
3. **Audit logging** - Track who accessed what data and when
4. **API rate limiting** - Prevent brute force attacks
5. **Session management** - View/revoke active sessions
6. **Two-factor authentication (2FA)** - TOTP-based MFA
7. **SSO integration** - Connect to corporate LDAP/AD

---

## Security Best Practices

### General Principles
1. **Defense in depth:** Multiple layers of security
2. **Least privilege:** Users get minimum necessary permissions
3. **Assume breach:** Design for when (not if) compromise occurs
4. **Audit everything:** Log all authentication events
5. **Keep it simple:** Complexity is the enemy of security

### HTTPS/TLS Requirements
- ✅ **Mandatory for production:** Never use HTTP for authentication
- ✅ **Valid certificates:** Use Let's Encrypt or trusted CA
- ✅ **Modern TLS:** TLS 1.2+ only, disable SSLv3 and TLS 1.0
- ✅ **HSTS headers:** Force HTTPS for all connections

### Password Security (JWT Implementation)
- ✅ **bcrypt hashing:** 10+ salt rounds
- ✅ **Minimum length:** 12+ characters
- ✅ **Complexity requirements:** Mix of letters, numbers, symbols
- ✅ **No common passwords:** Check against known breached password lists
- ✅ **Password history:** Prevent reuse of last 5 passwords

### Token Security (JWT Implementation)
- ✅ **Cryptographic random:** Use `crypto.randomBytes()` for secrets
- ✅ **Short expiration:** 15-60 minutes for access tokens
- ✅ **Refresh tokens:** Longer-lived but revocable
- ✅ **Token rotation:** Issue new refresh token on each use
- ✅ **Blacklist on logout:** Invalidate tokens when user logs out
- ✅ **Secure storage:** HttpOnly cookies preferred over localStorage

### Database Security
- ✅ **Prepared statements:** Prevent SQL injection (already used)
- ✅ **Least privilege:** Database user has minimum necessary permissions
- ✅ **Encrypted connections:** Use TLS for MySQL connections
- ✅ **Regular backups:** Automated daily backups with retention

### API Security
- ✅ **Rate limiting:** Prevent brute force attacks
- ✅ **Input validation:** Validate all user inputs
- ✅ **CORS configuration:** Restrict to known origins
- ✅ **Content Security Policy:** Add CSP headers
- ✅ **X-Frame-Options:** Prevent clickjacking

### Monitoring & Logging
- ✅ **Authentication events:** Log all login attempts (success/failure)
- ✅ **Authorization failures:** Log access denied events
- ✅ **Suspicious activity:** Alert on unusual patterns
- ✅ **Log rotation:** Prevent disk space issues
- ✅ **Secure log storage:** Protect logs from tampering

---

## Testing Checklist

### Phase 1 (BasicAuth) Testing
- [ ] Can access frontend with correct credentials
- [ ] Cannot access frontend without credentials
- [ ] Cannot access API without credentials
- [ ] Browser password manager saves credentials
- [ ] Works in Chrome, Firefox, Safari
- [ ] Works on mobile devices

### Phase 2 (JWT) Testing
- [ ] Can login with valid email/password
- [ ] Cannot login with invalid credentials
- [ ] Token included in API requests automatically
- [ ] API rejects requests without valid token
- [ ] Token expires after configured time
- [ ] Refresh token gets new access token
- [ ] Logout invalidates tokens
- [ ] Can access protected routes when logged in
- [ ] Redirected to login when not authenticated
- [ ] Role-based access works (admin vs viewer)
- [ ] Password reset flow works
- [ ] User management (add/edit/delete) works

### Security Testing
- [ ] HTTPS enforced (no HTTP access)
- [ ] Passwords stored as hashes (not plaintext)
- [ ] Tokens not exposed in logs
- [ ] XSS protection working
- [ ] CSRF protection enabled
- [ ] Rate limiting prevents brute force
- [ ] SQL injection not possible
- [ ] Audit logs recording events

---

## Rollback Plan

### If Phase 1 Fails
1. Remove BasicAuth middleware from `docker-compose.yml`
2. Restart services: `docker-compose --env-file .env.docker up -d`
3. Application accessible without authentication (original state)

### If Phase 2 Fails
1. Revert database migration: `mysql -u root -p thad_chat < db/rollback_users.sql`
2. Revert backend changes: `git revert <commit-hash>`
3. Revert frontend changes: `git revert <commit-hash>`
4. Rebuild containers: `docker-compose build --no-cache`
5. Fall back to Phase 1 (BasicAuth) protection

---

## Maintenance & Operations

### Regular Tasks
- **Weekly:** Review authentication logs for suspicious activity
- **Monthly:** Review user list and deactivate unused accounts
- **Quarterly:** Rotate JWT secrets and force re-login
- **Annually:** Security audit of authentication implementation

### Password Management
- **Forgotten passwords:** Implement self-service reset flow
- **Locked accounts:** Auto-unlock after 30 minutes or admin unlock
- **Password expiration:** Force change every 90 days (optional)

### User Lifecycle
- **Onboarding:** Automated email with login instructions
- **Role changes:** Admin can promote/demote users
- **Offboarding:** Deactivate account immediately, delete after 90 days

---

## Cost Analysis

### Phase 1: Traefik BasicAuth
- **Development time:** 10 minutes
- **Infrastructure cost:** $0 (no additional resources)
- **Maintenance:** Minimal (update password occasionally)
- **Total cost:** ~$0

### Phase 2: JWT Authentication
- **Development time:** 2-4 hours @ $100/hr = $200-400
- **Infrastructure cost:** $0 (uses existing MySQL)
- **Maintenance:** 1 hour/month @ $100/hr = $100/month
- **Total year 1 cost:** $1,400-1,600

### Phase 3: Authelia/Authentik
- **Development time:** 8 hours @ $100/hr = $800
- **Infrastructure cost:** +$5-10/month (Redis container)
- **Maintenance:** 2 hours/month @ $100/hr = $200/month
- **Total year 1 cost:** $3,260-3,520

---

## Compliance Considerations

### GDPR (EU Data Protection)
- **User consent:** Must obtain consent before storing personal data
- **Right to deletion:** Implement user account deletion
- **Data portability:** Allow users to export their data
- **Breach notification:** Must notify within 72 hours

### SOC 2 (Service Organization Control)
- **Access controls:** Role-based access required
- **Audit logging:** Comprehensive logs of all access
- **Password policy:** Enforce strong passwords
- **MFA required:** Two-factor authentication mandatory

### HIPAA (Healthcare Data)
- **PHI protection:** If handling health data, encrypt at rest and in transit
- **Audit trails:** Detailed logs of who accessed what PHI
- **Access controls:** Strict need-to-know basis
- **MFA required:** Multi-factor authentication mandatory

---

## Glossary

- **BasicAuth:** HTTP Basic Authentication - username/password sent in headers
- **JWT:** JSON Web Token - stateless authentication token
- **OAuth2:** Authorization framework for delegating access
- **SSO:** Single Sign-On - one login for multiple applications
- **MFA:** Multi-Factor Authentication - requires 2+ verification methods
- **TOTP:** Time-based One-Time Password - used for 2FA apps
- **bcrypt:** Password hashing algorithm with adaptive cost
- **CORS:** Cross-Origin Resource Sharing - browser security policy
- **CSRF:** Cross-Site Request Forgery - attack exploiting trust
- **XSS:** Cross-Site Scripting - injecting malicious scripts

---

## References

### Documentation
- [Traefik BasicAuth Middleware](https://doc.traefik.io/traefik/middlewares/http/basicauth/)
- [JSON Web Tokens (JWT)](https://jwt.io/introduction)
- [Authelia Documentation](https://www.authelia.com/docs/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

### Libraries Used
- `jsonwebtoken` - JWT generation and verification
- `bcryptjs` - Password hashing
- `passport` - Authentication middleware
- `express-rate-limit` - API rate limiting

---

## Appendix: Code Examples

### A. Traefik BasicAuth Middleware Configuration

```yaml
# docker-compose.yml
services:
  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.billing-overview.rule=Host(`velocity.peakonedigital.com`) && PathPrefix(`/billing-overview`)"
      - "traefik.http.routers.billing-overview.entrypoints=web"

      # BasicAuth Middleware
      - "traefik.http.middlewares.billing-auth.basicauth.users=${BASIC_AUTH_USERS}"
      - "traefik.http.middlewares.billing-auth.basicauth.realm=Billing Dashboard"

      # Apply middleware
      - "traefik.http.routers.billing-overview.middlewares=billing-auth"

  backend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.billing-overview-api.rule=Host(`velocity.peakonedigital.com`) && PathPrefix(`/billing-overview-api`)"
      - "traefik.http.routers.billing-overview-api.entrypoints=web"

      # Apply same middleware
      - "traefik.http.routers.billing-overview-api.middlewares=billing-auth,billing-overview-api-strip"
```

```bash
# .env.docker
# Generate with: htpasswd -nb admin your-password
# Note: Escape $ as $$ in docker-compose
BASIC_AUTH_USERS=admin:$$apr1$$abcd1234$$hashedpasswordhere
```

### B. JWT Middleware Implementation

```javascript
// backend/middleware/auth.js
import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user; // { id, email, role }
    next();
  });
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

### C. Login Endpoint

```javascript
// backend/routes/auth.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // Update last login
    await pool.execute(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});
```

### D. React Auth Context

```typescript
// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('accessToken')
  );

  useEffect(() => {
    if (accessToken) {
      // Fetch user info on mount
      fetchUserInfo();
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    setAccessToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

## Document History

- **Version 1.0** - 2025-10-08 - Initial authentication strategy document
- **Author:** Claude (AI Assistant)
- **Status:** Active
- **Next Review:** After Phase 1 implementation
