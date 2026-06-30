"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type MarketRecord = {
  id: string;
  name: string;
};

type ItemTypeRecord = {
  id: string;
  name: string;
};

type ItemRecord = {
  id: string;
  item_type_id: string;
  name: string;
  description: string;
  value: string;
  weight: string;
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
  item_id: string;
  is_available: boolean;
  quantity: string;
  price_override: string;
  notes: string;
};

const coinTypes = ["CP", "SP", "EP", "GP", "PP"];

export function ChroniclerShopDetailPage({ marketId, shopId }: { marketId: string; shopId: string }) {
  const [market, setMarket] = useState<MarketRecord | null>(null);
  const [shop, setShop] = useState<ShopRecord | null>(null);
  const [itemTypes, setItemTypes] = useState<ItemTypeRecord[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [shopStock, setShopStock] = useState<ShopStockRecord[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedShopAutoSave = useRef(false);

  const loadShop = useCallback(async () => {
    const supabase = createClient();
    const [{ data: marketData, error: marketError }, { data: shopData, error: shopError }, { data: typeData, error: typeError }, { data: itemData, error: itemError }, { data: stockData, error: stockError }] =
      await Promise.all([
        supabase.from("markets").select("id,name").eq("id", marketId).single(),
        supabase.from("market_shops").select("*").eq("id", shopId).single(),
        supabase.from("item_types").select("id,name").order("sort_order", { ascending: true }).order("name", { ascending: true }),
        supabase.from("items").select("id,item_type_id,name,description,value,weight").order("name", { ascending: true }),
        supabase.from("market_shop_items").select("*").eq("shop_id", shopId),
      ]);

    if (marketError || shopError || typeError || itemError || stockError) {
      setMessage(marketError?.message || shopError?.message || typeError?.message || itemError?.message || stockError?.message || "Could not load shop.");
      setIsLoading(false);
      return;
    }

    setMarket((marketData || null) as MarketRecord | null);
    setShop(normalizeShop(shopData as Partial<ShopRecord> & { id: string }));
    setItemTypes((typeData || []) as ItemTypeRecord[]);
    setItems((itemData || []) as ItemRecord[]);
    setShopStock(((stockData || []) as (Partial<ShopStockRecord> & { id: string })[]).map(normalizeShopStock));
    setIsLoading(false);
  }, [marketId, shopId]);

  useEffect(() => {
    // Shop records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadShop();
  }, [loadShop]);

  useEffect(() => {
    if (!shop) return;

    if (!hasLoadedShopAutoSave.current) {
      hasLoadedShopAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
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
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [shop]);

  if (isLoading) return <p className="form-message">Loading shop...</p>;
  if (!shop) return <p className="form-message">{message || "Shop not found."}</p>;

  function updateShop(patch: Partial<ShopRecord>) {
    setShop((current) => (current ? { ...current, ...patch } : current));
  }

  function toggleShopItemType(itemTypeId: string) {
    if (!shop) return;
    const nextIds = shop.allowed_item_type_ids.includes(itemTypeId)
      ? shop.allowed_item_type_ids.filter((id) => id !== itemTypeId)
      : [...shop.allowed_item_type_ids, itemTypeId];
    updateShop({ allowed_item_type_ids: nextIds });
  }

  async function addCuratedItem(itemId: string) {
    if (!shop || !itemId || shopStock.some((stock) => stock.shop_id === shop.id && stock.item_id === itemId)) return;
    await upsertShopStock(shop.id, itemId, {
      is_available: true,
      quantity: "",
      price_override: "",
      notes: "",
    });
  }

  async function removeCuratedItem(stock: ShopStockRecord) {
    const supabase = createClient();
    setMessage("Removing item from shop...");

    const { error } = await supabase.from("market_shop_items").delete().eq("id", stock.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setShopStock((current) => current.filter((candidate) => candidate.id !== stock.id));
    setMessage("Item removed from shop.");
  }

  async function updateShopStock(itemId: string, patch: Partial<ShopStockRecord>) {
    if (!shop) return;
    const existingStock = shopStock.find((stock) => stock.shop_id === shop.id && stock.item_id === itemId);
    await upsertShopStock(shop.id, itemId, {
      is_available: patch.is_available ?? existingStock?.is_available ?? true,
      quantity: patch.quantity ?? existingStock?.quantity ?? "",
      price_override: patch.price_override ?? existingStock?.price_override ?? "",
      notes: patch.notes ?? existingStock?.notes ?? "",
    });
  }

  async function upsertShopStock(
    currentShopId: string,
    itemId: string,
    values: Pick<ShopStockRecord, "is_available" | "quantity" | "price_override" | "notes">,
  ) {
    const supabase = createClient();
    setShopStock((current) => {
      const existingStock = current.find((stock) => stock.shop_id === currentShopId && stock.item_id === itemId);
      if (existingStock) return current.map((stock) => (stock.id === existingStock.id ? { ...stock, ...values } : stock));
      return [...current, { id: `pending-${currentShopId}-${itemId}`, shop_id: currentShopId, item_id: itemId, ...values }];
    });
    setMessage("Saving shop stock...");

    const { data, error } = await supabase
      .from("market_shop_items")
      .upsert(
        {
          shop_id: currentShopId,
          item_id: itemId,
          is_available: values.is_available,
          quantity: values.quantity,
          price_override: values.price_override,
          notes: values.notes,
        },
        { onConflict: "shop_id,item_id" },
      )
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    const savedStock = normalizeShopStock(data as Partial<ShopStockRecord> & { id: string });
    setShopStock((current) =>
      current.some((stock) => stock.shop_id === currentShopId && stock.item_id === itemId)
        ? current.map((stock) => (stock.shop_id === currentShopId && stock.item_id === itemId ? savedStock : stock))
        : [...current, savedStock],
    );
    setMessage("Shop stock saved.");
  }

  return (
    <div className="market-detail-page">
      <div className="npc-detail-actions">
        <Link className="secondary-inline-button compact-action" href={`/dm/market/${marketId}`}>
          Back to {market?.name || "Market"}
        </Link>
        {message ? <span>{message}</span> : null}
      </div>

      <section className="list-card market-detail-heading">
        <div className="market-detail-title-stack">
          <label className="field npc-name-field">
            <span>Shop Name</span>
            <input value={shop.name} onChange={(event) => updateShop({ name: event.target.value })} />
          </label>
          <div className="market-detail-grid">
            <label className="field">
              <span>Shop Type</span>
              <input value={shop.shop_type} onChange={(event) => updateShop({ shop_type: event.target.value })} />
            </label>
            <label className="field">
              <span>Shopkeeper</span>
              <input value={shop.shopkeeper} onChange={(event) => updateShop({ shopkeeper: event.target.value })} />
            </label>
            <label className="field">
              <span>Stock Mode</span>
              <select value={shop.stock_mode} onChange={(event) => updateShop({ stock_mode: event.target.value as ShopRecord["stock_mode"] })}>
                <option value="types">All Items From Chosen Types</option>
                <option value="curated">Specific Items Only</option>
              </select>
            </label>
            <label className="field">
              <span>Visibility</span>
              <select value={shop.visibility} onChange={(event) => updateShop({ visibility: event.target.value as ShopRecord["visibility"] })}>
                <option value="chronicler">Chronicler Only</option>
                <option value="players">Player Visible Later</option>
              </select>
            </label>
          </div>
        </div>
        <div className="market-detail-notes">
          <label className="field">
            <span>Description</span>
            <textarea value={shop.description} onChange={(event) => updateShop({ description: event.target.value })} />
          </label>
          <label className="field">
            <span>Private Notes</span>
            <textarea value={shop.chronicler_notes} onChange={(event) => updateShop({ chronicler_notes: event.target.value })} />
          </label>
        </div>
      </section>

      <section className="list-card market-shops-section">
        <div className="market-shop-type-picker">
          <span>Allowed Item Types</span>
          <div>
            {itemTypes.map((itemType) => (
              <label className="market-shop-type-pill" key={itemType.id}>
                <input type="checkbox" checked={shop.allowed_item_type_ids.includes(itemType.id)} onChange={() => toggleShopItemType(itemType.id)} />
                {itemType.name}
              </label>
            ))}
          </div>
        </div>
      </section>

      <ShopStockTable
        shop={shop}
        items={items}
        itemTypes={itemTypes}
        shopStock={shopStock}
        onUpdateStock={updateShopStock}
        onAddCuratedItem={addCuratedItem}
        onRemoveCuratedItem={removeCuratedItem}
      />
    </div>
  );
}

function ShopStockTable({
  shop,
  items,
  itemTypes,
  shopStock,
  onUpdateStock,
  onAddCuratedItem,
  onRemoveCuratedItem,
}: {
  shop: ShopRecord;
  items: ItemRecord[];
  itemTypes: ItemTypeRecord[];
  shopStock: ShopStockRecord[];
  onUpdateStock: (itemId: string, patch: Partial<ShopStockRecord>) => void;
  onAddCuratedItem: (itemId: string) => void;
  onRemoveCuratedItem: (stock: ShopStockRecord) => void;
}) {
  const allowedItems = items.filter((item) => shop.allowed_item_type_ids.includes(item.item_type_id));
  const stockedItems =
    shop.stock_mode === "types"
      ? allowedItems
      : allowedItems.filter((item) => shopStock.some((stock) => stock.shop_id === shop.id && stock.item_id === item.id));
  const addableCuratedItems = allowedItems.filter((item) => !shopStock.some((stock) => stock.shop_id === shop.id && stock.item_id === item.id));

  return (
    <section className="list-card market-shop-stock">
      <div className="market-shop-stock-header">
        <div>
          <strong>Shop Stock</strong>
          <span>{shop.stock_mode === "types" ? "Showing all items from chosen item types." : "Showing specific chosen items only."}</span>
        </div>
        {shop.stock_mode === "curated" ? (
          <select value="" onChange={(event) => onAddCuratedItem(event.target.value)}>
            <option value="">Add item to shop</option>
            {addableCuratedItems.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="market-shop-stock-table">
        <div className={`market-shop-stock-row market-shop-stock-head ${shop.stock_mode === "curated" ? "curated" : ""}`}>
          <span>Item</span>
          <span>Type</span>
          <span>Base Value</span>
          <span>Available</span>
          <span>Qty</span>
          <span>Shop Price</span>
          <span>Notes</span>
          {shop.stock_mode === "curated" ? <span>Remove</span> : null}
        </div>

        {stockedItems.map((item) => {
          const stock = shopStock.find((candidate) => candidate.shop_id === shop.id && candidate.item_id === item.id);
          const itemType = itemTypes.find((candidate) => candidate.id === item.item_type_id);

          return (
            <div className={`market-shop-stock-row ${shop.stock_mode === "curated" ? "curated" : ""}`} key={item.id}>
              <span>{item.name}</span>
              <span>{itemType?.name || "Unknown"}</span>
              <span>{item.value || "No value"}</span>
              <label className="market-stock-toggle">
                <input type="checkbox" checked={stock?.is_available ?? true} onChange={(event) => onUpdateStock(item.id, { is_available: event.target.checked })} />
              </label>
              <input value={stock?.quantity || ""} onChange={(event) => onUpdateStock(item.id, { quantity: event.target.value })} />
              <PriceOverrideCell value={stock?.price_override || ""} itemName={item.name} onChange={(value) => onUpdateStock(item.id, { price_override: value })} />
              <input value={stock?.notes || ""} onChange={(event) => onUpdateStock(item.id, { notes: event.target.value })} />
              {shop.stock_mode === "curated" ? (
                <button className="market-delete-row-button" onClick={() => stock && onRemoveCuratedItem(stock)} disabled={!stock}>
                  Remove
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {shop.allowed_item_type_ids.length === 0 ? (
        <p className="subcopy">Choose allowed item types above to see shop stock.</p>
      ) : stockedItems.length === 0 ? (
        <p className="subcopy">No matching items yet. Add items in the Item Database or choose another item type.</p>
      ) : null}
    </section>
  );
}

function PriceOverrideCell({ value, itemName, onChange }: { value: string; itemName: string; onChange: (value: string) => void }) {
  const parsedValue = parseValue(value);

  function updateValue(patch: Partial<{ amount: string; coin: string }>) {
    const amount = patch.amount ?? parsedValue.amount;
    const coin = patch.coin ?? parsedValue.coin;
    onChange(`${amount} ${coin}`.trim());
  }

  return (
    <div className="market-value-cell">
      <input inputMode="decimal" value={parsedValue.amount} onChange={(event) => updateValue({ amount: event.target.value })} aria-label={`${itemName} shop price`} />
      <select value={parsedValue.coin} onChange={(event) => updateValue({ coin: event.target.value })} aria-label={`${itemName} shop price coin`}>
        {coinTypes.map((coinType) => (
          <option value={coinType} key={coinType}>
            {coinType}
          </option>
        ))}
      </select>
    </div>
  );
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

function normalizeShopStock(stock: Partial<ShopStockRecord> & { id: string }): ShopStockRecord {
  return {
    id: stock.id,
    shop_id: stock.shop_id || "",
    item_id: stock.item_id || "",
    is_available: stock.is_available ?? true,
    quantity: stock.quantity || "",
    price_override: stock.price_override || "",
    notes: stock.notes || "",
  };
}

function parseValue(value: string) {
  const trimmedValue = value.trim();
  const coinMatch = trimmedValue.match(/\b(CP|SP|EP|GP|PP)\b/i);
  const coin = coinMatch ? coinMatch[1].toUpperCase() : "CP";
  const amount = trimmedValue.replace(/\b(CP|SP|EP|GP|PP)\b/i, "").trim();

  return {
    amount,
    coin,
  };
}
