import fs from "fs/promises";
import path from "path";
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

const LOGO_CID = "logoBwb";
const LOGO_FILENAME = "bwb-white-compact.png";

/**
 * Lê o logo de local/imagem/bwb-white-compact.png para embedding no email (CID).
 * Tenta cwd e depois cwd/.. para suportar execução a partir da raiz do repo ou de apps/web.
 */
async function getLogoBuffer(): Promise<Buffer | null> {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "local", "imagem", LOGO_FILENAME),
    path.join(cwd, "..", "local", "imagem", LOGO_FILENAME),
  ];
  for (const filePath of candidates) {
    try {
      return await fs.readFile(filePath);
    } catch {
      continue;
    }
  }
  return null;
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

  const logoBuffer = await getLogoBuffer();
  const html = getWelcomeResetEmailHtml({
    logoUrl: getLogoUrl(),
    logoCid: logoBuffer ? LOGO_CID : null,
    portalUrl,
    userEmail: to,
    defaultPassword: passwordDefault,
    isResetText,
  });

  const transporter = getTransporter();
  const mailOptions: Parameters<ReturnType<typeof getTransporter>["sendMail"]>[0] = {
    from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
    to,
    subject: isReset ? "Reset de Password" : "BWB Menu Online — Acesso ao Portal Admin",
    html,
    text: `${isResetText}\n\nEmail: ${to}\nPassword (por defeito): ${passwordDefault}\n\nAceder: ${portalUrl}`,
  };
  if (logoBuffer) {
    mailOptions.attachments = [
      { filename: "bwb-logo.png", content: logoBuffer, cid: LOGO_CID },
    ];
  }

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

export type SendFirstStoreWelcomeOptions = {
  to: string;
  portalUrl: string;
  passwordDefault?: string;
};

/**
 * Envia e-mail "Primeira loja criada" com credenciais (tenant admin).
 * Reutiliza o mesmo estilo do template welcome/reset.
 */
export async function sendFirstStoreWelcomeEmail(options: SendFirstStoreWelcomeOptions): Promise<void> {
  const {
    to,
    portalUrl,
    passwordDefault = DEFAULT_PASSWORD,
  } = options;

  const fromEmail = process.env.GOTRUE_SMTP_ADMIN_EMAIL ?? process.env.GOTRUE_SMTP_USER;
  const fromName = process.env.GOTRUE_SMTP_SENDER_NAME ?? "Suporte | BWB";

  const logoBuffer = await getLogoBuffer();
  const html = getWelcomeResetEmailHtml({
    logoUrl: getLogoUrl(),
    logoCid: logoBuffer ? LOGO_CID : null,
    portalUrl,
    userEmail: to,
    defaultPassword: passwordDefault,
    isResetText: "A sua primeira loja foi criada.",
    introParagraph: "É o administrador de todas as lojas da sua organização. O seu acesso ao <strong style=\"color:#ffffff;\">Portal Admin</strong> está pronto.",
  });

  const transporter = getTransporter();
  const mailOptions: Parameters<ReturnType<typeof getTransporter>["sendMail"]>[0] = {
    from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
    to,
    subject: "BWB Menu Online — Primeira loja criada / Acesso ao Portal Admin",
    html,
    text: `A sua primeira loja foi criada. É o administrador de todas as lojas da sua organização.\n\nEmail: ${to}\nPassword (por defeito): ${passwordDefault}\n\nAceder: ${portalUrl}`,
  };
  if (logoBuffer) {
    mailOptions.attachments = [
      { filename: "bwb-logo.png", content: logoBuffer, cid: LOGO_CID },
    ];
  }

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
