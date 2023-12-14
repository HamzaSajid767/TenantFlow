import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import * as argon2 from 'argon2';
import { config as loadEnv } from 'dotenv';
import { createPrismaClient } from '../src';

loadEnv({ path: resolve(__dirname, '../../../.env') });

const DEV_PASSWORD = 'Supersecret1';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }
  const prisma = createPrismaClient(url);
  const passwordHash = await argon2.hash(DEV_PASSWORD, { type: argon2.argon2id });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@saasforge.local' },
    update: { passwordHash },
    create: { email: 'owner@saasforge.local', name: 'Ada Owner', passwordHash },
  });
  const admin = await prisma.user.upsert({
    where: { email: 'admin@saasforge.local' },
    update: { passwordHash },
    create: { email: 'admin@saasforge.local', name: 'Sam Admin', passwordHash },
  });
  const developer = await prisma.user.upsert({
    where: { email: 'developer@saasforge.local' },
    update: { passwordHash },
    create: { email: 'developer@saasforge.local', name: 'Dev Developer', passwordHash },
  });

  const slug = `acme-${createHash('sha256').update('saasforge-dev-org').digest('hex').slice(0, 6)}`;
  let organization = await prisma.organization.findUnique({ where: { slug } });
  if (!organization) {
    organization = await prisma.organization.create({
      data: { name: 'Acme Platform', slug },
    });
  }

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: owner.id, organizationId: organization.id } },
    update: { role: 'OWNER' },
    create: { userId: owner.id, organizationId: organization.id, role: 'OWNER' },
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: organization.id } },
    update: { role: 'ADMIN' },
    create: { userId: admin.id, organizationId: organization.id, role: 'ADMIN' },
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: developer.id, organizationId: organization.id } },
    update: { role: 'DEVELOPER' },
    create: { userId: developer.id, organizationId: organization.id, role: 'DEVELOPER' },
  });

  const existingProject = await prisma.project.findFirst({
    where: { organizationId: organization.id, name: 'Production' },
  });
  if (!existingProject) {
    await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Production',
        description: 'Primary API project for local development',
      },
    });
  }

  await prisma.$disconnect();
  console.log('Development seed complete (not for production).');
  console.log('  owner@saasforge.local / Supersecret1  (OWNER)');
  console.log('  admin@saasforge.local / Supersecret1  (ADMIN)');
  console.log('  developer@saasforge.local / Supersecret1  (DEVELOPER)');
  console.log(`  organization: ${organization.name} (${organization.id})`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
