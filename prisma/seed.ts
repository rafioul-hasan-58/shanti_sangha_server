import 'dotenv/config';
import {
  PrismaClient,
  Role,
  UserStatus,
  BloodGroup,
  MembershipType,
  AuthProvider,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const superAdminEmail = (
    process.env.SUPER_ADMIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    'rafioulhasan2@gmail.com'
  )
    .toLowerCase()
    .trim();

  const superAdminPassword =
    process.env.SUPER_ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    '12345678';

  const superAdminName =
    process.env.SUPER_ADMIN_NAME || process.env.ADMIN_NAME || 'Sourav Prodhan';

  console.log('🌱 Starting database seed...');
  console.log(`Target Super Admin: ${superAdminEmail} (${superAdminName})`);

  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  const hashedPassword = await bcrypt.hash(superAdminPassword, 12);

  if (existingSuperAdmin) {
    const updated = await prisma.user.update({
      where: { email: superAdminEmail },
      data: {
        fullName: superAdminName,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        membershipType: MembershipType.PERMANENT,
        adminVerified: true,
        emailVerified: true,
      },
    });
    console.log(
      `✅ Super Admin user already exists (${superAdminEmail}). Updated credentials and verified role: ${updated.role}`,
    );
  } else {
    const created = await prisma.user.create({
      data: {
        fullName: superAdminName,
        email: superAdminEmail,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        bloodGroup: BloodGroup.UNKNOWN,
        membershipType: MembershipType.PERMANENT,
        authProvider: AuthProvider.EMAIL,
        emailVerified: true,
        adminVerified: true,
      },
    });
    console.log(
      `✅ Super Admin user created successfully: ${created.email} (Role: ${created.role})`,
    );
  }

  console.log('🌱 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
