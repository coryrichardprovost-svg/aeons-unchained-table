"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type WorldLocation = {
  id: string;
  name: string;
  location_type: string;
};

type ItemTypeRecord = {
  id: string;
  name: string;
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

const validMarketLocationTypes = ["City", "Town", "District", "Village", "Point of Interest"];

export function ChroniclerMarketDetailPage({ marketId }: { marketId: string }) {
  const [market, setMarket] = useState<MarketRecord | null>(null);
  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemTypeRecord[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedMarketAutoSave = useRef(false);
  const shopSaveTimers = useRef<Record<string, number>>({});

  const loadMarket = useCallback(async () => {
    const supabase = createClient();
    const [{ data: marketData, error: marketError }, { data: shopData, error: shopError }, { data: locationData, error: locationError }, { data: typeData, error: typeError }] =
      await Promise.all([
        supabase.from("markets").select("*").eq("id", marketId).single(),
        supabase.from("market_shops").select("*").eq("market_id", marketId).order("name", { ascending: true }),
        supabase.from("world_locations").select("id,name,location_type").order("name", { ascending: true }),
        supabase.from("item_types").select("id,name").order("sort_order", { ascending: true }).order("name", { ascending: true }),
      ]);

    if (marketError) {
      setMessage(marketError.message.includes("markets") ? "Run supabase/migrations/014_add_markets.sql in Supabase SQL Editor." : marketError.message);
      setIsLoading(false);
      return;
    }

    if (shopError || locationError || typeError) {
      setMessage(shopError?.message || locationError?.message || typeError?.message || "Could not load market helpers.");
      setIsLoading(false);
      return;
    }

    setMarket(normalizeMarket(marketData as Partial<MarketRecord> & { id: string }));
    setShops(((shopData || []) as (Partial<ShopRecord> & { id: string })[]).map(normalizeShop));
    setLocations(((locationData || []) as WorldLocation[]).filter((location) => validMarketLocationTypes.includes(location.location_type)));
    setItemTypes((typeData || []) as ItemTypeRecord[]);
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

    window.clearTimeout(shopSaveTimers.current[shop.id]);
    setShops((current) => current.filter((candidate) => candidate.id !== shop.id));
    setMessage("Shop deleted.");
  }

  function updateShop(shopId: string, patch: Partial<ShopRecord>) {
    setShops((current) => current.map((shop) => (shop.id === shopId ? { ...shop, ...patch } : shop)));
    const shop = shops.find((candidate) => candidate.id === shopId);
    if (!shop) return;
    scheduleShopSave({ ...shop, ...patch });
  }

  function toggleShopItemType(shop: ShopRecord, itemTypeId: string) {
    const nextIds = shop.allowed_item_type_ids.includes(itemTypeId)
      ? shop.allowed_item_type_ids.filter((id) => id !== itemTypeId)
      : [...shop.allowed_item_type_ids, itemTypeId];
    updateShop(shop.id, { allowed_item_type_ids: nextIds });
  }

  function scheduleShopSave(shop: ShopRecord) {
    window.clearTimeout(shopSaveTimers.current[shop.id]);
    shopSaveTimers.current[shop.id] = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving shop...");

      const { error } = await supabase
        .from("market_shops")
        .update({
          name: shop.name.trim() || "Unnamed Shop",
          shop_type: shop.shop_type,
          shopkeeper: shop.shopkeeper,
          description: shop.description,
          chronicler_notes: shop.chronicler_notes,
          allowed_item_type_ids: shop.allowed_item_type_ids,
          stock_mode: shop.stock_mode,
          visibility: shop.visibility,
        })
        .eq("id", shop.id);

      setMessage(error ? error.message : "Shop saved.");
    }, 650);
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
            <p className="subcopy">Choose what item types each shop can sell. Specific item stock comes next.</p>
          </div>
          <button className="primary-inline-button compact-action" onClick={createShop}>
            New Shop
          </button>
        </div>

        <div className="market-shop-stack">
          {shops.map((shop) => (
            <article className="market-shop-card" key={shop.id}>
              <div className="market-shop-grid">
                <label className="field">
                  <span>Shop Name</span>
                  <input value={shop.name} onChange={(event) => updateShop(shop.id, { name: event.target.value })} />
                </label>
                <label className="field">
                  <span>Shop Type</span>
                  <input value={shop.shop_type} onChange={(event) => updateShop(shop.id, { shop_type: event.target.value })} />
                </label>
                <label className="field">
                  <span>Shopkeeper</span>
                  <input value={shop.shopkeeper} onChange={(event) => updateShop(shop.id, { shopkeeper: event.target.value })} />
                </label>
                <label className="field">
                  <span>Stock Mode</span>
                  <select value={shop.stock_mode} onChange={(event) => updateShop(shop.id, { stock_mode: event.target.value as ShopRecord["stock_mode"] })}>
                    <option value="types">All Items From Chosen Types</option>
                    <option value="curated">Specific Items Later</option>
                  </select>
                </label>
              </div>

              <div className="market-shop-notes">
                <label className="field">
                  <span>Description</span>
                  <textarea value={shop.description} onChange={(event) => updateShop(shop.id, { description: event.target.value })} />
                </label>
                <label className="field">
                  <span>Private Notes</span>
                  <textarea value={shop.chronicler_notes} onChange={(event) => updateShop(shop.id, { chronicler_notes: event.target.value })} />
                </label>
              </div>

              <div className="market-shop-type-picker">
                <span>Allowed Item Types</span>
                <div>
                  {itemTypes.map((itemType) => (
                    <label className="market-shop-type-pill" key={itemType.id}>
                      <input
                        type="checkbox"
                        checked={shop.allowed_item_type_ids.includes(itemType.id)}
                        onChange={() => toggleShopItemType(shop, itemType.id)}
                      />
                      {itemType.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="market-shop-footer">
                <span className="tag">{shop.visibility}</span>
                <button className="market-delete-type-button" onClick={() => deleteShop(shop)}>
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
