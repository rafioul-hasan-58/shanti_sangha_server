import { User } from '@prisma/client';

/**
 * Excludes sensitive password hash and password-reset OTP metadata from API responses.
 */
export function sanitizeUser(
  user: User,
): Omit<
  User,
  'password' | 'resetOtpHash' | 'resetOtpExpiresAt' | 'resetOtpVerified'
> {
  const {
    password: _password,
    resetOtpHash: _resetOtpHash,
    resetOtpExpiresAt: _resetOtpExpiresAt,
    resetOtpVerified: _resetOtpVerified,
    ...sanitized
  } = user;
  void _password;
  void _resetOtpHash;
  void _resetOtpExpiresAt;
  void _resetOtpVerified;
  return sanitized;
}
