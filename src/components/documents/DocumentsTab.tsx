import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/PageHeader";
import { Plus, Download, Trash2, Globe, Lock, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Doc = {
  id: string; name: string; category: string; file_url: string;
  is_public: boolean; created_at: string; version: number;
};

type Scope = { projectId?: string; productId?: string };

const CATEGORIES = ["legal", "financial", "technical", "report", "other"];

export function DocumentsTab({
  companyId, scope, canManage,
}: { companyId: string; scope: Scope; canManage: boolean }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    let q = supabase.from("documents").select("*").eq("company_id", companyId);
    if (scope.projectId) q = q.eq("project_id", scope.projectId);
    if (scope.productId) q = q.eq("product_id", scope.productId);
    const { data } = await q.order("created_at", { ascending: false });
    setDocs((data ?? []) as Doc[]);
  };
  useEffect(() => { load(); }, [companyId, scope.projectId, scope.productId]);

  const remove = async (d: Doc) => {
    if (!confirm(`Delete "${d.name}"?`)) return;
    // try to remove from storage too
    try {
      const url = new URL(d.file_url);
      const idx = url.pathname.indexOf("/documents/");
      if (idx >= 0) {
        const path = decodeURIComponent(url.pathname.slice(idx + "/documents/".length));
        await supabase.storage.from("documents").remove([path]);
      }
    } catch {}
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Document deleted");
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Documents</h2>
        {canManage && (
          <Button onClick={() => setOpen(true)}><Plus className="size-4 mr-2" /> Upload</Button>
        )}
      </div>

      {docs.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Upload licenses, contracts, reports. Public ones appear in the catalog."
        />
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/40">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Visibility</th>
                <th className="px-6 py-3">Uploaded</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {docs.map(d => (
                <tr key={d.id} className="hover:bg-secondary/40">
                  <td className="px-6 py-4 font-medium flex items-center gap-2"><FileText className="size-4 text-muted-foreground" /> {d.name}</td>
                  <td className="px-6 py-4 text-muted-foreground capitalize">{d.category}</td>
                  <td className="px-6 py-4">
                    {d.is_public ? (
                      <span className="inline-flex items-center gap-1 text-success text-xs"><Globe className="size-3" /> Public</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs"><Lock className="size-3" /> Private</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost"><Download className="size-4" /></Button>
                    </a>
                    {canManage && (
                      <Button size="sm" variant="ghost" onClick={() => remove(d)} className="text-destructive">
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UploadDialog
        open={open}
        onOpenChange={setOpen}
        companyId={companyId}
        scope={scope}
        userId={user?.id}
        onUploaded={load}
        loading={loading}
        setLoading={setLoading}
      />
    </div>
  );
}

function UploadDialog({
  open, onOpenChange, companyId, scope, userId, onUploaded, loading, setLoading,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  companyId: string; scope: Scope; userId?: string;
  onUploaded: () => void;
  loading: boolean; setLoading: (v: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [isPublic, setIsPublic] = useState(true);

  const reset = () => { setFile(null); setName(""); setCategory("other"); setIsPublic(true); };

  const submit = async () => {
    if (!file) return toast.error("Choose a file");
    if (!name.trim()) return toast.error("Name is required");
    setLoading(true);
    try {
      const scopeFolder = scope.productId ? `products/${scope.productId}` : `projects/${scope.projectId}`;
      const path = `${companyId}/${scopeFolder}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, {
        cacheControl: "3600", upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("documents").getPublicUrl(path);

      const { error: insErr } = await supabase.from("documents").insert({
        company_id: companyId,
        project_id: scope.projectId ?? null,
        product_id: scope.productId ?? null,
        name: name.trim(),
        category,
        file_url: pub.publicUrl,
        is_public: isPublic,
        uploaded_by: userId ?? null,
      });
      if (insErr) throw insErr;

      toast.success("Document uploaded");
      reset();
      onOpenChange(false);
      onUploaded();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>File</Label>
            <Input type="file" onChange={e => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
            }} />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Environmental license 2025" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Public document</p>
              <p className="text-xs text-muted-foreground">Visible in the catalog to anyone</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Uploading…" : "Upload"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
