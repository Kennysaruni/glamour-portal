"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GlamourLogo } from "./GlamourLogo";
import { logoutAction } from "@/lib/actions/auth-actions";
import { LogOut, ShieldCheck, HeartHandshake, User, ArrowLeftRight } from "lucide-react";

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
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      router.push("/login");
      router.refresh();
    });
  };

  const isAdmin = user.role === "ADMIN";
  const isOnAdmin = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-pink-200/60 shadow-xs no-print">
      {/* Soft Pink Accent Bar */}
      <div className="h-1 w-full bg-gradient-to-r from-pink-400 via-pink-600 to-rose-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Agency Info */}
          <div className="flex items-center gap-4">
            <Link href={isAdmin ? "/admin" : "/app"} className="focus:outline-hidden">
              <GlamourLogo />
            </Link>
            <div className="hidden md:flex items-center pl-4 border-l border-zinc-200 text-xs text-zinc-500 font-medium">
              <span>Fredericksburg, VA</span>
              <span className="mx-2 text-zinc-300">•</span>
              <span className="text-pink-700 font-semibold">Nurse-Owned Agency</span>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {/* Admin Portal Switcher */}
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
            <div className="flex items-center gap-2 pl-2">
              <div className="w-8 h-8 rounded-md bg-pink-100 text-pink-700 flex items-center justify-center font-semibold text-xs border border-pink-200">
                {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-zinc-900 leading-tight">
                  {user.name}
                </span>
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  {isAdmin ? (
                    <span className="text-pink-600 font-medium flex items-center gap-0.5">
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
              className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors focus:outline-hidden"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden sm:inline">
                {isPending ? "Signing out..." : "Sign Out"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
