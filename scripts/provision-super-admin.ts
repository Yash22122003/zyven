import { prisma } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';
import { UserRole } from '@prisma/client';

/**
 * Super Admin Provisioning Script
 * 
 * Usage:
 *   SUPER_ADMIN_EMAIL="admin@domain.com" SUPER_ADMIN_PASSWORD="securePassword" npx tsx scripts/provision-super-admin.ts
 * 
 * Or pass as CLI flags:
 *   npx tsx scripts/provision-super-admin.ts --email=admin@domain.com --password=securePassword --name="Super Admin"
 */
async function main() {
  const args = process.argv.slice(2);
  const argMap: Record<string, string> = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (key && value) argMap[key] = value;
    }
  }

  const email = (process.env.SUPER_ADMIN_EMAIL || argMap.email || '').trim().toLowerCase();
  const password = (process.env.SUPER_ADMIN_PASSWORD || argMap.password || '').trim();
  const fullName = (process.env.SUPER_ADMIN_NAME || argMap.name || 'ZYVEN Platform Operator').trim();
  const phone = (process.env.SUPER_ADMIN_PHONE || argMap.phone || '+919999000001').trim();

  if (!email || !password) {
    console.error('❌ Error: Super Admin email and password are required.');
    console.error('Provide them via env vars (SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD) or CLI flags (--email=..., --password=...)');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  console.log(`🔒 Provisioning Super Admin: ${email}...`);

  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phone }],
    },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        email,
        phone,
        fullName,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      },
    });

    console.log(`✅ Super Admin account updated successfully! (User ID: ${updated.id})`);
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        phone,
        fullName,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      },
    });

    console.log(`✅ Super Admin account created successfully! (User ID: ${created.id})`);
  }
}

main()
  .catch((err) => {
    console.error('❌ Provisioning failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
