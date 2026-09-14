import { logger } from "@/lib/logger";
import { SITE_URL } from "@/lib/site";

/**
 * Email service integration.
 * In production, set RESEND_API_KEY to send real emails via Resend.
 * In development (no API key), the verification link is logged + returned
 * so the template works out-of-the-box.
 */

export type EmailResult = {
  ok: boolean;
  message: string;
  verificationUrl?: string;
};

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<EmailResult> {
  const verificationUrl = `${SITE_URL}/verify?token=${token}`;

  // If no API key, log the link (development mode)
  if (!process.env.RESEND_API_KEY) {
    logger.info({ email, verificationUrl }, "Verification link generated (dev mode)");
    return {
      ok: true,
      message: "Verification link generated (dev mode — check server logs).",
      verificationUrl,
    };
  }

  // Production: send via Resend
  try {
    // Dynamically require resend only when API key is set
    // This avoids the module-not-found warning in dev when resend isn't installed
    let ResendClass: any;
    try {
      // Use eval to prevent bundler from statically analyzing this import
      const mod = (0, eval)("require")("resend");
      ResendClass = mod.Resend || mod.default?.Resend || mod.default || mod;
    } catch {
      logger.info({ email, verificationUrl }, "Verification link generated (resend not installed)");
      return {
        ok: true,
        message: "Verification link generated (dev mode — resend not installed).",
        verificationUrl,
      };
    }

    const resend = new ResendClass(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "The Daily Post <newsletter@thedailypost.example>",
      to: email,
      subject: "Confirm your subscription to The Daily Post",
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #000;">Confirm your subscription</h1>
          <p style="font-size: 16px; color: #444; line-height: 1.6;">
            Thanks for subscribing to The Daily Post. Please confirm your email address by clicking the button below:
          </p>
          <p style="margin: 24px 0;">
            <a href="${verificationUrl}"
               style="display: inline-block; background: #000; color: #fff; padding: 12px 32px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; border-radius: 0;">
              Confirm Subscription
            </a>
          </p>
          <p style="font-size: 13px; color: #888;">
            Or paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #b91c1c;">${verificationUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
          <p style="font-size: 12px; color: #999; font-style: italic;">
            Democracy Dies in Darkness — The Daily Post
          </p>
        </div>
      `,
    });

    return {
      ok: true,
      message: "Verification email sent. Please check your inbox.",
    };
  } catch (err) {
    logger.error({ err }, "[email] Failed to send verification email");
    return {
      ok: false,
      message: "Failed to send verification email. Please try again.",
    };
  }
}
