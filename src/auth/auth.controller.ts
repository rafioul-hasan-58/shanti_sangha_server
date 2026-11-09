import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, GoogleLoginDto, RefreshTokenDto } from './dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: 201,
    description:
      'User successfully registered. Returns accessToken, refreshToken and user profile.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 409, description: 'Conflict: Email already in use.' })
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return {
      message: 'Registration successful',
      data,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description:
      'Login successful. Returns accessToken, refreshToken and user profile.',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return {
      message: 'Login successful!',
      data,
    };
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register with Google OAuth / One Tap' })
  @ApiResponse({
    status: 200,
    description:
      'Google login successful. Returns accessToken, refreshToken and user profile.',
  })
  @ApiResponse({ status: 400, description: 'Invalid Google token or payload.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or token verification failed.',
  })
  async googleLogin(@Body() dto: GoogleLoginDto) {
    const data = await this.authService.googleLogin(dto);
    return {
      message: 'Google login successful!',
      data,
    };
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiResponse({
    status: 200,
    description:
      'Token refreshed successfully. Returns new accessToken, refreshToken and user profile.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const data = await this.authService.refreshToken(dto.refreshToken);
    return {
      message: 'Token refreshed successfully!',
      data,
    };
  }
}
