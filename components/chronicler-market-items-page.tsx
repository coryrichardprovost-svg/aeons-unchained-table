"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type ItemTypeRecord = {
  id: string;
  owner_user_id: string | null;
  name: string;
  columns: string[];
  is_default: boolean;
  sort_order: number;
};

type ItemRecord = {
  id: string;
  owner_user_id: string | null;
  item_type_id: string;
  name: string;
  description: string;
  value: string;
  weight: string;
  data: Record<string, string>;
};

const defaultCustomColumns = ["name", "description", "value", "weight"];
const columnLabels: Record<string, string> = {
  name: "Name",
  description: "Description",
  effect: "Effect",
  defense: "Defense",
  protection: "Protection",
  resistance: "Resistance",
  range: "Range",
  attack: "Attack",
  penetration: "Penetration",
  value: "Value",
  weight: "Weight",
};
const coinTypes = ["CP", "SP", "EP", "GP", "PP"];

export function ChroniclerMarketItemsPage() {
  const [itemTypes, setItemTypes] = useState<ItemTypeRecord[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [activeTypeId, setActiveTypeId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const itemSaveTimers = useRef<Record<string, number>>({});
  const typeSaveTimers = useRef<Record<string, number>>({});

  const loadItems = useCallback(async () => {
    const supabase = createClient();
    const [{ data: typeData, error: typeError }, { data: itemData, error: itemError }] = await Promise.all([
      supabase.from("item_types").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
      supabase.from("items").select("*").order("name", { ascending: true }),
    ]);

    if (typeError || itemError) {
      const error = typeError || itemError;
      setMessage(error?.message.includes("item") ? "Run supabase/migrations/013_add_market_items.sql in Supabase SQL Editor." : error?.message || "Could not load items.");
      setIsLoading(false);
      return;
    }

    const normalizedTypes = ((typeData || []) as Partial<ItemTypeRecord>[]).map(normalizeItemType);
    setItemTypes(normalizedTypes);
    setItems(((itemData || []) as Partial<ItemRecord>[]).map(normalizeItem));
    setActiveTypeId(normalizedTypes[0]?.id || "");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Item records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadItems();
  }, [loadItems]);

  const activeType = useMemo(
    () => itemTypes.find((itemType) => itemType.id === activeTypeId) || itemTypes[0] || null,
    [activeTypeId, itemTypes],
  );

  const activeItems = useMemo(() => {
    if (!activeType) return [];
    const cleanSearch = searchTerm.trim().toLowerCase();
    return items
      .filter((item) => item.item_type_id === activeType.id)
      .filter((item) => !cleanSearch || item.name.toLowerCase().includes(cleanSearch))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [activeType, items, searchTerm]);

  async function createItemType() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("item_types")
      .insert({
        owner_user_id: user?.id,
        name: getNewTypeName(itemTypes),
        columns: defaultCustomColumns,
        is_default: false,
        sort_order: itemTypes.length + 1,
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    const savedType = normalizeItemType(data as Partial<ItemTypeRecord>);
    setItemTypes((current) => [...current, savedType]);
    setActiveTypeId(savedType.id);
    setSearchTerm("");
    setMessage("Item type created.");
  }

  async function addItem(itemType: ItemTypeRecord) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("items")
      .insert({
        owner_user_id: user?.id,
        item_type_id: itemType.id,
        name: "New Item",
        description: "",
        value: "",
        weight: "",
        data: createBlankData(itemType.columns),
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setItems((current) => [...current, normalizeItem(data as Partial<ItemRecord>)]);
    setSearchTerm("");
    setMessage("Item added.");
  }

  async function deleteItem(item: ItemRecord) {
    const supabase = createClient();
    setMessage(`Deleting ${item.name || "item"}...`);

    const { error } = await supabase.from("items").delete().eq("id", item.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    window.clearTimeout(itemSaveTimers.current[item.id]);
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    setMessage("Item deleted.");
  }

  function updateTypeName(typeId: string, value: string) {
    setItemTypes((current) => current.map((itemType) => (itemType.id === typeId ? { ...itemType, name: value } : itemType)));
    const itemType = itemTypes.find((candidate) => candidate.id === typeId);
    if (!itemType) return;
    scheduleItemTypeSave({ ...itemType, name: value });
  }

  function updateItem(itemId: string, column: string, value: string) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;
        if (["name", "description", "value", "weight"].includes(column)) {
          return { ...item, [column]: value };
        }
        return { ...item, data: { ...item.data, [column]: value } };
      }),
    );

    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const nextItem =
      ["name", "description", "value", "weight"].includes(column)
        ? { ...item, [column]: value }
        : { ...item, data: { ...item.data, [column]: value } };
    scheduleItemSave(nextItem);
  }

  function scheduleItemTypeSave(itemType: ItemTypeRecord) {
    window.clearTimeout(typeSaveTimers.current[itemType.id]);
    typeSaveTimers.current[itemType.id] = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving item type...");
      const { error } = await supabase
        .from("item_types")
        .update({
          name: itemType.name.trim() || "Unnamed Type",
        })
        .eq("id", itemType.id);

      setMessage(error ? error.message : "Item type saved.");
    }, 650);
  }

  function scheduleItemSave(item: ItemRecord) {
    window.clearTimeout(itemSaveTimers.current[item.id]);
    itemSaveTimers.current[item.id] = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving item...");
      const { error } = await supabase
        .from("items")
        .update({
          name: item.name.trim() || "Unnamed Item",
          description: item.description,
          value: item.value,
          weight: item.weight,
          data: item.data,
        })
        .eq("id", item.id);

      setMessage(error ? error.message : "Item saved.");
    }, 650);
  }

  return (
    <div className="market-items-page">
      {message ? <p className="form-message">{message}</p> : null}

      <section className="list-card market-item-tab-panel">
        <div className="market-item-tabs" role="tablist" aria-label="Item types">
          {itemTypes.map((itemType) => (
            <button
              className={`market-item-tab ${activeType?.id === itemType.id ? "active" : ""}`}
              key={itemType.id}
              onClick={() => {
                setActiveTypeId(itemType.id);
                setSearchTerm("");
              }}
              role="tab"
              aria-selected={activeType?.id === itemType.id}
            >
              {itemType.name}
            </button>
          ))}
          <button className="market-add-tab" onClick={createItemType} aria-label="Add item type">
            +
          </button>
        </div>
      </section>

      {activeType ? (
        <section className="market-item-table-card">
          <div className="market-item-table-header">
            <div className="market-item-title-area">
              {activeType.is_default ? (
                <div>
                  <strong>{activeType.name}</strong>
                  <span>{activeItems.length} matching item{activeItems.length === 1 ? "" : "s"}</span>
                </div>
              ) : (
                <label className="market-type-name-field">
                  <span>Custom Type Name</span>
                  <input value={activeType.name} onChange={(event) => updateTypeName(activeType.id, event.target.value)} />
                </label>
              )}
            </div>
            <div className="market-item-table-actions">
              <label className="market-search-field">
                <span>Search Item Name</span>
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search this table" />
              </label>
              <button className="primary-inline-button compact-action" onClick={() => addItem(activeType)}>
                Add Item
              </button>
            </div>
          </div>

          <div className="market-item-table-wrap">
            <div className="market-item-table" style={{ ["--market-item-columns" as string]: getGridColumns(activeType.columns) }}>
              <div className="market-item-row market-item-head">
                {activeType.columns.map((column) => (
                  <span key={column}>{columnLabels[column] || column}</span>
                ))}
                <span>Delete</span>
              </div>

              {activeItems.map((item) => (
                <div className="market-item-row" key={item.id}>
                  {activeType.columns.map((column) =>
                    column === "value" ? (
                      <ValueCell item={item} key={column} onChange={(value) => updateItem(item.id, column, value)} />
                    ) : (
                      <input
                        key={column}
                        value={getItemValue(item, column)}
                        onChange={(event) => updateItem(item.id, column, event.target.value)}
                        aria-label={`${activeType.name} ${columnLabels[column] || column}`}
                      />
                    ),
                  )}
                  <button className="market-delete-row-button" onClick={() => deleteItem(item)} aria-label={`Delete ${item.name || "item"}`}>
                    Delete
                  </button>
                </div>
              ))}
            </div>

            {!isLoading && activeItems.length === 0 ? (
              <div className="empty-state">
                <strong>No items found.</strong>
                <span>Add an item or clear the search field.</span>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {!isLoading && itemTypes.length === 0 ? (
        <div className="empty-state">
          <strong>No item types found.</strong>
          <span>Run the market items migration, then return here.</span>
        </div>
      ) : null}
    </div>
  );
}

function ValueCell({ item, onChange }: { item: ItemRecord; onChange: (value: string) => void }) {
  const parsedValue = parseValue(item.value);

  function updateValue(patch: Partial<{ amount: string; coin: string }>) {
    const amount = patch.amount ?? parsedValue.amount;
    const coin = patch.coin ?? parsedValue.coin;
    onChange(`${amount} ${coin}`.trim());
  }

  return (
    <div className="market-value-cell">
      <select value={parsedValue.coin} onChange={(event) => updateValue({ coin: event.target.value })} aria-label={`${item.name || "Item"} coin type`}>
        {coinTypes.map((coinType) => (
          <option value={coinType} key={coinType}>
            {coinType}
          </option>
        ))}
      </select>
      <input
        inputMode="decimal"
        value={parsedValue.amount}
        onChange={(event) => updateValue({ amount: event.target.value })}
        aria-label={`${item.name || "Item"} coin amount`}
      />
    </div>
  );
}

function normalizeItemType(itemType: Partial<ItemTypeRecord>): ItemTypeRecord {
  return {
    id: itemType.id || "",
    owner_user_id: itemType.owner_user_id || null,
    name: itemType.name || "Unnamed Type",
    columns: Array.isArray(itemType.columns) ? itemType.columns : defaultCustomColumns,
    is_default: Boolean(itemType.is_default),
    sort_order: itemType.sort_order || 0,
  };
}

function normalizeItem(item: Partial<ItemRecord>): ItemRecord {
  return {
    id: item.id || "",
    owner_user_id: item.owner_user_id || null,
    item_type_id: item.item_type_id || "",
    name: item.name || "",
    description: item.description || "",
    value: item.value || "",
    weight: item.weight || "",
    data: item.data || {},
  };
}

function createBlankData(columns: string[]) {
  return Object.fromEntries(columns.filter((column) => !["name", "description", "value", "weight"].includes(column)).map((column) => [column, ""]));
}

function getItemValue(item: ItemRecord, column: string) {
  if (column === "name") return item.name;
  if (column === "description") return item.description;
  if (column === "value") return item.value;
  if (column === "weight") return item.weight;
  return item.data[column] || "";
}

function getGridColumns(columns: string[]) {
  return `${columns
    .map((column) => {
      if (column === "description") return "minmax(260px, 1.7fr)";
      if (column === "name") return "minmax(160px, 1fr)";
      return "minmax(108px, 0.75fr)";
    })
    .join(" ")} 78px`;
}

function getNewTypeName(itemTypes: ItemTypeRecord[]) {
  const baseName = "New Item Type";
  const existingNames = new Set(itemTypes.map((itemType) => itemType.name));
  if (!existingNames.has(baseName)) return baseName;

  let index = 2;
  while (existingNames.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
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
