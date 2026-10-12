import { UsersService } from './users.service';
import { compare } from 'bcryptjs';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  it('hashes passwords created through the users service', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((user: Partial<User>) => user),
      save: jest.fn((user: Partial<User>) => Promise.resolve(user)),
    };
    const service = new UsersService(repo as any);

    const created = await service.create({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'correct-horse-battery',
    });

    expect(created.password).not.toBe('correct-horse-battery');
    await expect(
      compare('correct-horse-battery', created.password!),
    ).resolves.toBe(true);
  });

  it('rejects passwords that bcrypt would silently truncate', () => {
    const service = new UsersService({} as any);

    expect(() => service.hashPassword('é'.repeat(37))).toThrow(
      '72 UTF-8 bytes',
    );
  });

  it('consumes a reset token once and advances the JWT token version', async () => {
    const user = {
      id: 'user-1',
      password: null as string | null,
      passwordResetTokenHash: 'token-hash',
      passwordResetExpiresAt: new Date(Date.now() + 60_000),
      tokenVersion: 2,
    };
    const transactionUsers = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn((value: typeof user) => Promise.resolve(value)),
    };
    type MockManager = {
      getRepository: (entity: unknown) => typeof transactionUsers;
    };
    const repo = {
      findOne: jest.fn().mockResolvedValue(user),
      manager: {
        transaction: jest.fn((callback: (manager: MockManager) => unknown) =>
          Promise.resolve(
            callback({
              getRepository: (entity: unknown) => {
                if (entity !== User) throw new Error('Unexpected repository');
                return transactionUsers;
              },
            }),
          ),
        ),
      },
    };
    const service = new UsersService(repo as any);

    await service.resetPasswordWithToken('token-hash', 'new-password-123');

    expect(transactionUsers.save).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        tokenVersion: 3,
      }),
    );
    const saved = transactionUsers.save.mock.calls[0][0];
    if (!saved.password) throw new Error('Password was not saved');
    await expect(compare('new-password-123', saved.password)).resolves.toBe(
      true,
    );
    await expect(
      service.resetPasswordWithToken('token-hash', 'another-password-123'),
    ).rejects.toThrow('Invalid or expired password reset token');
  });

  it('rejects expired reset tokens', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        passwordResetTokenHash: 'token-hash',
        passwordResetExpiresAt: new Date(Date.now() - 1),
      }),
    };
    const service = new UsersService(repo as any);

    await expect(
      service.resetPasswordWithToken('token-hash', 'new-password-123'),
    ).rejects.toThrow('Invalid or expired password reset token');
  });

  it('finds a user by email without any ban logic', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
      }),
    };

    const service = new UsersService(repo as any);

    await expect(
      service.findByEmail('user@example.com'),
    ).resolves.toMatchObject({
      id: 'user-1',
      email: 'user@example.com',
    });
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
    });
  });

  it('updates only personal profile fields and normalizes the email', async () => {
    const user = {
      id: 'user-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: null as string | null,
      role: 'ADMIN',
    };
    const repo = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(null),
      save: jest.fn((value: typeof user) => Promise.resolve(value)),
    };
    const service = new UsersService(repo as any);

    await service.updateProfile('user-1', {
      firstName: 'Augusta',
      email: '  AUGUSTA@example.com ',
      phone: '+21612345678',
    });

    expect(repo.save).toHaveBeenCalledWith({
      ...user,
      firstName: 'Augusta',
      email: 'augusta@example.com',
      phone: '+21612345678',
    });
    expect(repo.findOne).toHaveBeenNthCalledWith(2, {
      where: { email: 'augusta@example.com' },
    });
  });

  it('rejects a profile email already used by another account', async () => {
    const user = {
      id: 'user-1',
      email: 'ada@example.com',
    };
    const repo = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ id: 'user-2' }),
      save: jest.fn(),
    };
    const service = new UsersService(repo as any);

    await expect(
      service.updateProfile('user-1', { email: 'taken@example.com' }),
    ).rejects.toThrow('Email already in use');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('increments tokenVersion when an administrator changes a user role', async () => {
    const user = {
      id: 'user-1',
      role: 'ADMIN',
      tokenVersion: 4,
    };
    const repo = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn((value: typeof user) => Promise.resolve(value)),
    };
    const service = new UsersService(repo as any);

    await service.update('user-1', { role: 'PARTICIPANT' });

    expect(repo.save).toHaveBeenCalledWith({
      id: 'user-1',
      role: 'PARTICIPANT',
      tokenVersion: 5,
    });
  });

  it('does not invalidate tokens when the role is unchanged', async () => {
    const user = {
      id: 'user-1',
      role: 'ADMIN',
      tokenVersion: 4,
    };
    const repo = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn((value: typeof user) => Promise.resolve(value)),
    };
    const service = new UsersService(repo as any);

    await service.update('user-1', { role: 'ADMIN' });

    expect(repo.save).toHaveBeenCalledWith({
      id: 'user-1',
      role: 'ADMIN',
      tokenVersion: 4,
    });
  });
});
