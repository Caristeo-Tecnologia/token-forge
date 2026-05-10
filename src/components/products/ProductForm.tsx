import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { logAudit } from "@/lib/platform";
import { uploadMarketplaceThumbnail } from "@/lib/storage-media";
import type { Database } from "@/integrations/supabase/types";

const UNIT_TYPES = [
  { v: "production", l: "Production (e.g., 1g of gold)" },
  { v: "profit_share", l: "Profit share (e.g., 0.001%)" },
  { v: "asset_fraction", l: "Asset fraction" },
] as const;

const PHYSICAL_UNITS = [
  { v: "kg", l: "Quilogramas (kg)" },
  { v: "g", l: "Gramas (g)" },
  { v: "t", l: "Toneladas (t)" },
  { v: "oz", l: "Onças troy (oz)" },
  { v: "unit", l: "Unidades" },
  { v: "custom", l: "Personalizado (rótulo livre)" },
] as const;

export type ProjectOption = { id: string; name: string };

interface ProductFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: ProjectOption[];
  defaultProjectId?: string;
  lockProject?: boolean;
  onCreated?: () => void;
}

type TokenUnitType = Database["public"]["Enums"]["token_unit_type"];

const STEPS = ["Oferta", "Capacidade / pool", "Tokenização"] as const;

export function ProductFormDialog({
  open,
  onOpenChange,
  projects,
  defaultProjectId,
  lockProject,
  onCreated,
}: ProductFormProps) {
  const { activeCompany, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tokenUnitType, setTokenUnitType] = useState<TokenUnitType>("production");
  const [tokenUnitDefinition, setTokenUnitDefinition] = useState("");
  const [tokenPriceUsd, setTokenPriceUsd] = useState<number | null>(null);
  const [fundingTargetUsd, setFundingTargetUsd] = useState<number | null>(null);

  const [physicalUnit, setPhysicalUnit] = useState<string>("kg");
  const [physicalTotal, setPhysicalTotal] = useState("");
  const [tokensPerPhysicalUnit, setTokensPerPhysicalUnit] = useState("");
  const [displayUnitLabel, setDisplayUnitLabel] = useState("");

  const [metadataUri, setMetadataUri] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [assetClassName, setAssetClassName] = useState("");
  const [listingTitle, setListingTitle] = useState("");
  const [listingBody, setListingBody] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setProjectId(defaultProjectId ?? projects[0]?.id ?? "");
    setSymbol("");
    setName("");
    setDescription("");
    setTokenUnitType("production");
    setTokenUnitDefinition("");
    setTokenPriceUsd(null);
    setFundingTargetUsd(null);
    setPhysicalUnit("kg");
    setPhysicalTotal("");
    setTokensPerPhysicalUnit("");
    setDisplayUnitLabel("");
    setMetadataUri("");
    setThumbnailFile(null);
    setAssetClassName("");
    setListingTitle("");
    setListingBody("");
  }, [open, defaultProjectId, projects]);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  const previewTokens = useMemo(() => {
    const pt = Number(physicalTotal);
    const rate = Number(tokensPerPhysicalUnit);
    if (!Number.isFinite(pt) || !Number.isFinite(rate) || pt <= 0 || rate <= 0) return null;
    return Math.floor(pt * rate);
  }, [physicalTotal, tokensPerPhysicalUnit]);

  const physicalLabel =
    physicalUnit === "custom" && displayUnitLabel.trim()
      ? displayUnitLabel.trim()
      : PHYSICAL_UNITS.find((u) => u.v === physicalUnit)?.l ?? physicalUnit;

  const nextFromOffer = () => {
    if (!projectId) return toast.error("Escolha um projeto");
    if (!symbol.trim() || !name.trim()) return toast.error("Nome e símbolo são obrigatórios");
    if (!tokenUnitDefinition.trim()) return toast.error("Definição da unidade do token é obrigatória");
    if (tokenPriceUsd == null || tokenPriceUsd <= 0) return toast.error("Preço do token inválido");
    if (fundingTargetUsd == null || fundingTargetUsd <= 0) return toast.error("Meta de funding inválida");
    setStep(1);
  };

  const nextFromPool = () => {
    const pt = Number(physicalTotal);
    const rate = Number(tokensPerPhysicalUnit);
    if (!Number.isFinite(pt) || pt <= 0) return toast.error("Quantidade total disponível inválida");
    if (!Number.isFinite(rate) || rate <= 0) return toast.error("Tokens por unidade física deve ser > 0");
    if (physicalUnit === "custom" && !displayUnitLabel.trim())
      return toast.error("Indique o rótulo da unidade personalizada");
    if (previewTokens == null || previewTokens < 1)
      return toast.error("A combinação gera menos de 1 token — ajuste quantidade ou taxa");
    setStep(2);
  };

  const submit = async () => {
    if (!activeCompany || !user || !projectId) return;

    setLoading(true);
    let thumbnailPublicUrl: string | undefined;
    try {
      if (thumbnailFile) {
        const { publicUrl } = await uploadMarketplaceThumbnail(activeCompany.id, thumbnailFile);
        thumbnailPublicUrl = publicUrl;
      }
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Falha no upload da imagem");
      return;
    }

    const { data, error } = await supabase.rpc("create_product_with_asset_pool", {
      _company_id: activeCompany.id,
      _project_id: projectId,
      _name: name.trim(),
      _symbol: symbol.trim(),
      _description: description.trim() || "",
      _token_unit_type: tokenUnitType,
      _token_unit_definition: tokenUnitDefinition.trim(),
      _token_price_usd: tokenPriceUsd ?? 0,
      _funding_target_usd: fundingTargetUsd ?? 0,
      _physical_unit: physicalUnit,
      _physical_total: Number(physicalTotal),
      _tokens_per_physical_unit: Number(tokensPerPhysicalUnit),
      _display_unit_label: physicalUnit === "custom" ? displayUnitLabel.trim() : physicalLabel,
      _metadata_uri: metadataUri.trim() || undefined,
      _thumbnail_url: thumbnailPublicUrl,
      _asset_class_name: assetClassName.trim() || undefined,
      _listing_title: listingTitle.trim() || undefined,
      _listing_body: listingBody.trim() || undefined,
    });
    setLoading(false);

    if (error) return toast.error(error.message);
    const row = data as { product_id?: string; asset_pool_id?: string } | null;
    const pid = row?.product_id;
    if (pid) {
      await logAudit({
        companyId: activeCompany.id,
        actorId: user.id,
        action: "create",
        entityType: "product",
        entityId: pid,
        metadata: { name: name.trim(), asset_pool_id: row?.asset_pool_id },
      });
    }
    toast.success("Produto e pool criados (rascunho)");
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar produto tokenizado</DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">
            Passo {step + 1} de {STEPS.length}: {STEPS[step]}
          </p>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 py-2 -mx-1">
          {step === 0 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Projeto *</Label>
                  {lockProject && defaultProjectId ? (
                    <>
                      <Input value={projects.find((p) => p.id === defaultProjectId)?.name ?? ""} disabled />
                    </>
                  ) : (
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolher…" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Símbolo *</Label>
                  <Input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    maxLength={10}
                    placeholder="GOLD"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de unidade do token *</Label>
                  <Select value={tokenUnitType} onValueChange={(v) => setTokenUnitType(v as TokenUnitType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_TYPES.map((u) => (
                        <SelectItem key={u.v} value={u.v}>
                          {u.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Definição da unidade *</Label>
                  <Input
                    value={tokenUnitDefinition}
                    onChange={(e) => setTokenUnitDefinition(e.target.value)}
                    placeholder="ex.: 1 g de ouro"
                    maxLength={200}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço por token (USD) *</Label>
                  <CurrencyInput value={tokenPriceUsd ?? ""} onValueChange={setTokenPriceUsd} required />
                </div>
                <div className="space-y-2">
                  <Label>Meta de funding (USD) *</Label>
                  <CurrencyInput value={fundingTargetUsd ?? ""} onValueChange={setFundingTargetUsd} required />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">
                Indique o <strong>total disponível</strong> no mundo real e quantos tokens representam{" "}
                <strong>uma unidade</strong> dessa medida (ex.: tokens por 1 kg). O número de tokens é calculado
                automaticamente.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unidade de medida *</Label>
                  <Select value={physicalUnit} onValueChange={setPhysicalUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHYSICAL_UNITS.map((u) => (
                        <SelectItem key={u.v} value={u.v}>
                          {u.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {physicalUnit === "custom" && (
                  <div className="space-y-2">
                    <Label>Rótulo da unidade *</Label>
                    <Input
                      value={displayUnitLabel}
                      onChange={(e) => setDisplayUnitLabel(e.target.value)}
                      placeholder="ex.: barras de 400 oz"
                      maxLength={120}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Total disponível ({physicalLabel}) *</Label>
                <Input
                  type="number"
                  step="any"
                  min={0}
                  value={physicalTotal}
                  onChange={(e) => setPhysicalTotal(e.target.value)}
                  placeholder="ex.: 500"
                />
              </div>
              <div className="space-y-2">
                <Label>Tokens por 1 {physicalUnit === "custom" ? displayUnitLabel || "unidade" : physicalUnit} *</Label>
                <Input
                  type="number"
                  step="any"
                  min={0}
                  value={tokensPerPhysicalUnit}
                  onChange={(e) => setTokensPerPhysicalUnit(e.target.value)}
                  placeholder="ex.: 1000 (= 1000 tokens por kg)"
                />
              </div>
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
                <p className="font-medium">Pré-visualização</p>
                <p className="text-muted-foreground mt-1">
                  ≈{" "}
                  <span className="font-mono text-foreground">{previewTokens ?? "—"}</span> tokens no total
                  {previewTokens != null && previewTokens >= 1 && (
                    <span className="block mt-1 text-xs">
                      floor({physicalTotal || "?"} × {tokensPerPhysicalUnit || "?"}) — sem validação on-chain (mock).
                    </span>
                  )}
                </p>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Dados para tokenização e marketplace futuro. Mint/PDA reais podem ser preenchidos depois na chain.
              </p>
              <div className="space-y-2">
                <Label>Metadata URI</Label>
                <Input
                  value={metadataUri}
                  onChange={(e) => setMetadataUri(e.target.value)}
                  placeholder="https://… ou ipfs://…"
                  maxLength={2048}
                />
              </div>
              <div className="space-y-2">
                <Label>Thumbnail / capa</Label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="cursor-pointer text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setThumbnailFile(f);
                  }}
                />
                <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP — até 5 MB. Opcional.</p>
                {thumbnailPreviewUrl && (
                  <div className="rounded-lg border border-border overflow-hidden max-w-xs bg-muted/30">
                    <img src={thumbnailPreviewUrl} alt="" className="w-full h-40 object-cover" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Nome da classe de ativo (off-chain)</Label>
                <Input
                  value={assetClassName}
                  onChange={(e) => setAssetClassName(e.target.value)}
                  placeholder="ex.: Minério spot série A"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label>Título do anúncio (marketplace)</Label>
                <Input value={listingTitle} onChange={(e) => setListingTitle(e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label>Descrição do anúncio</Label>
                <Textarea value={listingBody} onChange={(e) => setListingBody(e.target.value)} rows={3} maxLength={4000} />
              </div>
              <div className="rounded-lg border border-dashed px-4 py-3 text-xs text-muted-foreground">
                Mint e PDA aparecem como “pendente” até integração Solana; na aprovação do produto serão gerados valores
                mock para testes.
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          <div className="flex gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} disabled={loading}>
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step < 2 ? (
              <Button
                type="button"
                onClick={step === 0 ? nextFromOffer : nextFromPool}
                disabled={loading}
              >
                Seguinte
              </Button>
            ) : (
              <Button type="button" onClick={submit} disabled={loading}>
                {loading ? "A criar…" : "Criar rascunho"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
