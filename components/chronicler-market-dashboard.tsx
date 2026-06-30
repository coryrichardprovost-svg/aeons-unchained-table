"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  visibility: "chronicler" | "players";
};

type ShopRecord = {
  id: string;
  market_id: string;
};

const validMarketLocationTypes = ["City", "Town", "District", "Village", "Point of Interest"];

export function ChroniclerMarketDashboard() {
  const router = useRouter();
  const [markets, setMarkets] = useState<MarketRecord[]>([]);
  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MarketRecord | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadMarkets = useCallback(async () => {
    const supabase = createClient();
    const [{ data: marketData, error: marketError }, { data: shopData, error: shopError }, { data: locationData, error: locationError }] =
      await Promise.all([
        supabase.from("markets").select("*").order("name", { ascending: true }),
        supabase.from("market_shops").select("id,market_id"),
        supabase.from("world_locations").select("id,name,location_type").order("name", { ascending: true }),
      ]);

    if (marketError) {
      setMessage(marketError.message.includes("markets") ? "Run supabase/migrations/014_add_markets.sql in Supabase SQL Editor." : marketError.message);
      setIsLoading(false);
      return;
    }

    if (shopError || locationError) {
      setMessage(shopError?.message || locationError?.message || "Could not load market data.");
      setIsLoading(false);
      return;
    }

    setMarkets((marketData || []) as MarketRecord[]);
    setShops((shopData || []) as ShopRecord[]);
    setLocations(((locationData || []) as WorldLocation[]).filter((location) => validMarketLocationTypes.includes(location.location_type)));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Markets load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMarkets();
  }, [loadMarkets]);

  const filteredMarkets = useMemo(
    () => markets.filter((market) => !selectedLocationId || market.location_id === selectedLocationId),
    [markets, selectedLocationId],
  );

  async function createMarket() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("markets")
      .insert({
        owner_user_id: user?.id,
        location_id: selectedLocationId || null,
        name: "New Market",
        market_type: "General Market",
      })
      .select("id")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(`/dm/market/${(data as { id: string }).id}`);
  }

  async function deleteMarket(market: MarketRecord) {
    const supabase = createClient();
    setMessage(`Deleting ${market.name || "market"}...`);

    const { error } = await supabase.from("markets").delete().eq("id", market.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMarkets((current) => current.filter((candidate) => candidate.id !== market.id));
    setShops((current) => current.filter((shop) => shop.market_id !== market.id));
    setDeleteTarget(null);
    setMessage("Market deleted.");
  }

  return (
    <div className="market-dashboard">
      {message ? <p className="form-message">{message}</p> : null}

      <section className="list-card market-dashboard-toolbar">
        <div className="list-header">
          <div>
            <h3>Markets Dashboard</h3>
            <p className="subcopy">Create location-based markets, then add shops inside each market.</p>
          </div>
          <div className="market-dashboard-actions">
            <Link className="secondary-button compact-action" href="/dm/market/items">
              Item Database
            </Link>
            <button className="primary-inline-button compact-action" onClick={createMarket}>
              New Market
            </button>
          </div>
        </div>

        <label className="field">
          <span>Market Location</span>
          <select value={selectedLocationId} onChange={(event) => setSelectedLocationId(event.target.value)}>
            <option value="">All Market Locations</option>
            {locations.map((location) => (
              <option value={location.id} key={location.id}>
                {location.name} ({location.location_type})
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="market-card-grid">
        {filteredMarkets.map((market) => (
          <article className="market-card" key={market.id}>
            <Link href={`/dm/market/${market.id}`}>
              <div>
                <strong>{market.name}</strong>
                <span>{getLocationLabel(market.location_id, locations)}</span>
              </div>
              <p>{market.description || "No market description yet."}</p>
            </Link>
            <div className="market-card-meta">
              <span className="tag teal">{market.market_type || "Market"}</span>
              <span className="tag gold">{shops.filter((shop) => shop.market_id === market.id).length} shops</span>
              <span className="tag">{market.visibility}</span>
            </div>
            <div className="market-shop-footer">
              <Link className="secondary-button compact-action" href={`/dm/market/${market.id}`}>
                Open Market
              </Link>
              <button className="market-delete-type-button" onClick={() => setDeleteTarget(market)}>
                Delete Market
              </button>
            </div>
          </article>
        ))}

        {!isLoading && filteredMarkets.length === 0 ? (
          <div className="empty-state">
            <strong>No markets found.</strong>
            <span>Create a market or clear the location filter.</span>
          </div>
        ) : null}
      </section>

      {deleteTarget ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-market-title">
          <section className="confirm-dialog">
            <p className="eyebrow">Markets</p>
            <h3 id="delete-market-title">Delete this market?</h3>
            <p className="subcopy">
              This will delete {deleteTarget.name} and its {shops.filter((shop) => shop.market_id === deleteTarget.id).length} shop
              {shops.filter((shop) => shop.market_id === deleteTarget.id).length === 1 ? "" : "s"}.
            </p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="primary-inline-button" onClick={() => deleteMarket(deleteTarget)}>
                Delete Market
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function getLocationLabel(locationId: string | null, locations: WorldLocation[]) {
  const location = locations.find((candidate) => candidate.id === locationId);
  return location ? `${location.name} (${location.location_type})` : "No location set";
}
