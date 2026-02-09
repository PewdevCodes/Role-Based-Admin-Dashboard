// ============================================================================
// Swagger / OpenAPI 3.0 Configuration
// ============================================================================

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'RBAC Admin Dashboard API',
      version: '1.0.0',
      description: `
## Production-Grade Role-Based Admin Dashboard API

Enterprise-level backend system for an Admin Dashboard that enforces strict
authentication, authorization, auditing, and multi-tenancy.

### Key Features
- **Authentication**: JWT access + refresh token architecture with rotation
- **Authorization**: Full RBAC with dynamic roles and atomic permissions
- **Multi-Tenancy**: Organization-scoped data isolation
- **Audit Logging**: Immutable, structured audit trail for all admin actions
- **Feature Flags**: Backend-enforced, role- and org-scoped feature toggles

### Authentication Flow
1. \`POST /auth/login\` → Returns \`accessToken\` + \`refreshToken\`
2. Use \`accessToken\` in \`Authorization: Bearer <token>\` header
3. When access token expires, use \`POST /auth/refresh\` with the refresh token
4. Refresh tokens are rotated on every use (old token is revoked)

### Authorization Model
- **Permissions** are atomic actions (e.g., \`USER_CREATE\`, \`ROLE_UPDATE\`)
- **Roles** are collections of permissions (e.g., ADMIN has [USER_CREATE, USER_READ, ...])
- Users can have multiple roles; permissions are flattened and cached
- Roles can be **global** (system-level) or **organization-specific**
      `,
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from /auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Validation failed' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                      source: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalCount: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Missing or malformed authorization header',
                },
              },
            },
          },
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Forbidden — insufficient permissions',
                },
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Login, register, token refresh, logout',
      },
      {
        name: 'Users',
        description:
          'User management (CRUD, activate/deactivate, assign roles)',
      },
      {
        name: 'Roles',
        description: 'Role management (CRUD, assign permissions)',
      },
      {
        name: 'Permissions',
        description: 'Permission management (global atomic actions)',
      },
      {
        name: 'Organizations',
        description: 'Organization (tenant) management',
      },
      { name: 'Dashboard', description: 'Analytics and metrics' },
      { name: 'Audit Logs', description: 'Immutable audit trail' },
      {
        name: 'Feature Flags',
        description: 'Backend-enforced feature toggles',
      },
    ],
  },
  apis: ['./src/features/**/*.routes.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
