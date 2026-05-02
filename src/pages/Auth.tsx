import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";

const signinSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
});

const signupSchema = signinSchema.extend({
  fullName: z.string().trim().min(1, "Required").max(100),
  companyName: z.string().trim().min(2, "Required").max(100),
  companySlug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens"),
});

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export default function Auth() {
  const { user, refreshMemberships, setActiveCompanyId } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => { document.title = "Sign in · Aetheria"; }, []);

  if (user) return <Navigate to="/app" replace />;

  const handleCompanyName = (v: string) => {
    setCompanyName(v);
    if (!slugTouched) setCompanySlug(slugify(v));
  };

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const parsed = signinSchema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back");
      nav("/app");
    } catch (err: any) {
      toast.error(err.message ?? "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const fullName = String(fd.get("fullName") ?? "");
    const parsed = signupSchema.safeParse({
      email, password, fullName, companyName, companySlug,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setLoading(true);
    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: { full_name: fullName },
        },
      });
      if (signUpErr) throw signUpErr;

      // If session not yet established (email confirmation required), try a sign-in
      if (!signUpData.session) {
        const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
        if (siErr) {
          toast.success("Account created. Please confirm your email, then sign in to finish setup.");
          return;
        }
      }

      // Ensure session is active before calling RPC
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        toast.success("Account created. Please sign in to finish setup.");
        return;
      }

      const { data: companyId, error: rpcErr } = await supabase.rpc("create_company_with_owner", {
        _name: companyName, _slug: companySlug,
      });
      if (rpcErr) throw rpcErr;

      if (companyId) setActiveCompanyId(companyId as string);
      await refreshMemberships();
      toast.success("Account & company created");
      nav("/app", { replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="size-10 bg-primary rounded-xl flex items-center justify-center">
            <div className="size-4 border-2 border-primary-foreground rounded-sm rotate-45" />
          </div>
          <span className="text-2xl font-semibold tracking-tight">Aetheria</span>
        </div>

        <div className="glass-card p-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Welcome</h1>
          <p className="text-sm text-muted-foreground mb-6">Tokenized asset offerings, structured.</p>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput id="password" name="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" name="fullName" required maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-up">Email</Label>
                  <Input id="email-up" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-up">Password</Label>
                  <PasswordInput id="password-up" name="password" required autoComplete="new-password" minLength={8} />
                </div>

                <div className="pt-2 border-t border-border/60" />

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company name</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => handleCompanyName(e.target.value)}
                    required
                    maxLength={100}
                    placeholder="Horizon Green Energy"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySlug">Company slug</Label>
                  <Input
                    id="companySlug"
                    value={companySlug}
                    onChange={(e) => { setSlugTouched(true); setCompanySlug(e.target.value); }}
                    required
                    maxLength={60}
                    placeholder="horizon-green"
                  />
                  <p className="text-xs text-muted-foreground">Used in URLs. Lowercase letters, numbers, hyphens.</p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating…" : "Create account & company"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
