import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Required").max(100),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
});

export default function Onboarding() {
  const { user, refreshMemberships, setActiveCompanyId } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "");
    const slug = String(fd.get("slug") ?? "");
    const parsed = schema.safeParse({ name, slug });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }

    setLoading(true);
    try {
      const { data: companyId, error } = await supabase.rpc("create_company_with_owner", {
        _name: name, _slug: slug,
      });
      if (error) throw error;

      await refreshMemberships();
      if (companyId) setActiveCompanyId(companyId as string);
      toast.success("Company created");
      nav("/app");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="glass-card p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Create your company</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Each company is an isolated white-label instance. You'll be the owner.
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" name="name" required maxLength={100} placeholder="Horizon Green Energy" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" required maxLength={60} placeholder="horizon-green" />
              <p className="text-xs text-muted-foreground">Used in URLs. Lowercase letters, numbers, hyphens.</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : "Create company"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
