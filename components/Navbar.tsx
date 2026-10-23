"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlamourLogo } from "./GlamourLogo";
import { logoutAction } from "@/lib/actions/auth-actions";
import { LogOut, ShieldCheck, HeartHandshake, User } from "lucide-react";

interface NavbarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function Navbar({ user }: NavbarProps) {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      window.location.href = "/login";
    });
  };

  const isAdmin = user.role === "ADMIN";
  const isOnAdmin = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href={isAdmin ? "/admin" : "/app"} className="focus:outline-hidden">
              <GlamourLogo size={38} />
            </Link>
          </div>

          {/* User Profile & Actions - Single Unified Spot */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Admin Portal Switcher */}
            {isAdmin && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/70 text-xs font-medium">
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    isOnAdmin
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Admin Portal
                </Link>
                <Link
                  href="/app"
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
                    !isOnAdmin
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Caregiver View
                </Link>
              </div>
            )}

            {/* User Profile Badge (Unified Header Spot) */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 leading-tight max-w-[120px] sm:max-w-none truncate">
                  {user.name}
                </span>
                <span className="text-[10px] flex items-center gap-1">
                  {isAdmin ? (
                    <span className="text-rose-600 font-semibold flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3 inline text-rose-600" /> Admin
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium flex items-center gap-0.5">
                      <HeartHandshake className="w-3 h-3 inline text-slate-500" /> Caregiver
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isPending}
              title="Sign Out"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 sm:px-3 sm:py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 active:bg-slate-200 transition-colors focus:outline-hidden cursor-pointer min-h-[38px]"
            >
              <LogOut className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="hidden sm:inline">
                {isPending ? "Signing out..." : "Sign Out"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile-Only Sub-Header Switcher for Admin */}
      {isAdmin && (
        <div className="sm:hidden flex items-center justify-around border-t border-slate-200/80 bg-slate-50/90 py-1.5 px-3 text-xs font-semibold">
          <Link
            href="/admin"
            className={`px-4 py-1.5 rounded-md transition-all text-xs font-semibold ${
              isOnAdmin
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Admin Dashboard
          </Link>
          <Link
            href="/app"
            className={`px-4 py-1.5 rounded-md transition-all text-xs font-semibold ${
              !isOnAdmin
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Caregiver View
          </Link>
        </div>
      )}
    </header>
  );
}
