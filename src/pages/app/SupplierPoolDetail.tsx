import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Layers, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { canWrite, useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { DocumentsTab } from "@/components/documents/DocumentsTab";
import { fmtNum, fmtUsd } from "@/lib/platform";
import { uploadMarketplaceThumbnail } from "@/lib/storage-media";
import type { Database } from "@/integrations/supabase/types";

type Pool = Database["public"]["Tables"]["asset_pools"]["Row"];
type PoolStatus = Database["public"]["Enums"]["pool_status"];

const STATUS_OPTIONS: PoolStatus[] = ["approved", "tokenized", "paused", "sold_out"];
const ASSET_CLASS_SUGGESTIONS = ["Gold", "Silver", "Lithium", "Quartz", "Other"];

export default function SupplierPoolDetail() {
  const { id } = useParams<{ id: string }>();
  const { activeRole } = useAuth();
  const editable = canWrite(activeRole);

  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit form fields
  const [listingTitle, setListingTitle] = useState("");
  const [listingBody, setListingBody] = useState("");
  /** URL já guardada; mantém-se se não houver novo ficheiro. */
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [assetClassName, setAssetClassName] = useState("");
  const [status, setStatus] = useState<PoolStatus>("approved");
  const [marketplaceListed, setMarketplaceListed] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase.from("asset_pools").select("*").eq("id", id).maybeSingle();
    if (error) console.error(error);
    setPool((data ?? null) as Pool | null);
    if (data) {
      setListingTitle(data.listing_title ?? "");
      setListingBody(data.listing_body ?? "");
      setThumbnailUrl(data.thumbnail_url ?? "");
      setAssetClassName(data.asset_class_name ?? "");
      setStatus(data.status);
      setMarketplaceListed(data.marketplace_listed);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  useEffect(() => {
    document.title = "Pool detail · Farmchain";
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = async () => {
    if (!pool) return;
    if (thumbnailFile && !pool.company_id) {
      toast.error("Esta pool não tem empresa associada — não é possível enviar imagens para o storage.");
      return;
    }

    setSaving(true);
    let nextThumbnailUrl = thumbnailUrl.trim() || null;
    try {
      if (thumbnailFile && pool.company_id) {
        const { publicUrl } = await uploadMarketplaceThumbnail(pool.company_id, thumbnailFile);
        nextThumbnailUrl = publicUrl;
      }
    } catch (err) {
      setSaving(false);
      toast.error(err instanceof Error ? err.message : "Falha no upload da imagem");
      return;
    }

    const { error } = await supabase
      .from("asset_pools")
      .update({
        listing_title: listingTitle.trim() || null,
        listing_body: listingBody.trim() || null,
        thumbnail_url: nextThumbnailUrl,
        asset_class_name: assetClassName.trim() || null,
        status,
        marketplace_listed: marketplaceListed,
        listed_at:
          marketplaceListed && !pool.listed_at ? new Date().toISOString() : pool.listed_at,
      })
      .eq("id", pool.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pool updated");
    setThumbnailFile(null);
    load();
  };

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-12 w-72 mb-6" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </PageContainer>
    );
  }

  if (!pool) {
    return (
      <PageContainer>
        <PageHeader title="Pool not found" />
        <Button asChild variant="outline">
          <Link to="/app/pools">
            <ArrowLeft className="size-4 mr-2" /> Back to pools
          </Link>
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/app/pools">
          <ArrowLeft className="size-4 mr-1" /> All pools
        </Link>
      </Button>

      <PageHeader
        title={pool.listing_title || pool.name}
        subtitle={`${pool.token_symbol} · ${pool.asset_class_name ?? "—"}`}
        actions={
          <Button asChild variant="outline">
            <Link to={`/marketplace/${pool.id}`} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4 mr-2" /> View public listing
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Badge variant="outline" className="capitalize">
          {pool.status.replace("_", " ")}
        </Badge>
        {pool.marketplace_listed ? (
          <Badge variant="secondary">Listed on marketplace</Badge>
        ) : (
          <Badge variant="outline">Unlisted</Badge>
        )}
        {!pool.product_id && (
          <Badge variant="destructive">Awaiting tenant provisioning — re-run migration</Badge>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="edit" disabled={!editable}>
            Edit
          </TabsTrigger>
          <TabsTrigger value="documents" disabled={!pool.product_id || !pool.company_id}>
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-5">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Layers className="size-4" /> Specifications
              </h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <SpecRow label="Token symbol" value={pool.token_symbol} />
                <SpecRow label="Token name" value={pool.token_name} />
                <SpecRow label="Asset class" value={pool.asset_class_name ?? "—"} />
                <SpecRow label="Status" value={pool.status.replace("_", " ")} />
                <SpecRow label="Total supply" value={fmtNum(Number(pool.total_supply))} />
                <SpecRow label="Available" value={fmtNum(Number(pool.available_supply))} />
                <SpecRow label="Unit price" value={fmtUsd(Number(pool.unit_price))} />
                {pool.physical_unit && (
                  <SpecRow
                    label="Physical unit"
                    value={`${fmtNum(Number(pool.physical_total ?? 0))} × ${pool.physical_unit}`}
                  />
                )}
              </dl>
            </div>
            <div className="glass-card p-5">
              <h3 className="font-semibold mb-3">Marketplace listing</h3>
              {pool.thumbnail_url && (
                <img
                  src={pool.thumbnail_url}
                  alt={pool.name}
                  className="w-full h-40 object-cover rounded-lg mb-3 border border-border/60"
                />
              )}
              <p className="text-sm font-medium">{pool.listing_title || pool.name}</p>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                {pool.listing_body || pool.description || "No listing description."}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Edit */}
        <TabsContent value="edit" className="mt-6">
          <div className="glass-card p-6 space-y-5 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="listing_title">Listing title</Label>
                <Input
                  id="listing_title"
                  value={listingTitle}
                  onChange={(e) => setListingTitle(e.target.value)}
                  placeholder={pool.name}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="listing_body">Listing body</Label>
                <Textarea
                  id="listing_body"
                  rows={4}
                  value={listingBody}
                  onChange={(e) => setListingBody(e.target.value)}
                  placeholder="Describe your offering for buyers."
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="thumbnail_file">Thumbnail</Label>
                <Input
                  id="thumbnail_file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={!pool.company_id}
                  className="cursor-pointer text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium disabled:opacity-50"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
                />
                {!pool.company_id ? (
                  <p className="text-xs text-muted-foreground">
                    Associe uma empresa à pool para poder carregar imagens para o storage.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG ou WebP — até 5 MB. Deixe em branco para manter a imagem atual.
                  </p>
                )}
                {(thumbnailPreviewUrl || thumbnailUrl) && (
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="rounded-lg border border-border overflow-hidden max-w-xs bg-muted/30">
                      <img
                        src={thumbnailPreviewUrl ?? thumbnailUrl}
                        alt=""
                        className="w-full h-40 object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      {thumbnailFile && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setThumbnailFile(null)}>
                          Cancelar novo ficheiro
                        </Button>
                      )}
                      {(thumbnailUrl || thumbnailFile) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setThumbnailFile(null);
                            setThumbnailUrl("");
                          }}
                        >
                          Remover imagem do anúncio
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground max-w-xs">
                        «Remover» limpa o thumbnail ao gravar (ou cancela o upload pendente).
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="asset_class">Asset class</Label>
                <Input
                  id="asset_class"
                  value={assetClassName}
                  onChange={(e) => setAssetClassName(e.target.value)}
                  list="asset-class-suggestions"
                  placeholder="Gold / Silver / Lithium / Quartz / …"
                />
                <datalist id="asset-class-suggestions">
                  {ASSET_CLASS_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as PoolStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Listed on marketplace</p>
                  <p className="text-xs text-muted-foreground">
                    When on, the pool appears in /marketplace for everyone.
                  </p>
                </div>
                <Switch checked={marketplaceListed} onCheckedChange={setMarketplaceListed} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                <Save className="size-4 mr-2" />
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="mt-6">
          {pool.product_id && pool.company_id ? (
            <DocumentsTab
              companyId={pool.company_id}
              scope={{ productId: pool.product_id }}
              canManage={editable}
            />
          ) : (
            <div className="glass-card p-8 text-center">
              <p className="font-semibold">Documents not yet available</p>
              <p className="text-sm text-muted-foreground mt-1">
                This pool is missing the company tenant bridge. Apply migration{" "}
                <code>20260514120000_supplier_tenant_provisioning.sql</code> to enable document
                uploads.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

    </PageContainer>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5 capitalize">{value}</dd>
    </div>
  );
}
