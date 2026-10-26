import React from "react";
import Image from "next/image";

interface GlamourLogoProps {
  className?: string;
  showText?: boolean;
  size?: number;
  priority?: boolean;
}

export function GlamourLogo({
  className = "",
  showText = true,
  size = 42,
  priority = true,
}: GlamourLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center">
        <Image
          src="/Website-Icon.png"
          alt="Glamour Home Care Logo"
          width={size}
          height={size}
          className="object-contain"
          style={{ width: size, height: size }}
          priority={priority}
        />
      </div>
      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1">
            <span className="font-bold tracking-tight text-black text-base sm:text-lg leading-tight">
              GLAMOUR HOMECARE
            </span>
          </div>
          <span className="text-[10px] font-medium tracking-wide uppercase text-slate-400">
            Staff Portal
          </span>
        </div>
      )}
    </div>
  );
}

