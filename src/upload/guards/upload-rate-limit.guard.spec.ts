import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { UploadRateLimitGuard } from './upload-rate-limit.guard';

describe('UploadRateLimitGuard', () => {
  let guard: UploadRateLimitGuard;

  beforeEach(() => {
    guard = new UploadRateLimitGuard();
  });

  function createMockContext(
    userId?: string,
    ip = '127.0.0.1',
  ): ExecutionContext {
    const request = {
      user: userId
        ? { id: userId, email: 'test@example.com', role: 'ADMIN' }
        : undefined,
      ip,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow first upload request', () => {
    const context = createMockContext('user_1');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow up to 20 uploads within 1 minute', () => {
    const context = createMockContext('user_1');
    for (let i = 0; i < 20; i++) {
      expect(guard.canActivate(context)).toBe(true);
    }
  });

  it('should throw HttpException 429 when upload count exceeds 20 within 1 minute', () => {
    const context = createMockContext('user_2');
    for (let i = 0; i < 20; i++) {
      guard.canActivate(context);
    }

    try {
      guard.canActivate(context);
      fail('Should have thrown 429 HttpException');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });
});
