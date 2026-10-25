"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { sendPasswordResetOtpEmail } from "@/lib/email";
import { checkPasswordResetRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit";

export interface RequestResetResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface VerifyResetResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Initiates the forgot-password workflow:
 * 1. Enforces rate limiting (max 5 requests per hour).
 * 2. Generates cryptographically secure 6-digit numeric OTP.
 * 3. Hashes with SHA-256 and persists in PasswordResetToken with 10-minute expiry.
 * 4. Dispatches professional OTP email via Resend.
 */
export async function requestPasswordReset(email: string): Promise<RequestResetResult> {
  if (!email || !email.includes("@")) {
    return { success: false, error: "Please provide a valid email address." };
  }

  const cleanEmail = email.trim().toLowerCase();

  // Extract client IP and apply rate limiting
  const headersList = await headers();
  const clientIp = getClientIpFromHeaders(headersList);

  const rateCheck = checkPasswordResetRateLimit(clientIp, cleanEmail);
  if (!rateCheck.success) {
    return {
      success: false,
      error: `Too many password reset requests. Please wait ${Math.ceil(
        rateCheck.resetInSeconds / 60
      )} minutes before trying again.`,
    };
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, name: true, isActive: true },
    });

    // To prevent account enumeration, return success even if user not found, but don't send email
    if (!user) {
      return {
        success: true,
        message: "If an account exists with this email, a 6-digit verification code has been sent.",
      };
    }

    if (!user.isActive) {
      return {
        success: false,
        error: "This account is inactive. Please contact your clinical administrator.",
      };
    }

    // Generate secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const tokenHash = crypto.createHash("sha256").update(rawOtp).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean up existing reset tokens for this email and save new one
    await (prisma as any).passwordResetToken.deleteMany({
      where: { email: cleanEmail },
    });

    await (prisma as any).passwordResetToken.create({
      data: {
        email: cleanEmail,
        tokenHash,
        expiresAt,
        attempts: 0,
      },
    });

    // Dispatch email via Resend
    const sendResult = await sendPasswordResetOtpEmail({
      to: cleanEmail,
      otp: rawOtp,
      name: user.name,
    });

    if (!sendResult.success) {
      return {
        success: false,
        error: sendResult.error || "Failed to dispatch verification email.",
      };
    }

    return {
      success: true,
      message: "A 6-digit security verification code has been sent to your email.",
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("[requestPasswordReset Error]", errorMsg);
    return { success: false, error: "Failed to process password reset request." };
  }
}

/**
 * Verifies the 6-digit OTP and applies the new password:
 * 1. Verifies token existence, 10-minute expiry, and attempts (< 3).
 * 2. Compares SHA-256 hash.
 * 3. Updates password hash in Better Auth account table.
 * 4. Invalidates token and revokes existing sessions.
 * 5. Logs audit event.
 */
export async function verifyAndResetPassword(
  email: string,
  otp: string,
  newPassword: string
): Promise<VerifyResetResult> {
  if (!email || !otp || !newPassword) {
    return { success: false, error: "Email, verification code, and new password are required." };
  }

  if (newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters long." };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim();

  if (!/^\d{6}$/.test(cleanOtp)) {
    return { success: false, error: "Verification code must be a 6-digit number." };
  }

  try {
    // Find active token
    const tokenRecord = await (prisma as any).passwordResetToken.findFirst({
      where: { email: cleanEmail },
      orderBy: { createdAt: "desc" },
    });

    if (!tokenRecord) {
      return {
        success: false,
        error: "No active verification code found for this email. Please request a new code.",
      };
    }

    // Check expiry
    if (new Date() > new Date(tokenRecord.expiresAt)) {
      await (prisma as any).passwordResetToken.delete({ where: { id: tokenRecord.id } });
      return {
        success: false,
        error: "This verification code has expired. Please request a new code.",
      };
    }

    // Check attempts lockout (3 invalid attempts)
    if (tokenRecord.attempts >= 3) {
      await (prisma as any).passwordResetToken.delete({ where: { id: tokenRecord.id } });
      return {
        success: false,
        error: "Too many incorrect attempts. This code has been invalidated. Please request a new code.",
      };
    }

    // Validate OTP hash
    const candidateHash = crypto.createHash("sha256").update(cleanOtp).digest("hex");
    if (candidateHash !== tokenRecord.tokenHash) {
      const remainingAttempts = 2 - tokenRecord.attempts;
      if (remainingAttempts <= 0) {
        await (prisma as any).passwordResetToken.delete({ where: { id: tokenRecord.id } });
        return {
          success: false,
          error: "Incorrect code. Maximum attempts exceeded. Please request a new verification code.",
        };
      }

      await (prisma as any).passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { attempts: { increment: 1 } },
      });

      return {
        success: false,
        error: `Incorrect verification code. ${remainingAttempts} attempt${
          remainingAttempts === 1 ? "" : "s"
        } remaining.`,
      };
    }

    // OTP is valid! Find user
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, name: true, role: true },
    });

    if (!user) {
      return { success: false, error: "User account not found." };
    }

    // Hash new password using bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in Better Auth Account table
    const account = await prisma.account.findFirst({
      where: { userId: user.id },
    });

    if (account) {
      await prisma.account.update({
        where: { id: account.id },
        data: { password: hashedPassword },
      });
    } else {
      // Create credential account if one didn't exist
      await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: hashedPassword,
        },
      });
    }

    // Invalidate the reset token immediately
    await (prisma as any).passwordResetToken.deleteMany({
      where: { email: cleanEmail },
    });

    // Invalidate all existing active sessions for this user to force re-login
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    // Record security audit log
    await (prisma.auditLog as any).create({
      data: {
        userId: user.id,
        action: "UPDATE_PASSWORD_RESET_OTP",
        entityType: "User",
        entityId: user.id,
        details: JSON.stringify({
          method: "EMAIL_OTP",
          email: cleanEmail,
          completedAt: new Date().toISOString(),
        }),
      },
    });

    return {
      success: true,
      message: "Your password has been successfully reset. You may now log in with your new password.",
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("[verifyAndResetPassword Error]", errorMsg);
    return { success: false, error: "Failed to reset password. Please try again." };
  }
}
