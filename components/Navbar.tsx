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

            {/* Desktop User Profile Badge */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 leading-tight">
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

            {/* Mobile Character Avatar (e.g. M for Martha Jenkins next to sign out button) */}
            <div
              className="sm:hidden w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs"
              title={user.name}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isPending}
              title="Sign Out"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 active:bg-slate-200 transition-colors focus:outline-hidden cursor-pointer min-h-[36px] sm:min-h-[38px]"
            >
              <LogOut className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs font-medium">
                {isPending ? "Signing out..." : "Sign Out"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile-Only Sub-Header: Welcome, {Name} & View Switcher */}
      <div className="sm:hidden border-t border-slate-200/80 bg-slate-50/95 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-slate-500 font-normal">Welcome,</span>
          <span className="font-semibold text-slate-900 truncate">{user.name}</span>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold shrink-0 ml-2">
            <Link
              href="/admin"
              className={`px-2 py-0.5 rounded transition-all ${
                isOnAdmin
                  ? "bg-rose-600 text-white shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Admin
            </Link>
            <Link
              href="/app"
              className={`px-2 py-0.5 rounded transition-all ${
                !isOnAdmin
                  ? "bg-rose-600 text-white shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Caregiver
            </Link>
          </div>
        ) : (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-600 shrink-0 ml-2">
            Caregiver
          </span>
        )}
      </div>
    </header>
  );
}
