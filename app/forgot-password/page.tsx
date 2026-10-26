"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GlamourLogo } from "@/components/GlamourLogo";
import { requestPasswordReset } from "@/lib/actions/password-reset-actions";
import { Mail, ArrowRight, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid work email address.");
      return;
    }

    startTransition(async () => {
      const res = await requestPasswordReset(cleanEmail);
      if (res.success) {
        setSuccessMessage(
          res.message || "A 6-digit verification code has been dispatched to your email."
        );
        // Automatically redirect to reset password page with email prefilled
        setTimeout(() => {
          router.push(`/reset-password?email=${encodeURIComponent(cleanEmail)}`);
        }, 1200);
      } else {
        setError(res.error || "Failed to process password reset. Please try again.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-1">
          <GlamourLogo size={56} />
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md w-full">
        <div className="bg-white py-6 px-4 shadow-xs border border-slate-200/80 rounded-2xl sm:py-8 sm:px-10">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-900">Forgot Password</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your work email address and we'll dispatch a 6-digit numeric security code to verify your identity.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{successMessage}</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">Redirecting to code entry...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Registered Work Email
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@glamourhomecare.org"
                  className="block w-full pl-10 pr-3.5 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full min-h-[44px] flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg shadow-xs text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 active:bg-pink-800 focus:outline-none focus:ring-2 focus:ring-pink-500/30 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isPending ? (
                  <span>Sending Security Code...</span>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-pink-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
