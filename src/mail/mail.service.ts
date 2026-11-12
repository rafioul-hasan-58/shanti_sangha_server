import {
  Injectable,
  InternalServerErrorException,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { EnvConfig } from '../config/env.schema';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(
    @Optional()
    private readonly configService?: ConfigService<EnvConfig, true>,
  ) {}

  private getConfigValue<K extends keyof EnvConfig>(
    key: K,
  ): EnvConfig[K] | undefined {
    return (
      this.configService?.get(key, { infer: true }) ??
      (process.env[key] as EnvConfig[K] | undefined)
    );
  }

  private getTransporter(): {
    transporter: Transporter;
    from: string;
  } {
    const host = this.getConfigValue('SMTP_HOST');
    const portRaw = this.getConfigValue('SMTP_PORT');
    const port = portRaw ? Number(portRaw) : 465;
    const fromEmail = this.getConfigValue('SMTP_EMAIL_FROM');
    const user = this.getConfigValue('SMTP_USER') || fromEmail;
    const pass = this.getConfigValue('SMTP_PASS');
    const fromName =
      this.getConfigValue('SMTP_NAME') || 'SHAVARCHALA SHANTI SANGHA';

    if (!host || !user || !pass || !fromEmail) {
      this.logger.error('SMTP credentials are missing in environment config');
      throw new InternalServerErrorException(
        'Email service is not properly configured',
      );
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    }

    return {
      transporter: this.transporter,
      from: `"${fromName}" <${fromEmail}>`,
    };
  }

  /**
   * Sends a 6-digit password reset OTP email.
   */
  async sendPasswordResetOtp(
    toEmail: string,
    fullName: string,
    otp: string,
    expiresInMinutes = 10,
  ): Promise<void> {
    const { transporter, from } = this.getTransporter();
    const orgName =
      this.getConfigValue('SMTP_NAME') || 'SHAVARCHALA SHANTI SANGHA';

    const subject = `Password Reset OTP - ${orgName}`;
    const text = `Hello ${fullName},\n\nYour password reset verification code is: ${otp}\n\nThis OTP will expire in ${expiresInMinutes} minutes.\nIf you did not request a password reset, please ignore this email.\n\nRegards,\n${orgName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #006a4e; color: #ffffff; padding: 20px 24px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; letter-spacing: 0.5px;">SHAVARCHALA SHANTI SANGHA</h2>
        </div>
        <div style="padding: 28px 24px; color: #1f2937; line-height: 1.6;">
          <p style="margin-top: 0;">Hello <strong>${fullName}</strong>,</p>
          <p>We received a request to reset your password. Use the following 6-digit OTP code to verify your request:</p>
          <div style="margin: 24px 0; text-align: center;">
            <span style="display: inline-block; background-color: #f0fdf4; border: 2px dashed #006a4e; color: #006a4e; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 12px 24px; border-radius: 8px;">
              ${otp}
            </span>
          </div>
          <p style="margin-bottom: 8px;">This code will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
          <p style="color: #6b7280; font-size: 13px; margin-bottom: 0;">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from,
        to: toEmail,
        subject,
        text,
        html,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send OTP email to ${toEmail}: ${msg}`);
      throw new InternalServerErrorException(
        'Failed to send OTP email. Please try again later.',
      );
    }
  }
}
