import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    googleLogin: jest.Mock;
    refreshToken: jest.Mock;
    forgotPassword: jest.Mock;
    verifyOtp: jest.Mock;
    resetPassword: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      }),
      login: jest.fn().mockResolvedValue({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      }),
      googleLogin: jest.fn().mockResolvedValue({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      }),
      refreshToken: jest.fn().mockResolvedValue({
        accessToken: 'mock_new_access_token',
        refreshToken: 'mock_new_refresh_token',
        user: { id: '1', email: 'test@example.com' },
      }),
      forgotPassword: jest.fn().mockResolvedValue({
        email: 'test@example.com',
        expiresInMinutes: 10,
      }),
      verifyOtp: jest.fn().mockResolvedValue({
        email: 'test@example.com',
        verified: true,
      }),
      resetPassword: jest.fn().mockResolvedValue({
        email: 'test@example.com',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call authService.register on register and return accessToken & refreshToken', async () => {
    const dto = {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };
    const res = await controller.register(dto);
    expect(authService.register).toHaveBeenCalledWith(dto);
    expect(res.message).toBe('Registration successful');
    expect(res.data.accessToken).toBe('mock_access_token');
    expect(res.data.refreshToken).toBe('mock_refresh_token');
  });

  it('should call authService.login on login and return accessToken & refreshToken', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'password123',
    };
    const res = await controller.login(dto);
    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(res.message).toBe('Login successful!');
    expect(res.data.accessToken).toBe('mock_access_token');
    expect(res.data.refreshToken).toBe('mock_refresh_token');
  });

  it('should call authService.googleLogin on google and return accessToken & refreshToken', async () => {
    const dto = {
      token: 'mock_google_jwt_token',
    };
    const res = await controller.googleLogin(dto);
    expect(authService.googleLogin).toHaveBeenCalledWith(dto);
    expect(res.message).toBe('Google login successful!');
    expect(res.data.accessToken).toBe('mock_access_token');
    expect(res.data.refreshToken).toBe('mock_refresh_token');
  });

  it('should call authService.refreshToken on refresh-token', async () => {
    const dto = {
      refreshToken: 'mock_refresh_token',
    };
    const res = await controller.refreshToken(dto);
    expect(authService.refreshToken).toHaveBeenCalledWith(dto.refreshToken);
    expect(res.message).toBe('Token refreshed successfully!');
    expect(res.data.accessToken).toBe('mock_new_access_token');
    expect(res.data.refreshToken).toBe('mock_new_refresh_token');
  });

  it('should call authService.forgotPassword on forgot-password', async () => {
    const dto = { email: 'test@example.com' };
    const res = await controller.forgotPassword(dto);
    expect(authService.forgotPassword).toHaveBeenCalledWith(dto);
    expect(res.message).toBe('OTP sent to your email successfully');
    expect(res.data.expiresInMinutes).toBe(10);
  });

  it('should call authService.verifyOtp on verify-otp', async () => {
    const dto = { email: 'test@example.com', otp: '123456' };
    const res = await controller.verifyOtp(dto);
    expect(authService.verifyOtp).toHaveBeenCalledWith(dto);
    expect(res.message).toBe('OTP verified successfully');
    expect(res.data.verified).toBe(true);
  });

  it('should call authService.resetPassword on reset-password', async () => {
    const dto = { email: 'test@example.com', newPassword: 'newPassword123' };
    const res = await controller.resetPassword(dto);
    expect(authService.resetPassword).toHaveBeenCalledWith(dto);
    expect(res.message).toBe('Password reset successfully');
    expect(res.data.email).toBe('test@example.com');
  });
});
