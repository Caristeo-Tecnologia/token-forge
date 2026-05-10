import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiStepForm } from "@/components/ui/multi-step-form";
import { LightLogin } from "@/components/ui/sign-in";
import { toast } from "sonner";
import { z } from "zod";
import { fetchPostLoginPathForUser } from "@/lib/auth-routes";
import { Building2, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const signinSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
});

const signupStep2Schema = z.object({
  fullName: z.string().trim().min(1, "Required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** Field styling for signup / OAuth profile wizards only (does not change global Input) */
const AUTH_WIZARD_INPUT_CLASS =
  "h-11 rounded-lg border-input bg-muted/40 shadow-sm transition-shadow md:text-sm";

type AccountRole = "buyer" | "supplier";

function OAuthCompleteRegistration({
  userId,
  email,
  defaultName,
  refreshSession,
}: {
  userId: string;
  email: string;
  defaultName: string;
  refreshSession: () => Promise<void>;
}) {
  const nav = useNavigate();
  const { setActiveCompanyId } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<AccountRole | null>(null);
  const [fullName, setFullName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [cnpj, setCnpj] = useState("");

  const titles = ["Account type", "Your details", "Review"];
  const desc = [
    "Choose whether you are registering as a buyer or a supplier.",
    "Complete your profile to finish registration.",
    "Confirm and create your profile.",
  ];

  const runSubmit = async () => {
    if (!role) return;
    setLoading(true);
    try {
      if (role === "buyer") {
        const { error } = await supabase.from("customers").insert({
          user_id: userId,
          name: fullName.trim() || null,
          email,
          phone: phone.trim() || null,
          account_status: "active",
        });
        if (error) throw error;
      } else {
        const parsed = z
          .object({
            companyName: z.string().trim().min(2).max(100),
            companySlug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, "Slug: lowercase, numbers, hyphens"),
          })
          .safeParse({ companyName, companySlug });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          setLoading(false);
          return;
        }
        const { error: sErr } = await supabase.from("suppliers").insert({
          user_id: userId,
          company_name: parsed.data.companyName,
          fantasy_name: parsed.data.companyName,
          email,
          phone: phone.trim() || null,
          cnpj: cnpj.trim() || null,
          status: "pending",
        });
        if (sErr) throw sErr;
        const { data: companyId, error: rpcErr } = await supabase.rpc("create_company_with_owner", {
          _name: parsed.data.companyName,
          _slug: parsed.data.companySlug,
        });
        if (rpcErr) throw rpcErr;
        if (companyId) setActiveCompanyId(companyId as string);
      }
      await refreshSession();
      const path = await fetchPostLoginPathForUser(userId);
      toast.success("Profile saved");
      nav(path, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not complete registration";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (loading) return;
    if (step === 1) {
      if (!role) {
        toast.error("Select buyer or supplier");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (role === "buyer") {
        const p = z.object({ fullName: z.string().trim().min(1).max(100) }).safeParse({ fullName });
        if (!p.success) {
          toast.error(p.error.issues[0].message);
          return;
        }
      } else {
        const p = z
          .object({
            fullName: z.string().trim().min(1).max(100),
            companyName: z.string().trim().min(2).max(100),
            companySlug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/),
          })
          .safeParse({ fullName, companyName, companySlug });
        if (!p.success) {
          toast.error(p.error.issues[0].message);
          return;
        }
      }
      setStep(3);
      return;
    }
    await runSubmit();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-6">
      <MultiStepForm
        currentStep={step}
        totalSteps={totalSteps}
        title={titles[step - 1]}
        description={desc[step - 1]}
        onBack={handleBack}
        onNext={() => void handleNext()}
        size="sm"
        backButtonText="Back"
        nextButtonText={step === 3 ? (loading ? "Saving…" : "Finish") : "Continue"}
        footerContent={
          <span className="text-xs text-muted-foreground">Signed in as {email}</span>
        }
      >
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setRole("buyer")}
              className={cn(
                "rounded-xl border-2 p-6 text-left transition-colors hover:bg-muted/50",
                role === "buyer" ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <ShoppingBag className="size-8 mb-3 text-primary" />
              <p className="font-semibold">Buyer</p>
              <p className="text-sm text-muted-foreground mt-1">Browse offerings and manage your portfolio.</p>
            </button>
            <button
              type="button"
              onClick={() => setRole("supplier")}
              className={cn(
                "rounded-xl border-2 p-6 text-left transition-colors hover:bg-muted/50",
                role === "supplier" ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <Building2 className="size-8 mb-3 text-primary" />
              <p className="font-semibold">Supplier</p>
              <p className="text-sm text-muted-foreground mt-1">Tokenize assets; approval required by platform admin.</p>
            </button>
          </div>
        )}
        {step === 2 && role === "buyer" && (
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="oauth-name">Full name</Label>
              <Input className={AUTH_WIZARD_INPUT_CLASS} id="oauth-name" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oauth-phone">Phone (optional)</Label>
              <Input className={AUTH_WIZARD_INPUT_CLASS} id="oauth-phone" value={phone} onChange={e => setPhone(e.target.value)} maxLength={40} />
            </div>
          </div>
        )}
        {step === 2 && role === "supplier" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oauth-s-name">Contact name</Label>
              <Input className={AUTH_WIZARD_INPUT_CLASS} id="oauth-s-name" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oauth-co">Company name</Label>
              <Input
                className={AUTH_WIZARD_INPUT_CLASS}
                id="oauth-co"
                value={companyName}
                onChange={e => {
                  setCompanyName(e.target.value);
                  if (!slugTouched) setCompanySlug(slugify(e.target.value));
                }}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oauth-slug">Company slug</Label>
              <Input
                className={AUTH_WIZARD_INPUT_CLASS}
                id="oauth-slug"
                value={companySlug}
                onChange={e => {
                  setSlugTouched(true);
                  setCompanySlug(e.target.value);
                }}
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">Used in URLs. Lowercase letters, numbers, hyphens.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="oauth-ph">Phone (optional)</Label>
              <Input className={AUTH_WIZARD_INPUT_CLASS} id="oauth-ph" value={phone} onChange={e => setPhone(e.target.value)} maxLength={40} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oauth-cnpj">CNPJ (optional)</Label>
              <Input className={AUTH_WIZARD_INPUT_CLASS} id="oauth-cnpj" value={cnpj} onChange={e => setCnpj(e.target.value)} maxLength={20} />
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Type:</span> {role === "buyer" ? "Buyer" : "Supplier"}
            </p>
            <p>
              <span className="text-muted-foreground">Name:</span> {fullName}
            </p>
            {role === "supplier" ? (
              <>
                <p>
                  <span className="text-muted-foreground">Company:</span> {companyName}
                </p>
                <p>
                  <span className="text-muted-foreground">Slug:</span> {companySlug}
                </p>
              </>
            ) : null}
          </div>
        )}
      </MultiStepForm>
    </div>
  );
}

function SignupWizard({
  onSwitchToSignIn,
}: {
  onSwitchToSignIn: () => void;
}) {
  const nav = useNavigate();
  const { refreshMemberships, setActiveCompanyId } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<AccountRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [cnpj, setCnpj] = useState("");

  const titles = ["Account type", "Account", "Details", "Review"];
  const desc = [
    "Choose buyer or supplier.",
    "Email and password.",
    role === "supplier" ? "Company information." : "Optional contact details.",
    "Confirm and create your account.",
  ];

  const handleCompanyName = (v: string) => {
    setCompanyName(v);
    if (!slugTouched) setCompanySlug(slugify(v));
  };

  const submitSignup = async () => {
    if (!role) return;
    const base = signupStep2Schema.safeParse({ fullName, email, password });
    if (!base.success) {
      toast.error(base.error.issues[0].message);
      return;
    }
    if (role === "supplier") {
      const p = z
        .object({
          companyName: z.string().trim().min(2).max(100),
          companySlug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/),
        })
        .safeParse({ companyName, companySlug });
      if (!p.success) {
        toast.error(p.error.issues[0].message);
        return;
      }
    }

    setLoading(true);
    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: base.data.email,
        password: base.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: { full_name: base.data.fullName },
        },
      });
      if (signUpErr) throw signUpErr;

      if (!signUpData.session) {
        const { error: siErr } = await supabase.auth.signInWithPassword({
          email: base.data.email,
          password: base.data.password,
        });
        if (siErr) {
          toast.success("Account created. Confirm your email if required, then sign in.");
          return;
        }
      }

      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) {
        toast.success("Account created. Please sign in to finish setup.");
        return;
      }

      if (role === "buyer") {
        const { error: cErr } = await supabase.from("customers").insert({
          user_id: uid,
          name: base.data.fullName,
          email: base.data.email,
          phone: phone.trim() || null,
          account_status: "active",
        });
        if (cErr) throw cErr;
      } else {
        const { error: sErr } = await supabase.from("suppliers").insert({
          user_id: uid,
          company_name: companyName.trim(),
          fantasy_name: companyName.trim(),
          email: base.data.email,
          phone: phone.trim() || null,
          cnpj: cnpj.trim() || null,
          status: "pending",
        });
        if (sErr) throw sErr;
        const { data: companyId, error: rpcErr } = await supabase.rpc("create_company_with_owner", {
          _name: companyName.trim(),
          _slug: companySlug.trim(),
        });
        if (rpcErr) throw rpcErr;
        if (companyId) setActiveCompanyId(companyId as string);
      }

      await refreshMemberships();
      const path = await fetchPostLoginPathForUser(uid);
      toast.success("Account created");
      nav(path, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (loading) return;
    if (step === 1) {
      if (!role) {
        toast.error("Select buyer or supplier");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const p = signupStep2Schema.safeParse({ fullName, email, password });
      if (!p.success) {
        toast.error(p.error.issues[0].message);
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      if (role === "supplier") {
        const p = z
          .object({
            companyName: z.string().trim().min(2).max(100),
            companySlug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/),
          })
          .safeParse({ companyName, companySlug });
        if (!p.success) {
          toast.error(p.error.issues[0].message);
          return;
        }
      }
      setStep(4);
      return;
    }
    await submitSignup();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-6">
      <div className="w-full max-w-[700px] flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="self-start h-auto py-1.5 px-2 text-muted-foreground hover:text-foreground"
          onClick={onSwitchToSignIn}
        >
          ← Back to sign in
        </Button>
        <MultiStepForm
          currentStep={step}
          totalSteps={totalSteps}
          title={titles[step - 1]}
          description={desc[step - 1]}
          onBack={handleBack}
          onNext={() => void handleNext()}
          nextButtonText={step === 4 ? (loading ? "Creating…" : "Create account") : "Continue"}
          backButtonText="Back"
          footerContent={<span className="text-xs text-muted-foreground">Farmchain registration</span>}
        >
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setRole("buyer")}
              className={cn(
                "rounded-xl border-2 p-6 text-left transition-colors hover:bg-muted/50",
                role === "buyer" ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <ShoppingBag className="size-8 mb-3 text-primary" />
              <p className="font-semibold">Buyer</p>
              <p className="text-sm text-muted-foreground mt-1">Shop tokenized offerings without creating a company workspace.</p>
            </button>
            <button
              type="button"
              onClick={() => setRole("supplier")}
              className={cn(
                "rounded-xl border-2 p-6 text-left transition-colors hover:bg-muted/50",
                role === "supplier" ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <Building2 className="size-8 mb-3 text-primary" />
              <p className="font-semibold">Supplier</p>
              <p className="text-sm text-muted-foreground mt-1">Company workspace + pending approval for marketplace.</p>
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="su-name">Full name</Label>
              <Input className={AUTH_WIZARD_INPUT_CLASS} id="su-name" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-email">Email</Label>
              <Input className={AUTH_WIZARD_INPUT_CLASS} id="su-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-pass">Password</Label>
              <Input className={AUTH_WIZARD_INPUT_CLASS} id="su-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" minLength={8} />
            </div>
          </div>
        )}
        {step === 3 && role === "buyer" && (
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="su-phone">Phone (optional)</Label>
              <Input className={AUTH_WIZARD_INPUT_CLASS} id="su-phone" value={phone} onChange={e => setPhone(e.target.value)} maxLength={40} />
            </div>
          </div>
        )}
        {step === 3 && role === "supplier" && (
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="su-co">Company name</Label>
              <Input className={AUTH_WIZARD_INPUT_CLASS} id="su-co" value={companyName} onChange={e => handleCompanyName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-slug">Company slug</Label>
              <Input
                className={AUTH_WIZARD_INPUT_CLASS}
                id="su-slug"
                value={companySlug}
                onChange={e => {
                  setSlugTouched(true);
                  setCompanySlug(e.target.value);
                }}
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">Used in URLs. Lowercase letters, numbers, hyphens.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-ph">Phone (optional)</Label>
              <Input className={AUTH_WIZARD_INPUT_CLASS} id="su-ph" value={phone} onChange={e => setPhone(e.target.value)} maxLength={40} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="su-cnpj">CNPJ (optional)</Label>
              <Input className={AUTH_WIZARD_INPUT_CLASS} id="su-cnpj" value={cnpj} onChange={e => setCnpj(e.target.value)} maxLength={20} />
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Type:</span> {role === "buyer" ? "Buyer" : "Supplier"}
            </p>
            <p>
              <span className="text-muted-foreground">Name:</span> {fullName}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span> {email}
            </p>
            {role === "supplier" ? (
              <>
                <p>
                  <span className="text-muted-foreground">Company:</span> {companyName}
                </p>
                <p>
                  <span className="text-muted-foreground">Slug:</span> {companySlug}
                </p>
              </>
            ) : null}
          </div>
        )}
        </MultiStepForm>
      </div>
    </div>
  );
}

export default function Auth() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, sessionReady, needsRegistrationCompletion, postLoginPath, refreshMemberships } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(() =>
    searchParams.get("signup") === "1" || searchParams.get("mode") === "signup" ? "signup" : "signin",
  );

  useEffect(() => {
    if (searchParams.get("signup") === "1" || searchParams.get("mode") === "signup") setMode("signup");
  }, [searchParams]);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInLoading, setSignInLoading] = useState(false);

  useEffect(() => {
    document.title = mode === "signin" ? "Sign in · Farmchain" : "Create account · Farmchain";
  }, [mode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const hash = window.location.hash;
      if (session && hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    });
  }, []);

  if (loading || (user && !sessionReady)) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (user && needsRegistrationCompletion) {
    const meta = user.user_metadata as { full_name?: string };
    const defaultName = typeof meta?.full_name === "string" ? meta.full_name : "";
    return (
      <OAuthCompleteRegistration
        userId={user.id}
        email={user.email ?? ""}
        defaultName={defaultName}
        refreshSession={refreshMemberships}
      />
    );
  }

  if (user && postLoginPath && !needsRegistrationCompletion) {
    return <Navigate to={postLoginPath} replace />;
  }

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignInError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const parsed = signinSchema.safeParse({ email, password });
    if (!parsed.success) {
      setSignInError(parsed.error.issues[0].message);
      return;
    }
    setSignInLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
      if (error) throw error;
      toast.success("Welcome back");
      await refreshMemberships();
      const { data: s2 } = await supabase.auth.getSession();
      if (!s2.session?.user) {
        toast.error("Session missing after sign-in");
        return;
      }
      const path = await fetchPostLoginPathForUser(s2.session.user.id);
      nav(path, { replace: true });
    } catch (err: unknown) {
      setSignInError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSignInLoading(false);
    }
  };

  const googleOAuth = async () => {
    setSignInError(null);
    setSignInLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setSignInError(err instanceof Error ? err.message : "Google sign-in failed");
      setSignInLoading(false);
    }
  };

  if (mode === "signup") {
    return <SignupWizard onSwitchToSignIn={() => setMode("signin")} />;
  }

  return (
    <LightLogin
      loading={signInLoading}
      error={signInError}
      onSubmit={signIn}
      onGoogleClick={() => void googleOAuth()}
      onSwitchToSignUp={() => setMode("signup")}
    />
  );
}
