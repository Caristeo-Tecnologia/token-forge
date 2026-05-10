import * as React from "react";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";

export interface LightLoginProps {
  loading?: boolean;
  /** Shown above the submit button */
  error?: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onGoogleClick: () => void;
  /** If omitted or false, GitHub button is hidden */
  showGithub?: boolean;
  onGithubClick?: () => void;
  onSwitchToSignUp: () => void;
}

export function LightLogin({
  loading = false,
  error,
  onSubmit,
  onGoogleClick,
  showGithub = false,
  onGithubClick,
  onSwitchToSignUp,
}: LightLoginProps) {
  return (
    <div className="min-h-screen flex items-center justify-center mesh-bg p-4 font-sans">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl overflow-hidden border border-border relative">
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent opacity-40 blur-3xl -mt-20 pointer-events-none" />
        <div className="p-8 relative">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-card p-3 rounded-2xl shadow-lg mb-6 border border-border">
              <img src="/Logo.png" alt="Logo" className="h-16 w-auto max-h-20 object-contain" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground text-center">Welcome Back</h2>
              <p className="text-center text-muted-foreground mt-2">Sign in to continue to your account</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-1">
              <label htmlFor="light-login-email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="light-login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={loading}
                className={cn(
                  "bg-muted/50 border border-input text-foreground placeholder:text-muted-foreground h-12 rounded-lg",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                  "w-full px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed",
                )}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label htmlFor="light-login-password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <span className="text-xs text-muted-foreground">Forgot password?</span>
              </div>
              <PasswordInput
                id="light-login-password"
                name="password"
                required
                autoComplete="current-password"
                disabled={loading}
                minLength={8}
                className="h-12 rounded-lg bg-muted/50 pr-10"
                placeholder="••••••••"
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full h-12 bg-gradient-to-t from-primary via-primary to-primary/90 hover:opacity-95",
                "text-primary-foreground font-medium rounded-lg transition-all duration-200 shadow-sm",
                "hover:shadow-md active:scale-[0.98]",
                "inline-flex items-center justify-center whitespace-nowrap text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>

            <div className="flex items-center my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="px-4 text-sm text-muted-foreground">or continue with</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className={cn("grid gap-3", showGithub ? "grid-cols-2" : "grid-cols-1")}>
              <button
                type="button"
                disabled={loading}
                onClick={onGoogleClick}
                className={cn(
                  "h-12 bg-background border border-input text-foreground hover:bg-muted rounded-lg",
                  "flex items-center justify-center gap-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:opacity-50",
                )}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span className="whitespace-nowrap">Google</span>
              </button>

              {showGithub ? (
                <button
                  type="button"
                  disabled={loading || !onGithubClick}
                  onClick={onGithubClick}
                  className={cn(
                    "h-12 bg-background border border-input text-foreground hover:bg-muted rounded-lg",
                    "flex items-center justify-center gap-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:opacity-50",
                  )}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.386-1.332-1.755-1.332-1.755-1.087-.744.084-.729.084-.729 1.205.085 1.84 1.236 1.84 1.236 1.07 1.835 2.809 1.305 3.493.997.108-.776.42-1.305.763-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.627-5.373-12-12-12z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="whitespace-nowrap">GitHub</span>
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-6">
            <p className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className="text-primary hover:underline font-medium bg-transparent border-0 cursor-pointer p-0"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
