import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
  fullName: z.string().trim().min(1, "Required").max(100).optional(),
});

export default function Auth() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = "Sign in · Aetheria"; }, []);

  if (user) return <Navigate to="/app" replace />;

  const submit = async (e: React.FormEvent<HTMLFormElement>, mode: "signin" | "signup") => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const fullName = mode === "signup" ? String(fd.get("fullName") ?? "") : undefined;

    const parsed = schema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
      nav("/app");
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
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
              <form onSubmit={(e) => submit(e, "signin")} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={(e) => submit(e, "signup")} className="space-y-4 mt-4">
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
                  <Input id="password-up" name="password" type="password" required autoComplete="new-password" minLength={8} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
