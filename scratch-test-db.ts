import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  console.log('Testing connection to:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@') : 'UNDEFINED');
  try {
    console.log('Attempting prisma.$connect()...');
    const start = Date.now();
    await prisma.$connect();
    console.log(`Connected successfully in ${Date.now() - start}ms!`);

    const count = await prisma.user.count();
    console.log(`User count in database: ${count}`);

    const users = await prisma.user.findMany({ take: 3 });
    console.log('Sample users:', users);
  } catch (error: any) {
    console.error('Connection failed! Full error details:');
    console.error('Name:', error.name);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    if (error.meta) {
      console.error('Meta:', error.meta);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

