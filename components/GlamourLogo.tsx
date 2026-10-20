import React from "react";

export function GlamourLogo({
  className = "h-9 w-auto",
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-pink-50 border border-pink-200 shadow-sm shrink-0">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 text-pink-600"
        >
          {/* Medical cross + care heart motif */}
          <path
            d="M16 26.5C16 26.5 5 19.5 5 12C5 8 8 5 12 5C14.5 5 16 6.5 16 6.5C16 6.5 17.5 5 20 5C24 5 27 8 27 12C27 19.5 16 26.5 16 26.5Z"
            fill="#FCE7F3"
            stroke="#DB2777"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Subtle medical cross inside heart */}
          <path
            d="M16 9.5V17.5M12 13.5H20"
            stroke="#DB2777"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-tight text-zinc-900 text-lg leading-tight">
              GLAMOUR
            </span>
            <span className="font-semibold tracking-tight text-pink-600 text-lg leading-tight">
              HOMECARE
            </span>
          </div>
          <span className="text-[10px] font-medium tracking-wide uppercase text-zinc-500">
            Staff & Caregiver Portal
          </span>
        </div>
      )}
    </div>
  );
}
