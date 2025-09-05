/**
 * Email Service for Adventure Log
 * Handles sending transactional emails using multiple providers
 */

import { logger } from "./logger";
import { isProduction } from "./env";

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export interface EmailProvider {
  name: string;
  send: (options: EmailOptions) => Promise<boolean>;
}

// Email templates
export const EMAIL_TEMPLATES = {
  verification: {
    subject: "Verify your Adventure Log account",
    html: (name: string, verificationUrl: string) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Account</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background: #2563eb; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌍 Adventure Log</h1>
            </div>
            <div class="content">
              <h2>Welcome ${name}!</h2>
              <p>Thanks for joining Adventure Log! To complete your account setup, please verify your email address by clicking the button below:</p>
              
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              
              <p>This link will expire in 24 hours for security reasons.</p>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
              
              <p>If you didn't create an account with Adventure Log, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2024 Adventure Log. Happy travels! ✈️</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: (name: string, verificationUrl: string) => `
      Welcome to Adventure Log, ${name}!

      Thanks for joining Adventure Log! To complete your account setup, please verify your email address by visiting this link:

      ${verificationUrl}

      This link will expire in 24 hours for security reasons.

      If you didn't create an account with Adventure Log, you can safely ignore this email.

      Happy travels!
      The Adventure Log Team
    `,
  },

  passwordReset: {
    subject: "Reset your Adventure Log password",
    html: (name: string, resetUrl: string) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background: #dc2626; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌍 Adventure Log</h1>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>Hi ${name},</p>
              <p>We received a request to reset your Adventure Log password. Click the button below to create a new password:</p>
              
              <a href="${resetUrl}" class="button">Reset Password</a>
              
              <p>This link will expire in 1 hour for security reasons.</p>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #dc2626;">${resetUrl}</p>
              
              <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>© 2024 Adventure Log. Stay secure! 🔒</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: (name: string, resetUrl: string) => `
      Hi ${name},

      We received a request to reset your Adventure Log password. Visit this link to create a new password:

      ${resetUrl}

      This link will expire in 1 hour for security reasons.

      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

      Stay secure!
      The Adventure Log Team
    `,
  },
};

// Resend provider implementation
class ResendProvider implements EmailProvider {
  name = "Resend";

  async send(options: EmailOptions): Promise<boolean> {
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        logger.warn("RESEND_API_KEY not configured, skipping Resend");
        return false;
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: options.from || "Adventure Log <noreply@adventurelog.app>",
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        logger.info("Email sent successfully via Resend", {
          provider: this.name,
          to: options.to,
          subject: options.subject,
          id: result.id,
        });
        return true;
      } else {
        const error = await response.text();
        logger.error("Resend API error", {
          status: response.status,
          error,
          to: options.to,
        });
        return false;
      }
    } catch (error) {
      logger.error("Resend provider error", {
        error: error instanceof Error ? error.message : String(error),
        to: options.to,
      });
      return false;
    }
  }
}

// SendGrid provider implementation
class SendGridProvider implements EmailProvider {
  name = "SendGrid";

  async send(options: EmailOptions): Promise<boolean> {
    try {
      const sendGridApiKey = process.env.SENDGRID_API_KEY;
      if (!sendGridApiKey) {
        logger.warn("SENDGRID_API_KEY not configured, skipping SendGrid");
        return false;
      }

      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sendGridApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: options.to }],
            },
          ],
          from: {
            email:
              options.from?.split("<")[1]?.replace(">", "") ||
              "noreply@adventurelog.app",
            name: options.from?.split("<")[0]?.trim() || "Adventure Log",
          },
          subject: options.subject,
          content: [
            ...(options.html
              ? [{ type: "text/html", value: options.html }]
              : []),
            ...(options.text
              ? [{ type: "text/plain", value: options.text }]
              : []),
          ],
        }),
      });

      if (response.ok) {
        logger.info("Email sent successfully via SendGrid", {
          provider: this.name,
          to: options.to,
          subject: options.subject,
        });
        return true;
      } else {
        const error = await response.text();
        logger.error("SendGrid API error", {
          status: response.status,
          error,
          to: options.to,
        });
        return false;
      }
    } catch (error) {
      logger.error("SendGrid provider error", {
        error: error instanceof Error ? error.message : String(error),
        to: options.to,
      });
      return false;
    }
  }
}

// Console provider for development
class ConsoleProvider implements EmailProvider {
  name = "Console";

  async send(options: EmailOptions): Promise<boolean> {
    console.log("\n📧 EMAIL (Development Mode):");
    console.log("================================");
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`From: ${options.from || "noreply@adventurelog.app"}`);
    console.log("--------------------------------");

    if (options.text) {
      console.log("Text Content:");
      console.log(options.text);
    }

    if (options.html) {
      console.log("\nHTML Content:");
      console.log(options.html);
    }

    console.log("================================\n");

    logger.info("Email logged to console", {
      provider: this.name,
      to: options.to,
      subject: options.subject,
    });

    return true;
  }
}

// Email service class
class EmailService {
  private providers: EmailProvider[] = [];

  constructor() {
    // Initialize providers based on environment
    if (isProduction()) {
      this.providers.push(new ResendProvider());
      this.providers.push(new SendGridProvider());
    } else {
      this.providers.push(new ConsoleProvider());
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (this.providers.length === 0) {
      logger.warn("No email providers configured");
      return false;
    }

    // Try providers in order until one succeeds
    for (const provider of this.providers) {
      try {
        const success = await provider.send(options);
        if (success) {
          return true;
        }
      } catch (error) {
        logger.error(`Email provider ${provider.name} failed`, {
          error: error instanceof Error ? error.message : String(error),
          provider: provider.name,
        });
      }
    }

    logger.error("All email providers failed", {
      to: options.to,
      subject: options.subject,
      providers: this.providers.map((p) => p.name),
    });

    return false;
  }

  async sendVerificationEmail(
    email: string,
    name: string,
    verificationUrl: string
  ): Promise<boolean> {
    const template = EMAIL_TEMPLATES.verification;

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html(name, verificationUrl),
      text: template.text(name, verificationUrl),
    });
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetUrl: string
  ): Promise<boolean> {
    const template = EMAIL_TEMPLATES.passwordReset;

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html(name, resetUrl),
      text: template.text(name, resetUrl),
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Types exported above with class
