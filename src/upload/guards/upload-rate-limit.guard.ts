import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../../common/guards/auth.guard';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class UploadRateLimitGuard implements CanActivate {
  private readonly clients = new Map<string, RateLimitRecord>();
  private readonly maxUploads = 20;
  private readonly windowMs = 60 * 1000; // 1 minute

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'] as JwtPayload | undefined;
    const key = user?.id || request.ip || 'anonymous';
    const now = Date.now();

    const record = this.clients.get(key);

    if (!record || now > record.resetTime) {
      this.clients.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (record.count >= this.maxUploads) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      throw new HttpException(
        {
          message: `Too many upload requests. Please try again after ${retryAfterSeconds} seconds.`,
          retryAfter: retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }
}
