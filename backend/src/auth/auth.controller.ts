import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { randomBytes } from 'crypto';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  async google(
    @Req() req: any,
    @Query('returnTo') returnTo: string,
    @Res() res: Response,
  ) {
    const state = randomBytes(16).toString('hex');
    req.session = req.session || {};
    req.session.googleOAuthState = state;
    req.session.googleOAuthReturnTo = returnTo || '/';
    const url = await this.authService.getGoogleAuthUrl(state);
    return res.redirect(url);
  }

  @Get('google/callback')
  async googleCallback(
    @Req() req: any,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code) {
      throw new UnauthorizedException('Missing Google authorization code.');
    }

    const expectedState = req.session?.googleOAuthState;
    const session = await this.authService.handleGoogleCallback(
      code,
      state,
      expectedState,
    );

    const returnTo = req.session?.googleOAuthReturnTo || '/';
    delete req.session?.googleOAuthState;
    delete req.session?.googleOAuthReturnTo;

    const frontendUrl = process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL;
    const base = frontendUrl || 'http://localhost:8080';
    const redirectUrl = new URL(base);
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('token', session.accessToken);
    redirectUrl.searchParams.set('role', session.user.role);
    redirectUrl.searchParams.set('userId', session.user.id);
    redirectUrl.searchParams.set('returnTo', returnTo);

    return res.redirect(redirectUrl.toString());
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() request: { user: { userId: string } }) {
    return this.authService.getCurrentUser(request.user.userId);
  }
}
