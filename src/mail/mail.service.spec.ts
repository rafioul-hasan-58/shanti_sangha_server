import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { MailService } from './mail.service';
import { EnvConfig } from '../config/env.schema';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('MailService', () => {
  const sendMailMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });
  });

  it('should send OTP email using configured SMTP credentials', async () => {
    sendMailMock.mockResolvedValue({ messageId: 'msg-123' });
    const configValues: Record<string, unknown> = {
      SMTP_HOST: 'smtp.hostinger.com',
      SMTP_PORT: 465,
      SMTP_EMAIL_FROM: 'suppport@noreply.skillquix.tech',
      SMTP_PASS: 'secret',
      SMTP_NAME: 'Shantishanga',
    };
    const mockConfig = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService<EnvConfig, true>;

    const service = new MailService(mockConfig);
    await service.sendPasswordResetOtp(
      'user@example.com',
      'Test User',
      '123456',
      10,
    );

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: 'suppport@noreply.skillquix.tech',
        pass: 'secret',
      },
    });
    const sendCalls = sendMailMock.mock.calls as [
      { from: string; to: string; text: string; html: string },
    ][];
    expect(sendCalls[0][0].from).toBe(
      '"Shantishanga" <suppport@noreply.skillquix.tech>',
    );
    expect(sendCalls[0][0].to).toBe('user@example.com');
    expect(sendCalls[0][0].text).toContain('123456');
    expect(sendCalls[0][0].html).toContain('123456');
  });

  it('should throw InternalServerErrorException when SMTP config is incomplete', async () => {
    const origHost = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;
    const mockConfig = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService<EnvConfig, true>;

    const service = new MailService(mockConfig);

    await expect(
      service.sendPasswordResetOtp('user@example.com', 'User', '123456'),
    ).rejects.toThrow(InternalServerErrorException);

    process.env.SMTP_HOST = origHost;
  });
});
