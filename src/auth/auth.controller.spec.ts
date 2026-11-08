import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    googleLogin: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue({
        accessToken: 'mock_jwt_token',
        user: { id: '1', email: 'test@example.com' },
      }),
      login: jest.fn().mockResolvedValue({
        accessToken: 'mock_jwt_token',
        user: { id: '1', email: 'test@example.com' },
      }),
      googleLogin: jest.fn().mockResolvedValue({
        accessToken: 'mock_jwt_token',
        user: { id: '1', email: 'test@example.com' },
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

  it('should call authService.register on register', async () => {
    const dto = {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };
    const res = await controller.register(dto);
    expect(authService.register).toHaveBeenCalledWith(dto);
    expect(res.message).toBe('Registration successful');
    expect(res.data.accessToken).toBe('mock_jwt_token');
  });

  it('should call authService.login on login', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'password123',
    };
    const res = await controller.login(dto);
    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(res.message).toBe('Login successful!');
    expect(res.data.accessToken).toBe('mock_jwt_token');
  });

  it('should call authService.googleLogin on google', async () => {
    const dto = {
      email: 'test@example.com',
      fullName: 'Test User',
    };
    const res = await controller.googleLogin(dto);
    expect(authService.googleLogin).toHaveBeenCalledWith(dto);
    expect(res.message).toBe('Google login successful!');
    expect(res.data.accessToken).toBe('mock_jwt_token');
  });
});
