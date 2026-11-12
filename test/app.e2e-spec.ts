import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  // Set timeout for database connections in test environments
  jest.setTimeout(30000);

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  it('/api/v1 (GET) - Hello Endpoint', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect((res: request.Response) => {
        const body = res.body as Record<string, any>;
        expect(body.success).toBe(true);
        expect(body.statusCode).toBe(200);
        expect(body.message).toBe('Fetched Successfully!');
        expect(body.timestamp).toBeDefined();
        expect(
          typeof body.data === 'string' && body.data.includes('Hello World!'),
        ).toBe(true);
      });
  });

  it('Full Authentication Flow: Register -> Login -> Protected Route -> Health Check', async () => {
    const randomSuffix = Math.floor(Math.random() * 1000000);
    const registerPayload = {
      fullName: 'E2E Test User',
      email: `e2e_${randomSuffix}@example.com`,
      password: 'password123',
    };

    // 1. Register User
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(registerPayload)
      .expect(201);

    const regResBody = regRes.body as Record<string, any>;
    const regData = regResBody.data as Record<string, any>;
    expect(regResBody.success).toBe(true);
    expect(regData.accessToken).toBeDefined();
    expect(regData.refreshToken).toBeDefined();

    // 2. Login User
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: registerPayload.email,
        password: registerPayload.password,
      })
      .expect(200);

    const loginResBody = loginRes.body as Record<string, any>;
    const loginData = loginResBody.data as Record<string, any>;
    expect(loginResBody.success).toBe(true);
    expect(loginData.accessToken).toBeDefined();
    expect(loginData.refreshToken).toBeDefined();
    const token = loginData.accessToken as string;

    // 3. Access Protected Route
    const protectedRes = await request(app.getHttpServer())
      .get('/api/v1/test-protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const protectedResBody = protectedRes.body as Record<string, any>;
    const protectedData = protectedResBody.data as Record<string, any>;
    expect(protectedResBody.success).toBe(true);
    expect(protectedData.secret).toBe('This is protected data');

    // 4. Access Health Check
    const healthRes = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    const healthResBody = healthRes.body as Record<string, any>;
    const healthData = healthResBody.data as Record<string, any>;
    const dbInfo = healthData.info as Record<string, any>;
    const database = dbInfo.database as Record<string, any>;

    expect(healthResBody.success).toBe(true);
    expect(healthData.status).toBe('ok');
    expect(database.status).toBe('up');
  });

  afterEach(async () => {
    await app.close();
  });
});
