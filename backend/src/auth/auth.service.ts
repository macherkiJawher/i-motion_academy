import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { compare } from 'bcryptjs';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/entities/audit-log.entity';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { EmailService } from '../notifications/email.service';
import { User } from '../users/entities/user.entity';

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const GENERIC_RESET_RESPONSE = {
  message: 'If an account exists for this email, a reset link will be sent.',
};

type AuthenticatedUser = Pick<
  User,
  | 'id'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'role'
  | 'createdAt'
  | 'avatarUrl'
  | 'tokenVersion'
>;

type PublicUser = Omit<AuthenticatedUser, 'tokenVersion'>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private readonly auditService?: AuditService,
    private readonly emailService?: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService
      .findByEmail(dto.email)
      .catch(() => null);
    if (existing) throw new ConflictException('Email already in use');

    const created = await this.usersService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: dto.password,
      phone: dto.phone,
    });

    return this.toPublicUser(created);
  }

  async getGoogleAuthUrl(state?: string): Promise<string> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const callbackUrl = this.config.get<string>('GOOGLE_CALLBACK_URL')?.trim();

    if (!clientId || !callbackUrl) {
      throw new UnauthorizedException(
        'Google OAuth is not configured on the server.',
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
    });

    if (state) {
      params.set('state', state);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(
    code: string,
    state: string,
    expectedState?: string,
  ) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackUrl = this.config.get<string>('GOOGLE_CALLBACK_URL')?.trim();

    if (!clientId || !clientSecret || !callbackUrl) {
      throw new UnauthorizedException(
        'Google OAuth is not configured on the server.',
      );
    }

    if (!expectedState || state !== expectedState) {
      throw new UnauthorizedException('Invalid Google OAuth state.');
    }

    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(clientId, clientSecret, callbackUrl);

    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;
    if (!idToken) {
      throw new UnauthorizedException('Google did not return an ID token.');
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.email_verified) {
      throw new UnauthorizedException(
        'Google account email is missing or not verified.',
      );
    }

    const googleIssuer = payload.iss;
    const validIssuers = new Set([
      'accounts.google.com',
      'https://accounts.google.com',
    ]);
    if (!googleIssuer || !validIssuers.has(googleIssuer)) {
      throw new UnauthorizedException('Invalid Google issuer.');
    }

    if (payload.aud !== clientId) {
      throw new UnauthorizedException('Invalid Google audience.');
    }

    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now) {
      throw new UnauthorizedException('Google token has expired.');
    }

    const existing = await this.usersService.findByEmail(payload.email);
    if (existing && existing.password) {
      throw new ConflictException(
        'This email already belongs to a local account. Please sign in with your password or recover your account.',
      );
    }

    const googleUser = await this.usersService.createGoogleUser({
      firstName: payload.given_name || payload.name?.split(' ')[0] || 'Google',
      lastName:
        payload.family_name ||
        payload.name?.split(' ').slice(1).join(' ') ||
        'User',
      email: payload.email,
      avatarUrl: payload.picture || null,
    });

    const authenticatedUser = this.toAuthenticatedUser(googleUser);
    const session = await this.login(authenticatedUser);
    return session;
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.usersService.findByEmail(email).catch(() => null);
    if (!user?.password) return null;

    if (BCRYPT_HASH.test(user.password)) {
      if (!(await compare(pass, user.password))) return null;
    } else {
      const submitted = Buffer.from(pass, 'utf8');
      const stored = Buffer.from(user.password, 'utf8');
      if (
        submitted.length !== stored.length ||
        !timingSafeEqual(submitted, stored)
      ) {
        return null;
      }
      Object.assign(user, await this.usersService.setPassword(user.id, pass));
    }

    return this.toAuthenticatedUser(user);
  }

  async login(user: AuthenticatedUser | null) {
    if (!user) throw new UnauthorizedException();
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    };
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') || '1h';
    const token = this.jwtService.sign(payload, {
      expiresIn: expiresIn as JwtSignOptions['expiresIn'],
    });
    await this.auditService?.logAdminAction(
      user.id,
      AuditAction.USER_LOGIN,
      AuditEntity.USER,
      user.id,
      `User ${user.email} signed in successfully`,
      undefined,
      null,
      null,
    );
    return {
      user: this.toPublicUser(user),
      accessToken: token,
      access_token: token,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.usersService.findOne(userId);
    return this.toPublicUser(user);
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(
      email.trim().toLowerCase(),
    );
    if (user?.password) {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await this.usersService.storePasswordResetToken(
        user.id,
        tokenHash,
        expiresAt,
      );

      try {
        if (!this.emailService) throw new Error('Email service is unavailable');
        const resetPath = `/reset-password?token=${encodeURIComponent(token)}`;
        await this.emailService.sendPasswordResetEmail(
          user.email,
          `${user.firstName} ${user.lastName}`.trim(),
          resetPath,
        );
      } catch (error) {
        this.logger.error(
          `Could not deliver password reset email: ${(error as Error).message}`,
        );
        try {
          await this.usersService.clearPasswordResetToken(user.id);
        } catch (clearError) {
          this.logger.error(
            `Could not clear undelivered password reset token: ${(clearError as Error).message}`,
          );
        }
      }
    }
    return GENERIC_RESET_RESPONSE;
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.usersService.resetPasswordWithToken(tokenHash, password);
    return { reset: true };
  }

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      avatarUrl: user.avatarUrl,
      tokenVersion: user.tokenVersion ?? 0,
    };
  }

  private toPublicUser(
    user: Pick<
      User,
      | 'id'
      | 'firstName'
      | 'lastName'
      | 'email'
      | 'phone'
      | 'role'
      | 'createdAt'
      | 'avatarUrl'
    >,
  ): PublicUser {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      avatarUrl: user.avatarUrl,
    };
  }
}
