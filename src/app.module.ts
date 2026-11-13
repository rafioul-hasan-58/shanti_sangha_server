import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { ConfigModule } from '@nestjs/config';
import { validateConfig } from './config/env.schema';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './modules/users';
import { MembersModule } from './modules/members';
import { HealthModule } from './health/health.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    MembersModule,
    HealthModule,
    CloudinaryModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
