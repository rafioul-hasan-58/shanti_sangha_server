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
  const adminEmail = (
    process.env.ADMIN_EMAIL || 'admin@shantisangha.com'
  ).toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const adminFullName = process.env.ADMIN_NAME || 'Super Admin';

  console.log('🌱 Starting database seed...');
  console.log(`Checking admin user: ${adminEmail}`);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  if (existingAdmin) {
    const updated = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        fullName: adminFullName,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        adminVerified: existingAdmin.adminVerified || new Date(),
        emailVerified: existingAdmin.emailVerified || new Date(),
      },
    });
    console.log(
      `✅ Admin user already exists (${adminEmail}). Updated credentials and verified role: ${updated.role}`,
    );
  } else {
    const created = await prisma.user.create({
      data: {
        fullName: adminFullName,
        email: adminEmail,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        bloodGroup: BloodGroup.UNKNOWN,
        MembershipType: MembershipType.PERMANENT,
        authProvider: AuthProvider.EMAIL,
        emailVerified: new Date(),
        adminVerified: new Date(),
      },
    });
    console.log(
      `✅ Admin user created successfully: ${created.email} (Role: ${created.role})`,
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

