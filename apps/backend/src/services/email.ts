import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@settlesync.app';
const FROM_NAME = process.env.FROM_NAME || 'SettleSync';
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

/** Wrap email body content in a proper HTML document structure */
function wrapHtml(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="pl" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>SettleSync</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="480" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px; width: 100%; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 32px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #1e293b;">
              ${bodyContent}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; text-align: center;">
              SettleSync &mdash; Platforma do anonimowej zgody na mediacj&#281;<br>
              Anonymous mediation consent platform
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendMail(to: string, subject: string, bodyContent: string, text: string) {
  const html = wrapHtml(bodyContent);
  const info = await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
    headers: {
      'List-Unsubscribe': `<mailto:${FROM_EMAIL}?subject=unsubscribe>`,
      'Precedence': 'bulk',
    },
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`Email preview: ${previewUrl}`);
  }
  return info;
}

export async function sendMagicLink(email: string, token: string) {
  const url = `${FRONTEND_URL}/auth/verify?token=${encodeURIComponent(token)}`;

  const bodyContent = `
    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px;">SettleSync</h2>
    <p style="margin: 0 0 8px;">Kliknij poni&#380;szy link, aby si&#281; zalogowa&#263;:</p>
    <p style="margin: 16px 0;">
      <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Zaloguj si&#281; / Log in</a>
    </p>
    <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Link jest wa&#380;ny przez 15 minut.</p>
    <p style="margin: 0; color: #94a3b8; font-size: 13px;">Click the link above to log in. The link is valid for 15 minutes.</p>
  `;

  const text = `SettleSync - Link do logowania / Login Link

Kliknij ponizszy link, aby sie zalogowac:
Click the link below to log in:

${url}

Link jest wazny przez 15 minut. / The link is valid for 15 minutes.`;

  await sendMail(email, 'SettleSync - Link do logowania / Login Link', bodyContent, text);
}

export async function sendPartyLink(email: string, token: string, arbitrationId: string) {
  const url = `${FRONTEND_URL}/party/${encodeURIComponent(token)}`;

  const bodyContent = `
    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px;">SettleSync</h2>
    <p style="margin: 0 0 8px;">Zostales/as zaproszony/a do wyrazenia zgody na mediacj&#281; w post&#281;powaniu <strong>${arbitrationId}</strong>.</p>
    <p style="margin: 0 0 8px;">Twoja odpowiedz jest w pelni anonimowa &mdash; arbiter nie dowie si&#281;, kt&oacute;ra strona odpowiedziala jako pierwsza.</p>
    <p style="margin: 16px 0;">
      <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Wyraz swoja decyzj&#281; / Submit your decision</a>
    </p>
    <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Link jest wazny przez ograniczony czas. Nie udost&#281;pniaj go innym osobom.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
    <p style="margin: 0; color: #94a3b8; font-size: 13px;">You have been invited to express your consent to mediation in proceeding <strong>${arbitrationId}</strong>. Your response is fully anonymous. The link is time-limited &mdash; do not share it.</p>
  `;

  const text = `SettleSync - Zaproszenie do mediacji / Mediation Invitation

Postepowanie / Proceeding: ${arbitrationId}

Zostales/as zaproszony/a do wyrazenia zgody na mediacje.
You have been invited to express your consent to mediation.

Twoja odpowiedz jest w pelni anonimowa.
Your response is fully anonymous.

Kliknij link / Click the link:
${url}

Link jest wazny przez ograniczony czas. Nie udostepniaj go innym osobom.
The link is time-limited. Do not share it with others.`;

  await sendMail(email, 'SettleSync - Zaproszenie do mediacji / Mediation Invitation', bodyContent, text);
}

export async function sendPartyConfirmation(email: string, arbitrationId: string, consent: string) {
  const consentTextPl = consent === 'yes'
    ? 'Wyraziles/as gotowosc do mediacji.'
    : consent === 'no'
      ? 'Nie wyraziles/as gotowosci do mediacji.'
      : 'Twoja odpowiedz zostala zarejestrowana - potrzebujesz czasu na decyzje.';

  const consentTextEn = consent === 'yes'
    ? 'You have expressed willingness to mediate.'
    : consent === 'no'
      ? 'You have declined mediation.'
      : 'Your response has been recorded - you need time to decide.';

  const bodyContent = `
    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px;">SettleSync</h2>
    <p style="margin: 0 0 8px;">Potwierdzamy otrzymanie Twojej odpowiedzi w post&#281;powaniu <strong>${arbitrationId}</strong>.</p>
    <p style="margin: 0 0 8px;">${consentTextPl}</p>
    <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Twoja odpowiedz jest anonimowa &mdash; arbiter nie wie, kt&oacute;ra strona odpowiedziala jako pierwsza.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
    <p style="margin: 0; color: #94a3b8; font-size: 13px;">We confirm receipt of your response in proceeding <strong>${arbitrationId}</strong>. ${consentTextEn} Your response is anonymous.</p>
  `;

  const text = `SettleSync - Potwierdzenie odpowiedzi / Response Confirmation

Postepowanie / Proceeding: ${arbitrationId}

${consentTextPl}
${consentTextEn}

Twoja odpowiedz jest anonimowa.
Your response is anonymous.`;

  await sendMail(email, 'SettleSync - Potwierdzenie odpowiedzi / Response Confirmation', bodyContent, text);
}

export async function sendOtpCode(email: string, code: string) {
  const bodyContent = `
    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px;">SettleSync</h2>
    <p style="margin: 0 0 8px;">Tw&oacute;j kod weryfikacyjny / Your verification code:</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; color: #1e293b; padding: 16px; background-color: #f1f5f9; border-radius: 8px; margin: 16px 0;">${code}</p>
    <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Kod jest wazny przez 10 minut. Nie udost&#281;pniaj go nikomu.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
    <p style="margin: 0; color: #94a3b8; font-size: 13px;">This code is valid for 10 minutes. Do not share it with anyone.</p>
  `;

  const text = `SettleSync - Kod weryfikacyjny / Verification Code

Twoj kod / Your code: ${code}

Kod jest wazny przez 10 minut. / Valid for 10 minutes.`;

  await sendMail(email, 'SettleSync - Kod weryfikacyjny / Verification Code', bodyContent, text);
}

export async function sendBothAgreedNotification(
  arbiterEmail: string,
  arbitrationId: string,
  internalName: string,
) {
  const bodyContent = `
    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px;">SettleSync</h2>
    <p style="margin: 0 0 8px;">Obie strony w sprawie <strong>${internalName}</strong> (${arbitrationId}) wyrazily gotowosc do mediacji.</p>
    <p style="margin: 0 0 8px;">Zaloguj si&#281; do panelu, aby zobaczyc szczeg&oacute;ly:</p>
    <p style="margin: 16px 0;">
      <a href="${FRONTEND_URL}/login" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Przejdz do panelu / Go to dashboard</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
    <p style="margin: 0; color: #94a3b8; font-size: 13px;">Both parties in case <strong>${internalName}</strong> (${arbitrationId}) have expressed willingness to mediate. Log in to the dashboard to see the details.</p>
  `;

  const text = `SettleSync - Obie strony wyrazily zgode / Both Parties Agreed

Sprawa / Case: ${internalName} (${arbitrationId})

Obie strony wyrazily gotowosc do mediacji.
Both parties have expressed willingness to mediate.

Zaloguj sie do panelu / Log in to the dashboard:
${FRONTEND_URL}/login`;

  await sendMail(arbiterEmail, 'SettleSync - Obie strony wyrazily zgode / Both Parties Agreed', bodyContent, text);
}
