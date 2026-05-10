import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ButtonCtaProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  className?: string;
}

function ButtonCta({ label = "Get Access", className, ...props }: ButtonCtaProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "group relative w-1/2 h-12 px-4 rounded-lg overflow-hidden transition-all duration-500",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 rounded-lg p-[2px] bg-gradient-to-b from-[#D9C588] via-[#153530] to-[#053331]">
        <div className="absolute inset-0 bg-[#053331] rounded-lg opacity-90" />
      </div>

      <div className="absolute inset-[2px] bg-[#053331] rounded-lg opacity-95" />

      <div className="absolute inset-[2px] bg-gradient-to-r from-[#053331] via-[#153530] to-[#053331] rounded-lg opacity-90" />
      <div className="absolute inset-[2px] bg-gradient-to-b from-[#D2BC8D]/35 via-[#153530]/80 to-[#053331]/90 rounded-lg opacity-80" />
      <div className="absolute inset-[2px] bg-gradient-to-br from-[#D9C588]/15 via-[#153530]/50 to-[#053331]/60 rounded-lg" />

      <div className="absolute inset-[2px] shadow-[inset_0_0_15px_rgba(217,197,136,0.2)] rounded-lg" />

      <div className="relative flex items-center justify-center gap-2">
        <span className="text-lg font-light bg-gradient-to-b from-[#F5ECD4] to-[#D9C588] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(217,197,136,0.35)] tracking-tighter">
          {label}
        </span>
      </div>

      <div className="absolute inset-[2px] opacity-0 transition-opacity duration-300 bg-gradient-to-r from-[#053331]/40 via-[#D9C588]/15 to-[#053331]/40 group-hover:opacity-100 rounded-lg" />
    </Button>
  );
}

export { ButtonCta };
