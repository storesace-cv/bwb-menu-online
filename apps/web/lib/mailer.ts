import nodemailer from "nodemailer";
import { getWelcomeResetEmailHtml } from "./email-template";

const DEFAULT_PASSWORD = "bwb-menu";

function getTransporter() {
  const host = process.env.GOTRUE_SMTP_HOST;
  const port = process.env.GOTRUE_SMTP_PORT;
  const user = process.env.GOTRUE_SMTP_USER;
  const pass = process.env.GOTRUE_SMTP_PASS;
  const fromEmail = process.env.GOTRUE_SMTP_ADMIN_EMAIL ?? user;
  const fromName = process.env.GOTRUE_SMTP_SENDER_NAME ?? "BWB Menu Online";

  if (!host || !user || !pass) {
    throw new Error("SMTP config missing: GOTRUE_SMTP_HOST, GOTRUE_SMTP_USER, GOTRUE_SMTP_PASS required");
  }

  const portNum = port ? parseInt(port, 10) : 2525;
  return nodemailer.createTransport({
    host,
    port: portNum,
    secure: portNum === 465,
    auth: { user, pass },
  });
}

function getLogoUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://menu.bwb.pt";
  return `${base.replace(/\/$/, "")}/email/bwb-white-compact.jpeg`;
}

export type SendWelcomeOrResetOptions = {
  to: string;
  portalUrl: string;
  isReset?: boolean;
  passwordDefault?: string;
};

/**
 * Send welcome (new user) or reset password email.
 * Uses GOTRUE_SMTP_* env vars. Does not log SMTP_PASS.
 */
export async function sendWelcomeOrResetEmail(options: SendWelcomeOrResetOptions): Promise<void> {
  const {
    to,
    portalUrl,
    isReset = false,
    passwordDefault = DEFAULT_PASSWORD,
  } = options;

  const fromEmail = process.env.GOTRUE_SMTP_ADMIN_EMAIL ?? process.env.GOTRUE_SMTP_USER;
  const fromName = process.env.GOTRUE_SMTP_SENDER_NAME ?? "Suporte | BWB";

  const isResetText = isReset
    ? "A sua palavra-passe foi reposta."
    : "A sua conta foi criada.";

  const html = getWelcomeResetEmailHtml({
    logoUrl: getLogoUrl(),
    portalUrl,
    userEmail: to,
    defaultPassword: passwordDefault,
    isResetText,
  });

  const transporter = getTransporter();
  const mailOptions = {
    from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
    to,
    subject: isReset ? "BWB Menu Online — Palavra-passe reposta" : "BWB Menu Online — Acesso ao Portal Admin",
    html,
    text: `${isResetText}\n\nEmail: ${to}\nPassword (por defeito): ${passwordDefault}\n\nAceder: ${portalUrl}`,
  };

  const send = () => transporter.sendMail(mailOptions);

  try {
    await send();
  } catch (err) {
    try {
      await send();
    } catch (retryErr) {
      throw retryErr;
    }
  }
}
