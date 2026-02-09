// ============================================================================
// Organization Service
// ============================================================================

const prisma = require('../../config/database');
const { NotFoundError, ConflictError } = require('../../utils/errors');
const { pick } = require('../../utils/helpers');

class OrganizationService {
  async listOrganizations() {
    return prisma.organization.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        createdAt: true,
        _count: { select: { users: true, roles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getOrganizationById(id) {
    const org = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { users: true, roles: true } },
      },
    });
    if (!org) throw new NotFoundError('Organization');
    return org;
  }

  async createOrganization(data) {
    const existing = await prisma.organization.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      throw new ConflictError(
        `Organization with slug "${data.slug}" already exists`,
      );
    }

    return prisma.organization.create({
      data: pick(data, ['name', 'slug', 'description']),
    });
  }

  async updateOrganization(id, data) {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundError('Organization');

    return prisma.organization.update({
      where: { id },
      data: pick(data, ['name', 'description', 'isActive']),
    });
  }
}

module.exports = new OrganizationService();
