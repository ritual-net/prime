import nodemailer, { type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { Options as SMTPOptions } from "nodemailer/lib/smtp-transport";

/**
 * Default SMTP transport options
 * @dev collected from environment, potentially undefined
 */
const DEFAULT_OPTIONS: SMTPOptions = {
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
};

// Email from address
export const EMAIL_FROM: string = process.env.EMAIL_FROM ?? "admin@ritual.com";

/**
 * Creates new nodemailer SMTP transport
 * @param {string | SMTPOptions} options SMTP configuration, defaults to environment-provided
 * @returns {Transporter<SMTPTransport.SentMessageInfo>} transport
 */
export function getEmailTransport(
  options: string | SMTPOptions = DEFAULT_OPTIONS,
): Transporter<SMTPTransport.SentMessageInfo> {
  return nodemailer.createTransport(options);
}
