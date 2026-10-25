import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface SendOtpOptions {
  to: string;
  otp: string;
  name?: string;
}

export async function sendPasswordResetOtpEmail({ to, otp, name }: SendOtpOptions) {
  const fromEmail =
    process.env.EMAIL_FROM || "Glamour Homecare Portal <security@glamourhomecare.org>";

  const subject = `Your Security Code: ${otp} - Glamour Homecare Portal`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Password Reset OTP</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <div style="background-color: #ffffff; padding: 28px 32px 20px 32px; border-bottom: 1px solid #f1f5f9; text-align: center;">
      <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: #ffe4e6; color: #e11d48; font-weight: 800; font-size: 22px; border-radius: 12px; margin-bottom: 8px;">
        G
      </div>
      <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em;">
        Glamour Homecare Portal
      </h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-weight: 500;">
        Clinical Security &amp; Access Control
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #0f172a;">
        Password Reset Verification Code
      </h2>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #475569;">
        Hello${name ? ` ${name}` : ""},<br>
        We received a request to reset the password for your Glamour Homecare account (<strong>${to}</strong>). Enter the verification code below to authorize the password update:
      </p>

      <!-- OTP Box -->
      <div style="text-align: center; margin: 28px 0; background: #fff1f2; border: 1.5px dashed #f43f5e; border-radius: 12px; padding: 18px 24px;">
        <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #be123c;">
          ${otp}
        </span>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.4;">
          ⏱ <strong>10-Minute Expiry:</strong> This security code will expire in 10 minutes. For your security, entering an invalid code 3 times will lock this reset token.
        </p>
      </div>

      <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #64748b;">
        If you did not request this password reset, please disregard this email or notify your clinical administrator immediately. Your password remains unchanged.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
      <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
        Glamour Homecare, LLC • Centralized Clinical Portal<br>
        This is an automated security transmission. Please do not reply directly to this email.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
Glamour Homecare Portal - Password Reset Code

Your 6-digit verification code is: ${otp}

This code is valid for 10 minutes. If you did not request this password reset, please ignore this email.

Glamour Homecare, LLC
  `.trim();

  if (!resend) {
    console.warn(
      `[Resend Notice] RESEND_API_KEY is not configured in environment. In-memory OTP for ${to}: [${otp}]`
    );
    return {
      success: true,
      simulated: true,
      message: "Email logged to console (RESEND_API_KEY not configured)",
    };
  }

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (result.error) {
      console.error("[Resend Error]", result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, id: result.data?.id };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to dispatch email.";
    console.error("[Resend Exception]", errorMsg);
    return { success: false, error: errorMsg };
  }
}
