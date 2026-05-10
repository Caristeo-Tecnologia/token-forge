/**
 * Mining marketplace seed.
 *
 * Creates 5 approved suppliers and 50 marketplace-listed asset_pools (gold,
 * silver, lithium, quartz). Idempotent: re-running upserts on (user_id) for
 * suppliers and (supplier_id, slug) for pools.
 *
 * Usage (PowerShell):
 *   $env:VITE_SUPABASE_URL = "https://mcwgxbtoadzspaaioudq.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<service-role key from Supabase dashboard>"
 *   # Optional: override the 5 default user_ids (comma-separated)
 *   # $env:SEED_SUPPLIER_USER_IDS = "uuid1,uuid2,uuid3,uuid4,uuid5"
 *   npx tsx scripts/seed-mining.ts
 *
 * Default user_ids are baked in (see seed-mining.data.ts) — those must already
 * exist as rows in auth.users (i.e. registered/created via the Supabase Auth
 * dashboard).
 *
 * Tenant provisioning: after the seed inserts suppliers, the trigger
 * `trg_supplier_provision` (migration 20260514120000) auto-creates the
 * matching `companies` + `company_members` + `projects` + shadow `products`
 * rows for each approved supplier. Pools the seed creates with only
 * `supplier_id` set are picked up by the same provisioning function and get
 * `product_id`/`company_id` filled in automatically.
 *
 * Re-run safety: idempotent. Suppliers upsert on (user_id); pools upsert via
 * select-then-insert-or-update on (supplier_id, slug).
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types";
import {
  DEFAULT_USER_IDS,
  POOLS_DATA,
  SUPPLIERS_DATA,
  SUPPLIER_ORDER,
  type SupplierKey,
} from "./seed-mining.data";

type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];
type PoolInsert = Database["public"]["Tables"]["asset_pools"]["Insert"];

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("Missing VITE_SUPABASE_URL (or SUPABASE_URL) env var.");
  process.exit(1);
}
if (!SERVICE_ROLE) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY env var. Get it from Supabase Dashboard → Settings → API.",
  );
  process.exit(1);
}

function resolveUserIds(): Record<SupplierKey, string> {
  const override = process.env.SEED_SUPPLIER_USER_IDS;
  if (!override) return { ...DEFAULT_USER_IDS };
  const parts = override.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length !== SUPPLIER_ORDER.length) {
    console.error(
      `SEED_SUPPLIER_USER_IDS must contain exactly ${SUPPLIER_ORDER.length} comma-separated UUIDs (got ${parts.length}).`,
    );
    process.exit(1);
  }
  const out = {} as Record<SupplierKey, string>;
  SUPPLIER_ORDER.forEach((key, i) => {
    out[key] = parts[i];
  });
  return out;
}

const userIds = resolveUserIds();

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function slugify(symbol: string): string {
  return symbol.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

async function upsertSupplier(key: SupplierKey): Promise<SupplierRow | null> {
  const profile = SUPPLIERS_DATA[key];
  const userId = userIds[key];

  const { data, error } = await supabase
    .from("suppliers")
    .upsert(
      { user_id: userId, ...profile },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) {
    console.error(`  ✗ supplier ${key} upsert failed:`, error.message);
    return null;
  }
  return data as SupplierRow;
}

async function upsertPool(
  supplierId: string,
  draft: (typeof POOLS_DATA)[SupplierKey][number],
): Promise<boolean> {
  const slug = draft.slug ?? slugify(draft.token_symbol);
  const row: PoolInsert = {
    ...draft,
    slug,
    supplier_id: supplierId,
    listed_at: new Date().toISOString(),
  };

  // The unique index on (supplier_id, slug) is PARTIAL (WHERE supplier_id IS NOT NULL),
  // which Postgres won't accept as an ON CONFLICT target via PostgREST. So we do a manual
  // select-then-insert-or-update.
  const { data: existing, error: selErr } = await supabase
    .from("asset_pools")
    .select("id")
    .eq("supplier_id", supplierId)
    .eq("slug", slug)
    .maybeSingle();

  if (selErr) {
    console.error(`    ✗ pool "${draft.name}" lookup failed:`, selErr.message);
    return false;
  }

  if (existing) {
    const { error } = await supabase
      .from("asset_pools")
      .update(row)
      .eq("id", existing.id);
    if (error) {
      console.error(`    ✗ pool "${draft.name}" update failed:`, error.message);
      return false;
    }
  } else {
    const { error } = await supabase.from("asset_pools").insert(row);
    if (error) {
      console.error(`    ✗ pool "${draft.name}" insert failed:`, error.message);
      return false;
    }
  }
  return true;
}

async function main() {
  console.log("→ Seeding mining marketplace…");
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log(`  Suppliers: ${SUPPLIER_ORDER.length}`);

  let totalPools = 0;
  let totalPoolsOk = 0;

  for (const key of SUPPLIER_ORDER) {
    const profile = SUPPLIERS_DATA[key];
    const userId = userIds[key];
    console.log(`\n• ${profile.fantasy_name ?? profile.company_name}  (user ${userId.slice(0, 8)}…)`);

    const supplier = await upsertSupplier(key);
    if (!supplier) continue;

    const pools = POOLS_DATA[key];
    let ok = 0;
    for (const draft of pools) {
      totalPools++;
      const success = await upsertPool(supplier.id, draft);
      if (success) {
        ok++;
        totalPoolsOk++;
      }
    }
    console.log(`  ✓ ${profile.fantasy_name ?? profile.company_name} — ${ok}/${pools.length} pools`);
  }

  console.log(
    `\n=== Done. Suppliers: ${SUPPLIER_ORDER.length} · Pools: ${totalPoolsOk}/${totalPools} listed ===`,
  );
  console.log("Visit /marketplace to verify the data.");

  if (totalPoolsOk < totalPools) process.exit(2);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
