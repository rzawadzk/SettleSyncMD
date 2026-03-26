import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@settlesync.app';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

let transporter: nodemailer.Transporter;

export async function initEmailTransport() {
  if (SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  } else {
    // Dev: Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log(`Ethereal email account: ${testAccount.user}`);
    console.log(`View emails at: https://ethereal.email/login`);
  }
}

async function sendMail(to: string, subject: string, html: string) {
  const info = await transporter.sendMail({ from: FROM_EMAIL, to, subject, html });
  // W dev pokaż URL do podglądu w Ethereal
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`Email preview: ${previewUrl}`);
  }
  return info;
}

export async function sendMagicLink(email: string, token: string) {
  const url = `${FRONTEND_URL}/auth/verify?token=${encodeURIComponent(token)}`;
  await sendMail(email, 'SettleSync — Link do logowania', `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1e293b;">SettleSync</h2>
      <p>Kliknij poniższy link, aby się zalogować:</p>
      <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Zaloguj się</a></p>
      <p style="color: #64748b; font-size: 14px;">Link jest ważny przez 15 minut.</p>
    </div>
  `);
}

export async function sendPartyLink(email: string, token: string, arbitrationId: string) {
  const url = `${FRONTEND_URL}/party/${encodeURIComponent(token)}`;
  await sendMail(email, 'SettleSync — Zaproszenie do wyrażenia zgody na mediację', `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1e293b;">SettleSync</h2>
      <p>Zostałeś/aś zaproszony/a do wyrażenia zgody na mediację w postępowaniu <strong>${arbitrationId}</strong>.</p>
      <p>Twoja odpowiedź jest w pełni anonimowa — arbiter nie dowie się, która strona odpowiedziała jako pierwsza.</p>
      <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Wyraź swoją decyzję</a></p>
      <p style="color: #64748b; font-size: 14px;">Link jest ważny przez ograniczony czas. Nie udostępniaj go innym osobom.</p>
    </div>
  `);
}

export async function sendPartyConfirmation(email: string, arbitrationId: string, consent: string) {
  const consentText = consent === 'yes'
    ? 'Wyraziłeś/aś gotowość do mediacji. / You have expressed willingness to mediate.'
    : consent === 'no'
      ? 'Nie wyraziłeś/aś gotowości do mediacji. / You have declined mediation.'
      : 'Twoja odpowiedź została zarejestrowana — potrzebujesz czasu na decyzję. / Your response has been recorded — you need time to decide.';

  await sendMail(email, 'SettleSync — Potwierdzenie odpowiedzi / Response Confirmation', `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1e293b;">SettleSync</h2>
      <p>Potwierdzamy otrzymanie Twojej odpowiedzi w postępowaniu <strong>${arbitrationId}</strong>.</p>
      <p>${consentText}</p>
      <p style="color: #64748b; font-size: 14px;">Twoja odpowiedź jest anonimowa — arbiter nie wie, która strona odpowiedziała jako pierwsza.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">We confirm receipt of your response in proceeding <strong>${arbitrationId}</strong>. Your response is anonymous.</p>
    </div>
  `);
}

export async function sendBothAgreedNotification(
  arbiterEmail: string,
  arbitrationId: string,
  internalName: string,
) {
  await sendMail(arbiterEmail, 'SettleSync — Obie strony wyraziły zgodę na mediację', `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1e293b;">SettleSync</h2>
      <p>Obie strony w sprawie <strong>${internalName}</strong> (${arbitrationId}) wyraziły gotowość do mediacji.</p>
      <p>Zaloguj się do panelu, aby zobaczyć szczegóły:</p>
      <p><a href="${FRONTEND_URL}/login" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px;">Przejdź do panelu</a></p>
    </div>
  `);
}
