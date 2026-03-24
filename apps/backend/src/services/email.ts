import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../utils/config.js';
import pino from 'pino';

const logger = pino({ name: 'email-service' });

// ============================================================
// TRANSPORT
// ============================================================

let transporter: nodemailer.Transporter;

export async function initEmailTransport(): Promise<void> {
  if (config.NODE_ENV === 'development' && !config.SMTP_USER) {
    // Auto-create Ethereal test account for development
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    logger.info(`📧 Dev email account: ${testAccount.user}`);
  } else {
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
    });
  }
}

// ============================================================
// TEMPLATE ENGINE
// ============================================================

const templateCache = new Map<string, Handlebars.TemplateDelegate>();

async function loadTemplate(name: string, locale: string): Promise<Handlebars.TemplateDelegate> {
  const key = `${locale}/${name}`;
  if (templateCache.has(key)) return templateCache.get(key)!;

  const templateDir = path.join(import.meta.dirname, '..', 'templates', 'email');
  let templatePath = path.join(templateDir, locale, `${name}.hbs`);

  // Fallback to Polish if locale template doesn't exist
  try {
    await fs.access(templatePath);
  } catch {
    templatePath = path.join(templateDir, 'pl', `${name}.hbs`);
  }

  const source = await fs.readFile(templatePath, 'utf-8');
  const compiled = Handlebars.compile(source);
  templateCache.set(key, compiled);
  return compiled;
}

// ============================================================
// EMAIL FUNCTIONS
// ============================================================

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  locale?: string;
  data: Record<string, unknown>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const template = await loadTemplate(options.template, options.locale ?? 'pl');
    const html = template(options.data);

    const info = await transporter.sendMail({
      from: `"${config.SMTP_FROM_NAME}" <${config.SMTP_FROM}>`,
      to: options.to,
      subject: options.subject,
      html,
    });

    if (config.NODE_ENV === 'development') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`📧 Preview: ${previewUrl}`);
      }
    }

    logger.info({ messageId: info.messageId }, 'Email sent');
    return true;
  } catch (err) {
    logger.error({ err }, 'Failed to send email');
    return false;
  }
}

// ============================================================
// SPECIFIC EMAIL HELPERS
// ============================================================

export async function sendMagicLinkEmail(
  email: string,
  token: string,
  locale: string = 'pl'
): Promise<boolean> {
  const verifyUrl = `${config.APP_URL}/auth/verify?token=${token}`;
  return sendEmail({
    to: email,
    subject: locale === 'pl' ? 'Zaloguj się do SettleSync' : 'Sign in to SettleSync',
    template: 'magic-link',
    locale,
    data: { verifyUrl, expiresMinutes: 15 },
  });
}

export async function sendConsentLinkEmail(
  email: string,
  partyName: string,
  caseTitle: string,
  token: string,
  deadline: Date,
  locale: string = 'pl'
): Promise<boolean> {
  const consentUrl = `${config.APP_URL}/consent/${token}`;
  return sendEmail({
    to: email,
    subject: locale === 'pl'
      ? `Zaproszenie do mediacji: ${caseTitle}`
      : `Mediation invitation: ${caseTitle}`,
    template: 'consent-link',
    locale,
    data: {
      partyName,
      caseTitle,
      consentUrl,
      deadline: deadline.toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-GB'),
    },
  });
}

export async function sendConsentConfirmationEmail(
  email: string,
  partyName: string,
  caseTitle: string,
  consent: 'accepted' | 'rejected',
  locale: string = 'pl'
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: locale === 'pl'
      ? `Potwierdzenie odpowiedzi: ${caseTitle}`
      : `Response confirmation: ${caseTitle}`,
    template: 'consent-confirmation',
    locale,
    data: { partyName, caseTitle, consent },
  });
}

export async function sendArbiterNotificationEmail(
  email: string,
  caseTitle: string,
  partyName: string,
  consent: 'accepted' | 'rejected',
  locale: string = 'pl'
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: locale === 'pl'
      ? `Odpowiedź strony w sprawie: ${caseTitle}`
      : `Party response in case: ${caseTitle}`,
    template: 'arbiter-notification',
    locale,
    data: { caseTitle, partyName, consent },
  });
}
