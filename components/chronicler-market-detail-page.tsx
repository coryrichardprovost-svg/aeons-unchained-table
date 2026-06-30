"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type WorldLocation = {
  id: string;
  name: string;
  location_type: string;
};

type MarketRecord = {
  id: string;
  owner_user_id: string | null;
  location_id: string | null;
  name: string;
  market_type: string;
  description: string;
  chronicler_notes: string;
  visibility: "chronicler" | "players";
};

type ShopRecord = {
  id: string;
  owner_user_id: string | null;
  market_id: string;
  name: string;
  shop_type: string;
  shopkeeper: string;
  description: string;
  chronicler_notes: string;
  allowed_item_type_ids: string[];
  stock_mode: "types" | "curated";
  visibility: "chronicler" | "players";
};

type ShopStockRecord = {
  id: string;
  shop_id: string;
};

const validMarketLocationTypes = ["City", "Town", "District", "Village", "Point of Interest"];

export function ChroniclerMarketDetailPage({ marketId }: { marketId: string }) {
  const [market, setMarket] = useState<MarketRecord | null>(null);
  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [shopStock, setShopStock] = useState<ShopStockRecord[]>([]);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [deleteShopTarget, setDeleteShopTarget] = useState<ShopRecord | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedMarketAutoSave = useRef(false);

  const loadMarket = useCallback(async () => {
    const supabase = createClient();
    const [{ data: marketData, error: marketError }, { data: shopData, error: shopError }, { data: stockData, error: stockError }, { data: locationData, error: locationError }] =
      await Promise.all([
        supabase.from("markets").select("*").eq("id", marketId).single(),
        supabase.from("market_shops").select("*").eq("market_id", marketId).order("name", { ascending: true }),
        supabase.from("market_shop_items").select("id,shop_id"),
        supabase.from("world_locations").select("id,name,location_type").order("name", { ascending: true }),
      ]);

    if (marketError) {
      setMessage(marketError.message.includes("markets") ? "Run supabase/migrations/014_add_markets.sql in Supabase SQL Editor." : marketError.message);
      setIsLoading(false);
      return;
    }

    if (shopError || stockError || locationError) {
      setMessage(shopError?.message || stockError?.message || locationError?.message || "Could not load market helpers.");
      setIsLoading(false);
      return;
    }

    setMarket(normalizeMarket(marketData as Partial<MarketRecord> & { id: string }));
    setShops(((shopData || []) as (Partial<ShopRecord> & { id: string })[]).map(normalizeShop));
    setShopStock((stockData || []) as ShopStockRecord[]);
    setLocations(((locationData || []) as WorldLocation[]).filter((location) => validMarketLocationTypes.includes(location.location_type)));
    setIsLoading(false);
  }, [marketId]);

  useEffect(() => {
    // Market records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMarket();
  }, [loadMarket]);

  useEffect(() => {
    if (!market) return;

    if (!hasLoadedMarketAutoSave.current) {
      hasLoadedMarketAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving market...");

      const { error } = await supabase
        .from("markets")
        .update({
          location_id: market.location_id || null,
          name: market.name.trim() || "Unnamed Market",
          market_type: market.market_type,
          description: market.description,
          chronicler_notes: market.chronicler_notes,
          visibility: market.visibility,
        })
        .eq("id", market.id);

      setMessage(error ? error.message : "Market saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [market]);

  if (isLoading) return <p className="form-message">Loading market...</p>;
  if (!market) return <p className="form-message">{message || "Market not found."}</p>;

  function updateMarket(patch: Partial<MarketRecord>) {
    setMarket((current) => (current ? { ...current, ...patch } : current));
  }

  async function createShop() {
    if (!market) return;
    const currentMarket = market;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("market_shops")
      .insert({
        owner_user_id: user?.id,
        market_id: currentMarket.id,
        name: "New Shop",
        shop_type: "General",
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setShops((current) => [...current, normalizeShop(data as Partial<ShopRecord> & { id: string })]);
    setMessage("Shop added.");
  }

  async function deleteShop(shop: ShopRecord) {
    const supabase = createClient();
    setMessage(`Deleting ${shop.name || "shop"}...`);

    const { error } = await supabase.from("market_shops").delete().eq("id", shop.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setShops((current) => current.filter((candidate) => candidate.id !== shop.id));
    setShopStock((current) => current.filter((stock) => stock.shop_id !== shop.id));
    setDeleteShopTarget(null);
    setMessage("Shop deleted.");
  }

  return (
    <div className="market-detail-page">
      <div className="npc-detail-actions">
        <Link className="secondary-inline-button compact-action" href="/dm/market">
          Back to Markets
        </Link>
        {message ? <span>{message}</span> : null}
      </div>

      <section className="list-card market-detail-heading">
        <div className="market-detail-title-stack">
          <label className="field npc-name-field">
            <span>Market Name</span>
            <input value={market.name} onChange={(event) => updateMarket({ name: event.target.value })} />
          </label>
          <div className="market-detail-grid">
            <label className="field">
              <span>Location</span>
              <select value={market.location_id || ""} onChange={(event) => updateMarket({ location_id: event.target.value || null })}>
                <option value="">No location</option>
                {locations.map((location) => (
                  <option value={location.id} key={location.id}>
                    {location.name} ({location.location_type})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Market Type</span>
              <input value={market.market_type} onChange={(event) => updateMarket({ market_type: event.target.value })} />
            </label>
            <label className="field">
              <span>Visibility</span>
              <select value={market.visibility} onChange={(event) => updateMarket({ visibility: event.target.value as MarketRecord["visibility"] })}>
                <option value="chronicler">Chronicler Only</option>
                <option value="players">Player Visible Later</option>
              </select>
            </label>
          </div>
        </div>
        <div className="market-detail-notes">
          <label className="field">
            <span>Description</span>
            <textarea value={market.description} onChange={(event) => updateMarket({ description: event.target.value })} />
          </label>
          <label className="field">
            <span>Chronicler Notes</span>
            <textarea value={market.chronicler_notes} onChange={(event) => updateMarket({ chronicler_notes: event.target.value })} />
          </label>
        </div>
      </section>

      <section className="list-card market-shops-section">
        <div className="list-header">
          <div>
            <h3>Shops Inside This Market</h3>
            <p className="subcopy">Open a shop to manage its details, item types, stock, prices, and notes.</p>
          </div>
          <button className="primary-inline-button compact-action" onClick={createShop}>
            New Shop
          </button>
        </div>

        <div className="market-shop-card-grid">
          {shops.map((shop) => (
            <article className="market-shop-summary-card" key={shop.id}>
              <Link href={`/dm/market/${market.id}/shops/${shop.id}`}>
                <strong>{shop.name}</strong>
                <span>{shop.shop_type || "General Shop"}</span>
                <p>{shop.description || "No shop description yet."}</p>
              </Link>
              <div className="market-card-meta">
                <span className="tag teal">{shop.shopkeeper || "No shopkeeper"}</span>
                <span className="tag gold">{shop.allowed_item_type_ids.length} item types</span>
                <span className="tag">{shopStock.filter((stock) => stock.shop_id === shop.id).length} stock rows</span>
              </div>
              <div className="market-shop-footer">
                <Link className="secondary-button compact-action" href={`/dm/market/${market.id}/shops/${shop.id}`}>
                  Open Shop
                </Link>
                <button className="market-delete-type-button" onClick={() => setDeleteShopTarget(shop)}>
                  Delete Shop
                </button>
              </div>
            </article>
          ))}

          {!isLoading && shops.length === 0 ? (
            <div className="empty-state">
              <strong>No shops yet.</strong>
              <span>Add the first shop inside this market.</span>
            </div>
          ) : null}
        </div>
      </section>

      {deleteShopTarget ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-shop-title">
          <section className="confirm-dialog">
            <p className="eyebrow">Markets</p>
            <h3 id="delete-shop-title">Delete this shop?</h3>
            <p className="subcopy">
              This will delete {deleteShopTarget.name} and its {shopStock.filter((stock) => stock.shop_id === deleteShopTarget.id).length} stock row
              {shopStock.filter((stock) => stock.shop_id === deleteShopTarget.id).length === 1 ? "" : "s"}.
            </p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setDeleteShopTarget(null)}>
                Cancel
              </button>
              <button className="primary-inline-button" onClick={() => deleteShop(deleteShopTarget)}>
                Delete Shop
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function normalizeMarket(market: Partial<MarketRecord> & { id: string }): MarketRecord {
  return {
    id: market.id,
    owner_user_id: market.owner_user_id || null,
    location_id: market.location_id || null,
    name: market.name || "Unnamed Market",
    market_type: market.market_type || "",
    description: market.description || "",
    chronicler_notes: market.chronicler_notes || "",
    visibility: market.visibility || "chronicler",
  };
}

function normalizeShop(shop: Partial<ShopRecord> & { id: string }): ShopRecord {
  return {
    id: shop.id,
    owner_user_id: shop.owner_user_id || null,
    market_id: shop.market_id || "",
    name: shop.name || "Unnamed Shop",
    shop_type: shop.shop_type || "",
    shopkeeper: shop.shopkeeper || "",
    description: shop.description || "",
    chronicler_notes: shop.chronicler_notes || "",
    allowed_item_type_ids: Array.isArray(shop.allowed_item_type_ids) ? shop.allowed_item_type_ids : [],
    stock_mode: shop.stock_mode || "types",
    visibility: shop.visibility || "chronicler",
  };
}
