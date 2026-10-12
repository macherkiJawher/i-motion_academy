import { createHash } from 'crypto';
import { AuthService } from './auth.service';

describe('AuthService password recovery', () => {
  const makeService = (user: Record<string, unknown> | null) => {
    const storedTokens: Array<[string, string, Date]> = [];
    const clearedTokens: string[] = [];
    const emailedLinks: Array<[string, string, string]> = [];
    const usersService = {
      findByEmail: jest.fn().mockResolvedValue(user),
      setPassword: jest
        .fn()
        .mockImplementation((id: string, password: string) =>
          Promise.resolve({
            ...user,
            id,
            password: `hashed:${password}`,
            tokenVersion: 1,
          }),
        ),
      storePasswordResetToken: jest.fn(
        (id: string, hash: string, expiresAt: Date) => {
          storedTokens.push([id, hash, expiresAt]);
          return Promise.resolve();
        },
      ),
      clearPasswordResetToken: jest.fn((id: string) => {
        clearedTokens.push(id);
        return Promise.resolve();
      }),
      resetPasswordWithToken: jest.fn().mockResolvedValue(undefined),
    };
    const emailService = {
      sendPasswordResetEmail: jest.fn(
        (to: string, name: string, resetPath: string) => {
          emailedLinks.push([to, name, resetPath]);
          return Promise.resolve();
        },
      ),
    };
    const service = new AuthService(
      usersService as any,
      {} as any,
      {} as any,
      undefined,
      emailService as any,
    );
    return {
      service,
      usersService,
      emailService,
      storedTokens,
      clearedTokens,
      emailedLinks,
    };
  };

  it('returns the same response whether the email exists or not', async () => {
    const existing = makeService({
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: '$2a$10$some-hash',
    });
    const missing = makeService(null);

    const existingResponse =
      await existing.service.forgotPassword('user@example.com');
    const missingResponse = await missing.service.forgotPassword(
      'missing@example.com',
    );

    expect(existingResponse).toEqual(missingResponse);
    expect(existing.emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(
      1,
    );
    expect(missing.emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('stores only a hash of a random reset token and emails the raw token link', async () => {
    const { service, usersService, storedTokens, emailedLinks } = makeService({
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: '$2a$10$some-hash',
    });

    await service.forgotPassword(' USER@example.com ');

    expect(usersService.findByEmail).toHaveBeenCalledWith('user@example.com');
    const [userId, tokenHash, expiresAt] = storedTokens[0];
    const resetPath = emailedLinks[0][2];
    const rawToken = new URL(
      resetPath,
      'https://example.test',
    ).searchParams.get('token');
    expect(userId).toBe('user-1');
    if (!rawToken) throw new Error('Reset email did not contain a token');
    expect(tokenHash).toBe(createHash('sha256').update(rawToken).digest('hex'));
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + 60 * 60 * 1000,
    );
  });

  it('clears an undelivered token while keeping the generic response', async () => {
    const { service, clearedTokens, emailService } = makeService({
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: '$2a$10$some-hash',
    });
    emailService.sendPasswordResetEmail.mockRejectedValue(
      new Error('SMTP down'),
    );

    await expect(service.forgotPassword('user@example.com')).resolves.toEqual({
      message:
        'If an account exists for this email, a reset link will be sent.',
    });
    expect(clearedTokens).toContain('user-1');
  });

  it('hashes the presented token before asking to consume it', async () => {
    const { service, usersService } = makeService(null);

    await service.resetPassword('single-use-token', 'new-password-123');

    expect(usersService.resetPasswordWithToken).toHaveBeenCalledWith(
      createHash('sha256').update('single-use-token').digest('hex'),
      'new-password-123',
    );
  });

  it('rehashes an old plaintext password after a successful login', async () => {
    const { service, usersService } = makeService({
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'legacy-password',
      tokenVersion: 0,
    });

    const user = await service.validateUser(
      'user@example.com',
      'legacy-password',
    );

    expect(usersService.setPassword).toHaveBeenCalledWith(
      'user-1',
      'legacy-password',
    );
    expect(user).toMatchObject({ id: 'user-1', tokenVersion: 1 });
    expect(user).not.toHaveProperty('password');
  });
});
