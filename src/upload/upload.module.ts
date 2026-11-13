import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { UploadRateLimitGuard } from './guards/upload-rate-limit.guard';

@Module({
  imports: [CloudinaryModule],
  controllers: [UploadController],
  providers: [UploadService, UploadRateLimitGuard],
  exports: [UploadService],
})
export class UploadModule {}
