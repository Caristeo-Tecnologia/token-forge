import { ReactNode } from "react";

export function LandingLayout({ children }: { children: ReactNode }) {
  return <div className="tokenizer-lp min-h-screen overflow-x-hidden font-landing antialiased">{children}</div>;
}
