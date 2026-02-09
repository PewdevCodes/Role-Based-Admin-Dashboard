# RBAC Admin Dashboard API

Production-grade Role-Based Admin Dashboard API with multi-tenancy, built on Node.js, Express, PostgreSQL, Prisma, Redis, and JWT.

## Architecture Overview

```
src/
├── config/              # Centralized configuration
│   ├── index.js         # Environment variables (fail-fast validation)
│   ├── database.js      # Prisma client singleton
│   ├── redis.js         # Redis client + cache helpers
│   ├── logger.js        # Pino structured logger
│   └── swagger.js       # OpenAPI 3.0 spec
├── middleware/           # Reusable, composable middleware
│   ├── authenticate.js  # JWT verification → req.user
│   ├── authorize.js     # Permission-based RBAC → checks Redis cache
│   ├── resolveTenant.js # Tenant context → req.tenant
│   ├── auditLog.js      # Automatic audit trail (fire-and-forget)
│   ├── correlationId.js # Request tracing
│   ├── rateLimiter.js   # API + auth rate limits
│   └── errorHandler.js  # Global error handler
├── features/            # Feature-based modules
│   ├── auth/            # Login, register, refresh, logout
│   ├── users/           # User CRUD + role assignment
│   ├── roles/           # Role CRUD + permission assignment
│   ├── permissions/     # Permission CRUD (global)
│   ├── organizations/   # Organization (tenant) management
│   ├── dashboard/       # Analytics & metrics (Redis-cached)
│   ├── audit/           # Immutable audit log queries
│   └── feature-flags/   # Backend-enforced feature toggles
├── utils/               # Shared utilities
│   ├── errors.js        # Custom error hierarchy
│   ├── response.js      # Standardized response envelope
│   ├── validate.js      # Zod validation middleware factory
│   └── helpers.js       # Pagination, sorting, pick, etc.
├── app.js               # Express bootstrap (middleware + routes)
└── server.js            # HTTP server + graceful shutdown
```

## Key Design Decisions

### Middleware Chain Order

Every protected route follows this middleware chain:

```
authenticate → resolveTenant → authorize → auditLog → controller
```

1. **authenticate** — Verifies JWT, sets `req.user`
2. **resolveTenant** — Validates organization, sets `req.tenant`
3. **authorize** — Checks Redis-cached permissions
4. **auditLog** — Records action on response finish (non-blocking)
5. **controller** — Thin HTTP layer, delegates to service

### Separation of Concerns

- **Controllers** — Parse HTTP, call service, format response. Zero business logic.
- **Services** — Business rules, orchestration, cache invalidation.
- **Repositories** — Prisma queries, tenant-scoping, eager loading decisions.

### Multi-Tenancy

- Users belong to exactly one organization
- `organizationId` in JWT prevents tenant-spoofing
- All DB queries are tenant-scoped (enforced in repositories)
- Roles can be global (`organizationId = null`) or org-specific
- Same email can exist across different orgs

### RBAC Model

- **Permissions** are atomic actions: `USER_CREATE`, `ROLE_UPDATE`, etc.
- **Roles** are collections of permissions (many-to-many via junction table)
- Users can have multiple roles (many-to-many)
- Permission check: flatten all user→roles→permissions, check against required
- Permissions cached in Redis with 5-minute TTL

### Token Architecture

- **Access token** (15m) — Stateless JWT, contains userId + orgId
- **Refresh token** (7d) — Stored in DB, supports rotation
- **Token rotation** — Each refresh issues a new token, revokes the old one
- **Replay detection** — Reusing a revoked refresh token revokes the entire family
- **Forced logout** — Revoke all refresh tokens + blacklist access token in Redis

## Prerequisites

- Node.js >= 20.0.0
- PostgreSQL >= 14
- Redis >= 6

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database and Redis credentials

# 3. Generate Prisma client
npx prisma generate

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Seed the database
npx prisma db seed

# 6. Start the server
npm run dev
```

## Seed Data

| Email             | Password  | Role        | Organization |
| ----------------- | --------- | ----------- | ------------ |
| admin@acme.com    | Admin@123 | SUPER_ADMIN | acme-corp    |
| admin2@acme.com   | Admin@123 | ADMIN       | acme-corp    |
| manager@acme.com  | Admin@123 | MANAGER     | acme-corp    |
| user@acme.com     | Admin@123 | USER        | acme-corp    |
| admin@startup.com | Admin@123 | ADMIN       | startup-inc  |

## API Documentation

Swagger UI available at: `http://localhost:3000/api-docs`

OpenAPI spec: `http://localhost:3000/api-docs.json`

## Example Workflows

### 1. Login & Get Dashboard Metrics

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Admin@123","organizationSlug":"acme-corp"}'

# Use the accessToken from the response
curl http://localhost:3000/api/v1/dashboard/metrics \
  -H "Authorization: Bearer <accessToken>"
```

### 2. Create a User & Assign Roles

```bash
# Create user
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"email":"new.user@acme.com","password":"NewUser@123","firstName":"New","lastName":"User"}'

# Assign roles
curl -X PUT http://localhost:3000/api/v1/users/<userId>/roles \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"roleIds":["<roleId>"]}'
```

### 3. Create a Custom Role with Permissions

```bash
# Create role
curl -X POST http://localhost:3000/api/v1/roles \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"CUSTOM_ANALYST","description":"Can view data but not modify"}'

# Get available permissions
curl http://localhost:3000/api/v1/permissions \
  -H "Authorization: Bearer <accessToken>"

# Assign permissions to role
curl -X PUT http://localhost:3000/api/v1/roles/<roleId>/permissions \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"permissionIds":["<permId1>","<permId2>"]}'
```

### 4. Refresh Token Flow

```bash
# When access token expires, use refresh token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

### 5. View Audit Logs

```bash
curl "http://localhost:3000/api/v1/audit-logs?action=USER_CREATED&page=1&limit=10" \
  -H "Authorization: Bearer <accessToken>"
```

## Permissions Reference

| Permission          | Resource     | Description                  |
| ------------------- | ------------ | ---------------------------- |
| USER_CREATE         | USER         | Create new users             |
| USER_READ           | USER         | View user details            |
| USER_UPDATE         | USER         | Update user information      |
| USER_DELETE         | USER         | Deactivate users             |
| USER_FORCE_LOGOUT   | USER         | Force logout a user          |
| ROLE_CREATE         | ROLE         | Create new roles             |
| ROLE_READ           | ROLE         | View role details            |
| ROLE_UPDATE         | ROLE         | Update role information      |
| ROLE_DELETE         | ROLE         | Delete roles                 |
| ROLE_ASSIGN         | ROLE         | Assign roles to users        |
| PERMISSION_CREATE   | PERMISSION   | Create new permissions       |
| PERMISSION_READ     | PERMISSION   | View permissions             |
| PERMISSION_UPDATE   | PERMISSION   | Update permissions           |
| PERMISSION_ASSIGN   | PERMISSION   | Assign permissions to roles  |
| ORG_CREATE          | ORGANIZATION | Create organizations         |
| ORG_READ            | ORGANIZATION | View organization details    |
| ORG_UPDATE          | ORGANIZATION | Update organization settings |
| DASHBOARD_READ      | DASHBOARD    | View dashboard analytics     |
| AUDIT_READ          | AUDIT        | View audit logs              |
| FEATURE_FLAG_READ   | FEATURE_FLAG | View feature flags           |
| FEATURE_FLAG_MANAGE | FEATURE_FLAG | Create/update feature flags  |
