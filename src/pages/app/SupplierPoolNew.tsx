import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { uploadMarketplaceThumbnail } from "@/lib/storage-media";

const PHYSICAL_UNITS = ["gram", "troy_ounce", "kg", "ton"];
const ASSET_CLASSES = ["Gold", "Silver", "Lithium", "Quartz", "Other"];

export default function SupplierPoolNew() {
  const { activeCompany, supplierProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [assetClass, setAssetClass] = useState("Gold");
  const [tokenPrice, setTokenPrice] = useState("");
  const [physicalUnit, setPhysicalUnit] = useState("gram");
  const [physicalTotal, setPhysicalTotal] = useState("");
  const [tokensPerUnit, setTokensPerUnit] = useState("1");
  const [listingTitle, setListingTitle] = useState("");
  const [listingBody, setListingBody] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "New pool · Farmchain";
    if (!activeCompany?.id) return;
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("id")
        .eq("company_id", activeCompany.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      setDefaultProjectId(data?.id ?? null);
    })();
  }, [activeCompany?.id]);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeCompany?.id) {
      toast.error("No active company. Re-login.");
      return;
    }
    if (!defaultProjectId) {
      toast.error(
        "No project found for this tenant. Re-apply provisioning migration or create a project first.",
      );
      return;
    }
    const total = Number(physicalTotal);
    const perUnit = Number(tokensPerUnit);
    const price = Number(tokenPrice);
    if (!name.trim()) return toast.error("Name is required");
    if (!symbol.trim()) return toast.error("Symbol is required");
    if (!Number.isFinite(total) || total <= 0) return toast.error("Physical total must be > 0");
    if (!Number.isFinite(perUnit) || perUnit <= 0)
      return toast.error("Tokens per physical unit must be > 0");
    if (!Number.isFinite(price) || price <= 0) return toast.error("Token price must be > 0");

    const totalTokens = Math.floor(total * perUnit);
    const fundingTarget = Math.max(1, Math.round(totalTokens * price * 100) / 100);

    setSubmitting(true);
    let thumbnailPublicUrl: string | null = null;
    try {
      if (thumbnailFile) {
        const { publicUrl } = await uploadMarketplaceThumbnail(activeCompany.id, thumbnailFile);
        thumbnailPublicUrl = publicUrl;
      }
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : "Falha no upload da imagem");
      return;
    }

    const { data, error } = await supabase.rpc("create_product_with_asset_pool", {
      _company_id: activeCompany.id,
      _project_id: defaultProjectId,
      _name: name.trim(),
      _symbol: symbol.trim().toUpperCase(),
      _description: description.trim(),
      _token_unit_type: "asset_fraction",
      _token_unit_definition: `${perUnit} token(s) = 1 ${physicalUnit}`,
      _token_price_usd: price,
      _funding_target_usd: fundingTarget,
      _physical_unit: physicalUnit,
      _physical_total: total,
      _tokens_per_physical_unit: perUnit,
      _display_unit_label: null,
      _metadata_uri: null,
      _thumbnail_url: thumbnailPublicUrl,
      _asset_class_name: assetClass,
      _listing_title: listingTitle.trim() || null,
      _listing_body: listingBody.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as { asset_pool_id?: string } | null;

    // The RPC creates the pool on the company path (supplier_id NULL). For
    // supplier users we link the pool back to their supplier id so it shows up
    // in /app/pools (filtered by supplier_id) and /marketplace/supplier/<id>.
    if (result?.asset_pool_id && supplierProfile?.id) {
      const { error: linkErr } = await supabase
        .from("asset_pools")
        .update({ supplier_id: supplierProfile.id })
        .eq("id", result.asset_pool_id);
      if (linkErr) console.error("Failed to link pool to supplier:", linkErr);
    }

    toast.success("Pool created");
    if (result?.asset_pool_id) {
      navigate(`/app/pools/${result.asset_pool_id}`);
    } else {
      navigate("/app/pools");
    }
  };

  return (
    <PageContainer>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/app/pools">
          <ArrowLeft className="size-4 mr-1" /> All pools
        </Link>
      </Button>

      <PageHeader
        title="New pool"
        subtitle="Create a tokenized asset pool. It starts as draft — toggle 'Listed on marketplace' from the pool detail when ready."
      />

      <form onSubmit={submit} className="glass-card p-6 space-y-5 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="name">Pool name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Patagonia 1 oz Silver Vault Bar"
              required
            />
          </div>
          <div>
            <Label htmlFor="symbol">Token symbol</Label>
            <Input
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="PATAG1"
              required
            />
          </div>
          <div>
            <Label htmlFor="asset_class">Asset class</Label>
            <Select value={assetClass} onValueChange={setAssetClass}>
              <SelectTrigger id="asset_class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Description (internal)</Label>
            <Textarea
              id="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short internal description."
            />
          </div>
        </div>

        <div className="border-t border-border/60 pt-5">
          <h3 className="font-semibold mb-3">Capacity</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="physical_unit">Physical unit</Label>
              <Select value={physicalUnit} onValueChange={setPhysicalUnit}>
                <SelectTrigger id="physical_unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHYSICAL_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="physical_total">Physical total</Label>
              <Input
                id="physical_total"
                type="number"
                step="0.0001"
                min="0"
                value={physicalTotal}
                onChange={(e) => setPhysicalTotal(e.target.value)}
                placeholder="50000"
                required
              />
            </div>
            <div>
              <Label htmlFor="tokens_per_unit">Tokens per unit</Label>
              <Input
                id="tokens_per_unit"
                type="number"
                step="0.0001"
                min="0"
                value={tokensPerUnit}
                onChange={(e) => setTokensPerUnit(e.target.value)}
                placeholder="1"
                required
              />
            </div>
            <div>
              <Label htmlFor="token_price">Token price (USD)</Label>
              <Input
                id="token_price"
                type="number"
                step="0.01"
                min="0"
                value={tokenPrice}
                onChange={(e) => setTokenPrice(e.target.value)}
                placeholder="30.50"
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Total tokens ={" "}
            <span className="font-mono">
              {Number(physicalTotal || 0) * Number(tokensPerUnit || 0)}
            </span>
            . Funding target ={" "}
            <span className="font-mono">
              ${(Number(physicalTotal || 0) * Number(tokensPerUnit || 0) * Number(tokenPrice || 0)).toFixed(2)}
            </span>
            .
          </p>
        </div>

        <div className="border-t border-border/60 pt-5">
          <h3 className="font-semibold mb-3">Marketplace listing (optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="listing_title">Listing title</Label>
              <Input
                id="listing_title"
                value={listingTitle}
                onChange={(e) => setListingTitle(e.target.value)}
                placeholder="(defaults to pool name)"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="listing_body">Listing body</Label>
              <Textarea
                id="listing_body"
                rows={3}
                value={listingBody}
                onChange={(e) => setListingBody(e.target.value)}
                placeholder="Pitch the offering for buyers."
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="thumbnail">Thumbnail</Label>
              <Input
                id="thumbnail"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="cursor-pointer text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
                onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP — até 5 MB. Opcional.</p>
              {thumbnailPreviewUrl && (
                <div className="rounded-lg border border-border overflow-hidden max-w-xs bg-muted/30">
                  <img src={thumbnailPreviewUrl} alt="" className="w-full h-40 object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/60 pt-5">
          <Button type="button" variant="outline" asChild>
            <Link to="/app/pools">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create pool"}
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
