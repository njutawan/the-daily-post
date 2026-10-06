import { Resend } from "resend";
import { logger } from "@/lib/logger";
import { SITE_URL } from "@/lib/site";

export type EmailResult = {
  ok: boolean;
  message: string;
  /** Present only in local development when Resend is not configured. */
  actionUrl?: string;
};

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  successMessage: string;
  developmentMessage: string;
  developmentActionUrl: string;
};

async function sendEmail({
  to,
  subject,
  html,
  successMessage,
  developmentMessage,
  developmentActionUrl,
}: SendEmailOptions): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      logger.info(
        { hasApiKey: Boolean(apiKey), hasFromAddress: Boolean(from) },
        "[email] Resend is not configured; showing a development action link"
      );
      return {
        ok: true,
        message: developmentMessage,
        actionUrl: developmentActionUrl,
      };
    }

    logger.error(
      { hasApiKey: Boolean(apiKey), hasFromAddress: Boolean(from) },
      "[email] Resend configuration is incomplete"
    );
    return {
      ok: false,
      message: "Email delivery is temporarily unavailable. Please try again later.",
    };
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      logger.error({ error }, "[email] Resend rejected an email");
      return {
        ok: false,
        message: "Email delivery failed. Please try again later.",
      };
    }

    return { ok: true, message: successMessage };
  } catch (err) {
    logger.error({ err }, "[email] Failed to send email via Resend");
    return {
      ok: false,
      message: "Email delivery failed. Please try again later.",
    };
  }
}

export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
  unsubscribeToken: string
): Promise<EmailResult> {
  const verificationUrl = new URL("/verify", SITE_URL);
  verificationUrl.searchParams.set("token", verificationToken);

  const unsubscribeUrl = new URL("/unsubscribe", SITE_URL);
  unsubscribeUrl.searchParams.set("token", unsubscribeToken);

  return sendEmail({
    to: email,
    subject: "Confirm your subscription to The Daily Post",
    successMessage: "Verification email sent. Please check your inbox.",
    developmentMessage:
      "Email delivery is disabled in development. Use the verification link below.",
    developmentActionUrl: verificationUrl.toString(),
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #000;">Confirm your subscription</h1>
        <p style="font-size: 16px; color: #444; line-height: 1.6;">
          Thanks for signing up for The Daily Post. Confirm your email address to complete your subscription:
        </p>
        <p style="margin: 24px 0;">
          <a href="${verificationUrl.toString()}"
             style="display: inline-block; background: #000; color: #fff; padding: 12px 32px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-decoration: none;">
            Confirm Subscription
          </a>
        </p>
        <p style="font-size: 13px; color: #888;">
          Or paste this link into your browser:<br>
          <a href="${verificationUrl.toString()}" style="color: #b91c1c;">${verificationUrl.toString()}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
        <p style="font-size: 12px; color: #777;">
          Didn&apos;t ask to subscribe? <a href="${unsubscribeUrl.toString()}" style="color: #777;">Cancel this request</a>.
        </p>
        <p style="font-size: 12px; color: #999; font-style: italic;">
          Democracy Dies in Darkness — The Daily Post
        </p>
      </div>
    `,
  });
}

export async function sendUnsubscribeEmail(
  email: string,
  unsubscribeToken: string
): Promise<EmailResult> {
  const unsubscribeUrl = new URL("/unsubscribe", SITE_URL);
  unsubscribeUrl.searchParams.set("token", unsubscribeToken);

  return sendEmail({
    to: email,
    subject: "Confirm your newsletter unsubscribe request",
    successMessage: "Unsubscribe instructions sent. Please check your inbox.",
    developmentMessage:
      "Email delivery is disabled in development. Use the unsubscribe link below.",
    developmentActionUrl: unsubscribeUrl.toString(),
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #000;">Confirm unsubscribe</h1>
        <p style="font-size: 16px; color: #444; line-height: 1.6;">
          We received a request to unsubscribe this address from The Daily Post newsletters. Confirm below to stop newsletter emails:
        </p>
        <p style="margin: 24px 0;">
          <a href="${unsubscribeUrl.toString()}"
             style="display: inline-block; background: #000; color: #fff; padding: 12px 32px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-decoration: none;">
            Review unsubscribe request
          </a>
        </p>
        <p style="font-size: 13px; color: #777;">
          This link opens a confirmation page; your subscription will not change unless you confirm there. If you did not request this, you can ignore this email.
        </p>
        <p style="font-size: 12px; color: #999; font-style: italic;">
          Democracy Dies in Darkness — The Daily Post
        </p>
      </div>
    `,
  });
}
