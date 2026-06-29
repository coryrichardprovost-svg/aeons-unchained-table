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

export function ChroniclerMarketItemsPage() {
  const [itemTypes, setItemTypes] = useState<ItemTypeRecord[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [expandedTypeIds, setExpandedTypeIds] = useState<string[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const saveTimers = useRef<Record<string, number>>({});

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
    setExpandedTypeIds(normalizedTypes.map((itemType) => itemType.id));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Item records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadItems();
  }, [loadItems]);

  const itemsByType = useMemo(() => {
    const groupedItems = new Map<string, ItemRecord[]>();
    itemTypes.forEach((itemType) => groupedItems.set(itemType.id, []));
    items.forEach((item) => {
      groupedItems.set(item.item_type_id, [...(groupedItems.get(item.item_type_id) || []), item]);
    });
    return groupedItems;
  }, [itemTypes, items]);

  async function createItemType() {
    const cleanName = newTypeName.trim();
    if (!cleanName) {
      setMessage("Name the item type first.");
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("item_types")
      .insert({
        owner_user_id: user?.id,
        name: cleanName,
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
    setExpandedTypeIds((current) => [...current, savedType.id]);
    setNewTypeName("");
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
    setMessage("Item added.");
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

  function scheduleItemSave(item: ItemRecord) {
    window.clearTimeout(saveTimers.current[item.id]);
    saveTimers.current[item.id] = window.setTimeout(async () => {
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

  function toggleExpanded(typeId: string) {
    setExpandedTypeIds((current) => (current.includes(typeId) ? current.filter((id) => id !== typeId) : [...current, typeId]));
  }

  return (
    <div className="market-items-page">
      {message ? <p className="form-message">{message}</p> : null}

      <section className="list-card market-item-type-bar">
        <div>
          <h3>Item Types</h3>
          <p className="subcopy">Create custom item tables. Every table keeps Value and Weight at the end.</p>
        </div>
        <div className="market-add-type">
          <input value={newTypeName} onChange={(event) => setNewTypeName(event.target.value)} placeholder="Custom item type name" />
          <button className="primary-inline-button compact-action" onClick={createItemType}>
            Add Item Type
          </button>
        </div>
      </section>

      <section className="market-item-type-stack">
        {itemTypes.map((itemType) => {
          const typeItems = itemsByType.get(itemType.id) || [];
          const isExpanded = expandedTypeIds.includes(itemType.id);

          return (
            <div className="market-item-table-card" key={itemType.id}>
              <button className="market-item-table-header" onClick={() => toggleExpanded(itemType.id)}>
                <div>
                  <strong>{itemType.name}</strong>
                  <span>{typeItems.length} item{typeItems.length === 1 ? "" : "s"}</span>
                </div>
                <span className="tag">{isExpanded ? "Collapse" : "Expand"}</span>
              </button>

              {isExpanded ? (
                <div className="market-item-table-wrap">
                  <div className="market-item-table" style={{ ["--market-item-columns" as string]: getGridColumns(itemType.columns) }}>
                    <div className="market-item-row market-item-head">
                      {itemType.columns.map((column) => (
                        <span key={column}>{columnLabels[column] || column}</span>
                      ))}
                    </div>

                    {typeItems.map((item) => (
                      <div className="market-item-row" key={item.id}>
                        {itemType.columns.map((column) => (
                          <input
                            key={column}
                            value={getItemValue(item, column)}
                            onChange={(event) => updateItem(item.id, column, event.target.value)}
                            aria-label={`${itemType.name} ${columnLabels[column] || column}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                  <button className="secondary-button compact-action" onClick={() => addItem(itemType)}>
                    Add Item
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}

        {!isLoading && itemTypes.length === 0 ? (
          <div className="empty-state">
            <strong>No item types found.</strong>
            <span>Run the market items migration, then return here.</span>
          </div>
        ) : null}
      </section>
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
  return columns
    .map((column) => {
      if (column === "description") return "minmax(260px, 1.7fr)";
      if (column === "name") return "minmax(160px, 1fr)";
      return "minmax(108px, 0.75fr)";
    })
    .join(" ");
}
