import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../../core/constants';

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // 1. Authenticate (Verify JWT token)
    const payload = await this.authenticate(request);
    request['user'] = payload;

    // 2. Authorize (Check role-based permissions)
    const isAuthorized = this.authorize(context, payload.role);
    if (!isAuthorized) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }

  private async authenticate(request: Request): Promise<JwtPayload> {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('You are not authorized');
    }

    const [type, token] = authHeader.split(/\s+/);

    if (type.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('You are not authorized');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private authorize(context: ExecutionContext, userRole: Role): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    return requiredRoles.includes(userRole);
  }
}
