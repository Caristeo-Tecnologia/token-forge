import { cn } from "@/lib/utils";

export const FARMCHAIN_BRAND = "Farmchain";

type FarmchainLogoImgProps = {
  className?: string;
  alt?: string;
};

/** Logo em `public/Logo.png`. */
export function FarmchainLogoImg({ className, alt = FARMCHAIN_BRAND }: FarmchainLogoImgProps) {
  return (
    <img
      src="/Logo.png"
      alt={alt}
      className={cn("h-8 w-auto object-contain shrink-0", className)}
    />
  );
}
