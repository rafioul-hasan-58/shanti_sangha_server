import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { AuthGuard, JwtPayload } from './auth.guard';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../../core/constants';

interface MockRequest {
  headers: Record<string, string>;
  user?: JwtPayload;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    };
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new AuthGuard(
      jwtService as unknown as JwtService,
      reflector as unknown as Reflector,
    );
  });

  function createMockExecutionContext(headers: Record<string, string> = {}): {
    context: ExecutionContext;
    request: MockRequest;
  } {
    const request: MockRequest = {
      headers,
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  it('should allow access without token when endpoint is marked @Public', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return true;
      return undefined;
    });

    const { context } = createMockExecutionContext();
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when no authorization header is present on protected route', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const { context } = createMockExecutionContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when authorization header is not Bearer', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const { context } = createMockExecutionContext({
      authorization: 'Basic 123456',
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when token verification fails', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

    const { context } = createMockExecutionContext({
      authorization: 'Bearer bad_token',
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should allow access when token is valid and no roles are required', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const mockPayload: JwtPayload = {
      id: 'u1',
      email: 'test@example.com',
      role: Role.USER,
    };
    jwtService.verifyAsync.mockResolvedValue(mockPayload);

    const { context, request } = createMockExecutionContext({
      authorization: 'Bearer valid_token',
    });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual(mockPayload);
  });

  it('should allow access when user has the required role', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return [Role.ADMIN, Role.SUPER_ADMIN];
      return undefined;
    });

    const mockPayload: JwtPayload = {
      id: 'u2',
      email: 'admin@example.com',
      role: Role.ADMIN,
    };
    jwtService.verifyAsync.mockResolvedValue(mockPayload);

    const { context } = createMockExecutionContext({
      authorization: 'Bearer valid_admin_token',
    });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user does not have the required role', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return [Role.ADMIN, Role.SUPER_ADMIN];
      return undefined;
    });

    const mockPayload: JwtPayload = {
      id: 'u3',
      email: 'user@example.com',
      role: Role.USER,
    };
    jwtService.verifyAsync.mockResolvedValue(mockPayload);

    const { context } = createMockExecutionContext({
      authorization: 'Bearer valid_user_token',
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
