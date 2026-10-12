import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { NotificationType } from './entities/notification.entity';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const password = this.config
      .get<string>('SMTP_PASSWORD')
      ?.replace(/\s/g, '');
    this.from =
      this.config.get<string>('MAIL_FROM')?.trim() ||
      'i-Motion Academy <no-reply@i-motion.academy>';
    this.appUrl =
      this.config.get<string>('PUBLIC_APP_URL')?.trim() ||
      'http://localhost:8080';

    this.transporter =
      host && user && password
        ? nodemailer.createTransport({
            host,
            port,
            secure: this.config.get<string>('SMTP_SECURE') === 'true',
            auth: { user, pass: password },
          })
        : null;

    if (!this.transporter)
      this.logger.warn(
        'SMTP is not configured; automatic emails are disabled.',
      );
  }

  async sendNotification(input: {
    to: string;
    recipientName: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string | null;
  }): Promise<void> {
    if (!this.transporter) return;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: input.to,
        subject: `i-Motion Academy: ${input.title}`,
        text: `Hello ${input.recipientName},\n\n${input.message}\n\n${input.link ? `Open your dashboard: ${input.link}\n\n` : ''}i-Motion Academy`,
        html: this.renderHtml(input),
        headers: { 'X-iMotion-Notification-Type': input.type },
      });
      this.logger.log(`Notification email sent to ${input.to}`);
    } catch (error) {
      this.logger.error(
        `Could not send notification email to ${input.to}: ${(error as Error).message}`,
      );
    }
  }

  async sendComplaintNotification(input: {
    to: string;
    recipientName: string;
    event:
      | 'CREATED'
      | 'NEW_FOR_ADMIN'
      | 'MESSAGE'
      | 'ATTACHMENT'
      | 'STATUS'
      | 'REOPENED';
    title: string;
    message: string;
    reference: string;
    subject: string;
    link?: string | null;
  }): Promise<void> {
    if (!this.transporter) return;

    const eventLabels = {
      CREATED: 'Votre réclamation a bien été enregistrée',
      NEW_FOR_ADMIN: 'Nouvelle réclamation à traiter',
      MESSAGE: 'Nouveau message dans votre dossier',
      ATTACHMENT: 'Une pièce jointe a été ajoutée au dossier',
      STATUS: 'Le statut de votre réclamation a évolué',
      REOPENED: 'Votre réclamation a été réouverte',
    } as const;
    const safe = (value: string) => this.escapeHtml(value);
    const safeMessage = safe(input.message).replace(/\n/g, '<br>');
    const complaintUrl = input.link
      ? this.absoluteLink(input.link)
      : this.appUrl;
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17202a;max-width:620px;margin:auto"><div style="padding:24px;background:#0b1728;color:#fff;border-radius:12px 12px 0 0"><p style="margin:0;color:#9cc8ff">i-Motion Academy · Réclamations</p><h1 style="font-size:22px;margin:12px 0 0">${safe(eventLabels[input.event])}</h1></div><div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px"><p>Bonjour ${safe(input.recipientName)},</p><p>${safe(input.title)}</p><div style="padding:14px;background:#f3f6fa;border-radius:8px"><p style="margin:0 0 6px"><strong>Référence :</strong> ${safe(input.reference)}</p><p style="margin:0"><strong>Objet :</strong> ${safe(input.subject)}</p></div><p style="white-space:normal">${safeMessage}</p><p style="margin:24px 0"><a href="${safe(complaintUrl)}" style="display:inline-block;padding:11px 18px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:6px">Consulter le dossier</a></p><p style="color:#64748b;font-size:13px">Conservez cette référence pour vos échanges avec notre équipe.</p><p>À bientôt,<br>L’équipe i-Motion Academy</p></div></div>`;
    const text = `Bonjour ${input.recipientName},\n\n${eventLabels[input.event]}.\n\nRéférence : ${input.reference}\nObjet : ${input.subject}\n\n${input.title}\n${input.message}\n\nConsulter le dossier : ${complaintUrl}\n\nL’équipe i-Motion Academy`;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: input.to,
        subject: `i-Motion Academy — ${eventLabels[input.event]} · ${input.reference}`,
        text,
        html,
        headers: { 'X-iMotion-Email-Category': 'complaint' },
      });
      this.logger.log(
        `Complaint email ${input.event} sent to ${input.to} (${input.reference})`,
      );
    } catch (error) {
      this.logger.error(
        `Could not send complaint email ${input.event} to ${input.to}: ${(error as Error).message}`,
      );
    }
  }

  async sendPasswordResetEmail(
    to: string,
    recipientName: string,
    resetPath: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.error(
        'Password reset email could not be sent because SMTP is not configured.',
      );
      throw new Error('SMTP is not configured');
    }

    const resetUrl = this.absoluteLink(resetPath);
    const safeUrl = this.escapeHtml(resetUrl);
    const safeName = this.escapeHtml(recipientName);
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: 'i-Motion Academy: Réinitialisation de votre mot de passe',
        text: `Bonjour ${recipientName},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable une heure) :\n${resetUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17202a;max-width:600px"><p>Bonjour ${safeName},</p><p>Une demande de réinitialisation de mot de passe a été effectuée pour votre compte.</p><p><a href="${safeUrl}" style="color:#0ea5e9">Choisir un nouveau mot de passe</a></p><p>Ce lien expire dans une heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p><p>i-Motion Academy</p></div>`,
      });
    } catch (error) {
      this.logger.error(
        `Could not send password reset email: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async sendPaymentReceiptEmail(input: {
    to: string;
    recipientName: string;
    paymentReference: string;
    receipt: Buffer;
  }): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Payment receipt ${input.paymentReference} was not emailed because SMTP is not configured.`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: input.to,
        subject: `i-Motion Academy : reçu de paiement ${input.paymentReference}`,
        text: `Bonjour ${input.recipientName},\n\nVeuillez trouver en pièce jointe votre reçu de paiement ${input.paymentReference} au format PDF.\n\ni-Motion Academy`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17202a;max-width:600px"><p>Bonjour ${this.escapeHtml(input.recipientName)},</p><h2>Votre reçu de paiement est prêt</h2><p>Vous trouverez en pièce jointe le reçu PDF correspondant au paiement <strong>${this.escapeHtml(input.paymentReference)}</strong>.</p><p>i-Motion Academy</p></div>`,
        attachments: [
          {
            filename: `recu-${input.paymentReference}.pdf`,
            content: input.receipt,
            contentType: 'application/pdf',
          },
        ],
      });
      this.logger.log(`Payment receipt emailed to ${input.to}`);
    } catch (error) {
      this.logger.error(
        `Could not email payment receipt ${input.paymentReference} to ${input.to}: ${(error as Error).message}`,
      );
    }
  }

  private renderHtml(input: {
    recipientName: string;
    title: string;
    message: string;
    link?: string | null;
  }): string {
    const message = this.escapeHtml(input.message).replace(/\n/g, '<br>');
    const link = input.link
      ? `<p><a href="${this.escapeHtml(this.absoluteLink(input.link))}" style="color:#0ea5e9">Open your dashboard</a></p>`
      : '';
    return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17202a;max-width:600px"><p>Hello ${this.escapeHtml(input.recipientName)},</p><h2>${this.escapeHtml(input.title)}</h2><p>${message}</p>${link}<p>i-Motion Academy</p></div>`;
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>'"]/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;',
        })[character] ?? character,
    );
  }

  private absoluteLink(link: string): string {
    if (/^https?:\/\//i.test(link)) return link;
    return `${this.appUrl.replace(/\/$/, '')}/${link.replace(/^\//, '')}`;
  }
}
