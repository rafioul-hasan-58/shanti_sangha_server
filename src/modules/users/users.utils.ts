import { User } from '@prisma/client';

/**
 * Excludes the sensitive password hash before returning a user object in API responses.
 */
export function sanitizeUser(user: User): Omit<User, 'password'> {
  const { password: _password, ...sanitized } = user;
  void _password;
  return sanitized;
}
