"use client";

import React, { useState, useTransition } from "react";
import { GlamourLogo } from "@/components/GlamourLogo";
import { loginAction } from "@/lib/actions/auth-actions";
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, HeartHandshake } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    startTransition(async () => {
      const res = await loginAction({ email, password });
      if (res.success && res.redirectTo) {
        // Direct browser navigation replaces history to prevent back-button bounce
        window.location.replace(res.redirectTo);
      } else {
        setError(res.error || "Invalid email or password.");
      }
    });
  };

  // Quick select helper for testing/reviewing
  const setQuickCreds = (userEmail: string, pass: string = "Password123!") => {
    setEmail(userEmail);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      {/* Soft Pink Accent Bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-400 via-pink-600 to-rose-500 z-50" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-1">
          <GlamourLogo size={56} />
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md w-full">
        <div className="bg-white py-6 px-4 shadow-sm border border-pink-200/70 rounded-xl sm:py-8 sm:px-10">
          {error && (
            <div className="mb-5 rounded-md bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider"
              >
                Work Email
              </label>
              <div className="mt-1.5 relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
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
                  className="block w-full pl-9 pr-3 py-2.5 sm:py-2 border border-zinc-300 rounded-md text-base sm:text-sm placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider"
              >
                Password
              </label>
              <div className="mt-1.5 relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 sm:py-2 border border-zinc-300 rounded-md text-base sm:text-sm placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full min-h-[44px] flex justify-center items-center gap-2 py-3 sm:py-2.5 px-4 border border-transparent rounded-md shadow-xs text-sm font-semibold text-white bg-pink-600 hover:bg-pink-700 active:scale-98 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isPending ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Access Bar for Mobile / Desktop */}
          <div className="mt-5 pt-4 border-t border-zinc-200">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-center mb-2">
              Demo Accounts
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setQuickCreds("shavonnah@glamourhomecare.org")}
                className="flex items-center justify-between p-3 sm:py-2 sm:px-3 text-xs rounded-md border border-pink-200 bg-pink-50/70 hover:bg-pink-100 active:bg-pink-200 text-zinc-800 transition-colors text-left cursor-pointer min-h-[48px]"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 sm:w-4 sm:h-4 text-pink-600 shrink-0" />
                  <div>
                    <span className="font-semibold block text-zinc-900">Shavonnah (RN Owner)</span>
                    <span className="text-[11px] sm:text-[10px] text-zinc-500 font-mono">
                      shavonnah@glamourhomecare.org
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-pink-200/80 text-pink-800 px-2 py-0.5 rounded font-bold uppercase shrink-0">
                  ADMIN
                </span>
              </button>

              <button
                type="button"
                onClick={() => setQuickCreds("martha@glamourhomecare.org")}
                className="flex items-center justify-between p-3 sm:py-2 sm:px-3 text-xs rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 text-zinc-800 transition-colors text-left cursor-pointer min-h-[48px]"
              >
                <div className="flex items-center gap-2.5">
                  <HeartHandshake className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-600 shrink-0" />
                  <div>
                    <span className="font-semibold block text-zinc-900">Martha Jenkins</span>
                    <span className="text-[11px] sm:text-[10px] text-zinc-500 font-mono">
                      martha@glamourhomecare.org
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded font-bold uppercase shrink-0">
                  CAREGIVER
                </span>
              </button>

              <button
                type="button"
                onClick={() => setQuickCreds("gloria@glamourhomecare.org")}
                className="flex items-center justify-between p-3 sm:py-2 sm:px-3 text-xs rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 text-zinc-800 transition-colors text-left cursor-pointer min-h-[48px]"
              >
                <div className="flex items-center gap-2.5">
                  <HeartHandshake className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-600 shrink-0" />
                  <div>
                    <span className="font-semibold block text-zinc-900">Gloria Ramirez</span>
                    <span className="text-[11px] sm:text-[10px] text-zinc-500 font-mono">
                      gloria@glamourhomecare.org
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded font-bold uppercase shrink-0">
                  CAREGIVER
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-5 text-center text-xs text-zinc-400 flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>HIPAA Compliant • Authorized Personnel Only</span>
        </div>
      </div>
    </div>
  );
}
