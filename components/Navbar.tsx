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
    <header className="sticky top-0 z-40 bg-white border-b border-pink-200/60 shadow-xs no-print">
      {/* Soft Pink Accent Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-pink-400 via-pink-600 to-rose-500" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href={isAdmin ? "/admin" : "/app"} className="focus:outline-hidden">
              <GlamourLogo size={38} />
            </Link>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Admin Portal Switcher */}
            {isAdmin && (
              <div className="hidden sm:flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 text-xs font-medium">
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    isOnAdmin
                      ? "bg-white text-zinc-900 shadow-xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Admin Portal
                </Link>
                <Link
                  href="/app"
                  className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                    !isOnAdmin
                      ? "bg-white text-zinc-900 shadow-xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Caregiver View
                </Link>
              </div>
            )}

            {/* User Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs border border-pink-200 shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-zinc-900 leading-tight max-w-[110px] sm:max-w-none truncate">
                  {user.name}
                </span>
                <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                  {isAdmin ? (
                    <span className="text-pink-600 font-semibold flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3 inline" /> Admin
                    </span>
                  ) : (
                    <span className="text-zinc-600 font-medium flex items-center gap-0.5">
                      <HeartHandshake className="w-3 h-3 inline" /> Caregiver
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
              className="ml-1 sm:ml-2 inline-flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-md border border-zinc-200 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors focus:outline-hidden cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="hidden sm:inline">
                {isPending ? "Signing out..." : "Sign Out"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile-Only Sub-Header Switcher for Admin */}
      {isAdmin && (
        <div className="sm:hidden flex items-center justify-around border-t border-pink-100 bg-pink-50/60 py-1.5 px-3 text-xs font-semibold">
          <Link
            href="/admin"
            className={`px-4 py-1.5 rounded-md transition-all text-xs font-bold ${
              isOnAdmin
                ? "bg-pink-600 text-white shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Admin Dashboard
          </Link>
          <Link
            href="/app"
            className={`px-4 py-1.5 rounded-md transition-all text-xs font-bold ${
              !isOnAdmin
                ? "bg-pink-600 text-white shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Caregiver View
          </Link>
        </div>
      )}
    </header>
  );
}
