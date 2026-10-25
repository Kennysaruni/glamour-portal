"use client";

import React, { useState, useTransition, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GlamourLogo } from "@/components/GlamourLogo";
import { verifyAndResetPassword } from "@/lib/actions/password-reset-actions";
import { Lock, Mail, KeyRound, AlertCircle, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanEmail) {
      setError("Email address is required.");
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      setError("Please enter the complete 6-digit numeric verification code.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The two passwords you entered do not match.");
      return;
    }

    startTransition(async () => {
      const res = await verifyAndResetPassword(cleanEmail, cleanOtp, newPassword);
      if (res.success) {
        setSuccess(
          res.message || "Your password has been successfully reset! Redirecting to sign in..."
        );
        setTimeout(() => {
          router.push("/login?reset=success");
        }, 1500);
      } else {
        setError(res.error || "Failed to reset password. Please check your code.");
      }
    });
  };

  return (
    <div className="bg-white py-6 px-4 shadow-xs border border-slate-200/80 rounded-2xl sm:py-8 sm:px-10">
      <div className="mb-6 text-center">
        <h2 className="text-lg font-bold text-slate-900">Set New Password</h2>
        <p className="text-xs text-slate-500 mt-1">
          Enter the 6-digit code sent to your email and choose a strong new password.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-5 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{success}</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">Redirecting to sign in page...</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Work Email
          </label>
          <div className="relative rounded-lg shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@glamourhomecare.org"
              className="block w-full pl-10 pr-3.5 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all bg-white"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="otp"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              6-Digit Security Code
            </label>
            <span className="text-[11px] text-slate-400">Expires in 10 mins</span>
          </div>
          <div className="relative rounded-lg shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <KeyRound className="h-4 w-4" />
            </div>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="block w-full pl-10 pr-3.5 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm font-mono tracking-widest text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all bg-white font-bold text-center sm:text-left"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            New Password (Min 8 characters)
          </label>
          <div className="relative rounded-lg shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="block w-full pl-10 pr-3.5 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all bg-white"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Confirm New Password
          </label>
          <div className="relative rounded-lg shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="block w-full pl-10 pr-3.5 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all bg-white"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending || success !== null}
            className="w-full min-h-[44px] flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg shadow-xs text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 transition-all disabled:opacity-60 cursor-pointer"
          >
            {isPending ? (
              <span>Verifying &amp; Updating...</span>
            ) : (
              <>
                <span>Save New Password</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
        <Link
          href="/forgot-password"
          className="hover:text-rose-600 transition-colors inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Resend Code</span>
        </Link>
        <Link href="/login" className="hover:text-rose-600 transition-colors">
          Return to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-1">
          <GlamourLogo size={56} />
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md w-full">
        <Suspense
          fallback={
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 text-center text-xs text-slate-500">
              Loading verification interface...
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
