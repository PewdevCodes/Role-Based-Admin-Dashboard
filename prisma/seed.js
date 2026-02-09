// ============================================================================
// Database Seed Script
// ============================================================================
// Creates the initial data required to bootstrap the system:
//   1. All atomic permissions
//   2. System roles (SUPER_ADMIN, ADMIN, MANAGER, USER) — global
//   3. A default organization
//   4. A super-admin user
//   5. Sample feature flags
//
// Run: npx prisma db seed  (or: node prisma/seed.js)
//
// This script is idempotent — safe to run multiple times.
// It uses upsert operations to avoid duplicates.
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// ─── Permission Definitions ─────────────────────────────────────────────────
// Organized by resource for clarity. Each permission is an atomic action.

const PERMISSIONS = [
  // User management
  { action: 'USER_CREATE', resource: 'USER', description: 'Create new users' },
  { action: 'USER_READ', resource: 'USER', description: 'View user details' },
  {
    action: 'USER_UPDATE',
    resource: 'USER',
    description: 'Update user information',
  },
  { action: 'USER_DELETE', resource: 'USER', description: 'Deactivate users' },
  {
    action: 'USER_FORCE_LOGOUT',
    resource: 'USER',
    description: 'Force logout a user from all sessions',
  },

  // Role management
  { action: 'ROLE_CREATE', resource: 'ROLE', description: 'Create new roles' },
  { action: 'ROLE_READ', resource: 'ROLE', description: 'View role details' },
  {
    action: 'ROLE_UPDATE',
    resource: 'ROLE',
    description: 'Update role information',
  },
  { action: 'ROLE_DELETE', resource: 'ROLE', description: 'Delete roles' },
  {
    action: 'ROLE_ASSIGN',
    resource: 'ROLE',
    description: 'Assign roles to users',
  },

  // Permission management
  {
    action: 'PERMISSION_CREATE',
    resource: 'PERMISSION',
    description: 'Create new permissions',
  },
  {
    action: 'PERMISSION_READ',
    resource: 'PERMISSION',
    description: 'View permissions',
  },
  {
    action: 'PERMISSION_UPDATE',
    resource: 'PERMISSION',
    description: 'Update permissions',
  },
  {
    action: 'PERMISSION_ASSIGN',
    resource: 'PERMISSION',
    description: 'Assign permissions to roles',
  },

  // Organization management
  {
    action: 'ORG_CREATE',
    resource: 'ORGANIZATION',
    description: 'Create organizations',
  },
  {
    action: 'ORG_READ',
    resource: 'ORGANIZATION',
    description: 'View organization details',
  },
  {
    action: 'ORG_UPDATE',
    resource: 'ORGANIZATION',
    description: 'Update organization settings',
  },

  // Dashboard
  {
    action: 'DASHBOARD_READ',
    resource: 'DASHBOARD',
    description: 'View dashboard analytics',
  },

  // Audit logs
  { action: 'AUDIT_READ', resource: 'AUDIT', description: 'View audit logs' },

  // Feature flags
  {
    action: 'FEATURE_FLAG_READ',
    resource: 'FEATURE_FLAG',
    description: 'View feature flags',
  },
  {
    action: 'FEATURE_FLAG_MANAGE',
    resource: 'FEATURE_FLAG',
    description: 'Create/update feature flags',
  },
];

// ─── Role Definitions ───────────────────────────────────────────────────────
// System roles with their permission sets. These are global (no organizationId).

const ROLES = {
  SUPER_ADMIN: {
    description: 'Full system access — all permissions',
    isSystem: true,
    permissions: PERMISSIONS.map((p) => p.action), // ALL permissions
  },
  ADMIN: {
    description:
      'Organization administrator — manages users, roles, and settings',
    isSystem: true,
    permissions: [
      'USER_CREATE',
      'USER_READ',
      'USER_UPDATE',
      'USER_DELETE',
      'USER_FORCE_LOGOUT',
      'ROLE_CREATE',
      'ROLE_READ',
      'ROLE_UPDATE',
      'ROLE_DELETE',
      'ROLE_ASSIGN',
      'PERMISSION_READ',
      'PERMISSION_ASSIGN',
      'ORG_READ',
      'ORG_UPDATE',
      'DASHBOARD_READ',
      'AUDIT_READ',
      'FEATURE_FLAG_READ',
      'FEATURE_FLAG_MANAGE',
    ],
  },
  MANAGER: {
    description:
      'Team manager — can view users and roles, limited write access',
    isSystem: true,
    permissions: [
      'USER_CREATE',
      'USER_READ',
      'USER_UPDATE',
      'ROLE_READ',
      'ROLE_ASSIGN',
      'PERMISSION_READ',
      'DASHBOARD_READ',
      'AUDIT_READ',
      'FEATURE_FLAG_READ',
    ],
  },
  USER: {
    description: 'Standard user — read-only access to own profile',
    isSystem: true,
    permissions: ['USER_READ', 'DASHBOARD_READ', 'FEATURE_FLAG_READ'],
  },
};

async function seed() {
  console.log('🌱 Seeding database...\n');

  // ── 1. Create Permissions ──────────────────────────────────────────
  console.log('  Creating permissions...');
  const permissionMap = {};

  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { action: perm.action },
      update: { description: perm.description, resource: perm.resource },
      create: perm,
    });
    permissionMap[perm.action] = created.id;
  }
  console.log(`  ✅ ${PERMISSIONS.length} permissions created/updated\n`);

  // ── 2. Create Roles ────────────────────────────────────────────────
  console.log('  Creating roles...');

  const roleMap = {};
  for (const [roleName, roleDef] of Object.entries(ROLES)) {
    // Global roles have organizationId = null, which can't be used in compound unique upsert
    let role = await prisma.role.findFirst({
      where: { name: roleName, organizationId: null },
    });
    if (role) {
      role = await prisma.role.update({
        where: { id: role.id },
        data: { description: roleDef.description },
      });
    } else {
      role = await prisma.role.create({
        data: {
          name: roleName,
          description: roleDef.description,
          isSystem: roleDef.isSystem,
          organizationId: null,
        },
      });
    }
    roleMap[roleName] = role.id;

    // Assign permissions to role
    for (const permAction of roleDef.permissions) {
      const permId = permissionMap[permAction];
      if (!permId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permId },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permId,
        },
      });
    }
  }
  console.log(
    `  ✅ ${Object.keys(ROLES).length} roles created with permissions\n`,
  );

  // ── 3. Create Default Organization ─────────────────────────────────
  console.log('  Creating default organization...');

  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      description: 'Default organization for development and testing',
    },
  });
  console.log(
    `  ✅ Organization "${defaultOrg.name}" created (slug: ${defaultOrg.slug})\n`,
  );

  // ── 4. Create Super Admin User ─────────────────────────────────────
  console.log('  Creating super admin user...');

  const passwordHash = await bcrypt.hash('Admin@123', 12);

  const superAdmin = await prisma.user.upsert({
    where: {
      email_organizationId: {
        email: 'admin@acme.com',
        organizationId: defaultOrg.id,
      },
    },
    update: {},
    create: {
      email: 'admin@acme.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      emailVerified: true,
      organizationId: defaultOrg.id,
    },
  });

  // Assign SUPER_ADMIN role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: superAdmin.id, roleId: roleMap.SUPER_ADMIN },
    },
    update: {},
    create: {
      userId: superAdmin.id,
      roleId: roleMap.SUPER_ADMIN,
    },
  });
  console.log(`  ✅ Super admin created: admin@acme.com / Admin@123\n`);

  // ── 5. Create Sample Users ─────────────────────────────────────────
  console.log('  Creating sample users...');

  const sampleUsers = [
    {
      email: 'manager@acme.com',
      firstName: 'Jane',
      lastName: 'Manager',
      role: 'MANAGER',
    },
    {
      email: 'user@acme.com',
      firstName: 'John',
      lastName: 'User',
      role: 'USER',
    },
    {
      email: 'admin2@acme.com',
      firstName: 'Bob',
      lastName: 'Admin',
      role: 'ADMIN',
    },
  ];

  for (const u of sampleUsers) {
    const user = await prisma.user.upsert({
      where: {
        email_organizationId: { email: u.email, organizationId: defaultOrg.id },
      },
      update: {},
      create: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        emailVerified: true,
        organizationId: defaultOrg.id,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: user.id, roleId: roleMap[u.role] },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: roleMap[u.role],
      },
    });
    console.log(`  ✅ ${u.email} (${u.role})`);
  }

  // ── 6. Create Sample Feature Flags ─────────────────────────────────
  console.log('\n  Creating feature flags...');

  const featureFlags = [
    {
      key: 'ADVANCED_ANALYTICS',
      description: 'Access to advanced dashboard analytics',
      isEnabled: true,
      roleId: roleMap.ADMIN,
      organizationId: null,
    },
    {
      key: 'EXPORT_DATA',
      description: 'Ability to export data as CSV/PDF',
      isEnabled: true,
      roleId: roleMap.MANAGER,
      organizationId: null,
    },
    {
      key: 'BULK_USER_IMPORT',
      description: 'Bulk user import via CSV',
      isEnabled: false,
      roleId: null,
      organizationId: defaultOrg.id,
    },
  ];

  for (const flag of featureFlags) {
    // Compound unique with nullable fields can't use null in upsert where
    const existing = await prisma.featureFlag.findFirst({
      where: {
        key: flag.key,
        roleId: flag.roleId,
        organizationId: flag.organizationId,
      },
    });
    if (existing) {
      await prisma.featureFlag.update({
        where: { id: existing.id },
        data: { isEnabled: flag.isEnabled },
      });
    } else {
      await prisma.featureFlag.create({ data: flag });
    }
    console.log(`  ✅ ${flag.key} (enabled: ${flag.isEnabled})`);
  }

  // ── 7. Create a Second Organization (Multi-tenancy demo) ───────────
  console.log('\n  Creating second organization for multi-tenancy demo...');

  const secondOrg = await prisma.organization.upsert({
    where: { slug: 'startup-inc' },
    update: {},
    create: {
      name: 'Startup Inc.',
      slug: 'startup-inc',
      description: 'Second organization for multi-tenancy testing',
    },
  });

  const startupAdmin = await prisma.user.upsert({
    where: {
      email_organizationId: {
        email: 'admin@startup.com',
        organizationId: secondOrg.id,
      },
    },
    update: {},
    create: {
      email: 'admin@startup.com',
      passwordHash,
      firstName: 'Startup',
      lastName: 'Admin',
      emailVerified: true,
      organizationId: secondOrg.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: startupAdmin.id, roleId: roleMap.ADMIN },
    },
    update: {},
    create: {
      userId: startupAdmin.id,
      roleId: roleMap.ADMIN,
    },
  });
  console.log(
    `  ✅ "${secondOrg.name}" created with admin: admin@startup.com\n`,
  );

  console.log('════════════════════════════════════════════════════════');
  console.log('  🎉 Seed complete!');
  console.log('');
  console.log('  Default credentials:');
  console.log('  ─────────────────────────────────────────────────────');
  console.log('  Super Admin: admin@acme.com    / Admin@123  (org: acme-corp)');
  console.log('  Admin:       admin2@acme.com   / Admin@123  (org: acme-corp)');
  console.log('  Manager:     manager@acme.com  / Admin@123  (org: acme-corp)');
  console.log('  User:        user@acme.com     / Admin@123  (org: acme-corp)');
  console.log(
    '  Startup:     admin@startup.com / Admin@123  (org: startup-inc)',
  );
  console.log('════════════════════════════════════════════════════════');
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
