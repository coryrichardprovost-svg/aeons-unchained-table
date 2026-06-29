"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type InventoryRow = {
  itemName: string;
  description: string;
  type: string;
  quantity: string;
  weight: string;
};

type InventoryData = {
  backpackName: string;
  rows: InventoryRow[];
};

type DbCharacter = {
  id: string;
  name: string;
  sheet_data?: Record<string, unknown> | null;
};

const inventoryColumns = ["Item Name", "Description", "Type", "QTY", "WT", "WT Total"];

export function InventoryPage() {
  const [character, setCharacter] = useState<DbCharacter | null>(null);
  const [sheetData, setSheetData] = useState<Record<string, unknown>>({});
  const [inventory, setInventory] = useState<InventoryData>(createDefaultInventory());
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const hasLoadedAutoSave = useRef(false);

  const loadInventory = useCallback(async () => {
    const characterId = window.localStorage.getItem("aeons:selectedCharacterId");

    if (!characterId) {
      setIsLoading(false);
      setMessage("Choose a character before opening inventory.");
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.from("characters").select("id,name,sheet_data").eq("id", characterId).single();

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    const dbCharacter = data as DbCharacter;
    const savedSheetData = dbCharacter.sheet_data || {};
    setCharacter(dbCharacter);
    setSheetData(savedSheetData);
    setInventory(normalizeInventory(savedSheetData.inventory));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // The selected character id is stored in the browser after the character picker flow.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    if (!character) return;

    if (!hasLoadedAutoSave.current) {
      hasLoadedAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving inventory...");

      const { error } = await supabase
        .from("characters")
        .update({
          sheet_data: {
            ...sheetData,
            inventory,
          },
        })
        .eq("id", character.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Inventory saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [character, inventory, sheetData]);

  function updateRow(index: number, nextRow: InventoryRow) {
    setInventory((current) => ({
      ...current,
      rows: current.rows.map((row, rowIndex) => (rowIndex === index ? nextRow : row)),
    }));
  }

  if (isLoading) {
    return (
      <section className="list-card section-gap">
        <div className="list-header">
          <h3>Loading Inventory</h3>
          <span className="tag teal">Supabase</span>
        </div>
      </section>
    );
  }

  if (!character) {
    return (
      <section className="list-card section-gap">
        <div className="list-header">
          <h3>No Character Selected</h3>
          <span className="tag crimson">Required</span>
        </div>
        <p className="subcopy">{message}</p>
        <Link className="primary-inline-button section-gap" href="/player/characters">
          Choose Character
        </Link>
      </section>
    );
  }

  return (
    <div className="inventory-workspace">
      {message ? <p className="form-message">{message}</p> : null}

      <section className="inventory-backpack-panel">
        <label>
          <span>Backpack</span>
          <input
            value={inventory.backpackName}
            onChange={(event) => setInventory((current) => ({ ...current, backpackName: event.target.value }))}
            placeholder="Backpack name"
          />
        </label>
      </section>

      <section className="inventory-table-panel">
        <div className="inventory-table-header">
          <h3>{character.name}&apos;s Inventory</h3>
          <span className="tag teal">Autosaves</span>
        </div>

        <div className="inventory-table" role="table" aria-label={`${character.name} inventory`}>
          <div className="inventory-table-head" role="row">
            {inventoryColumns.map((column) => (
              <strong role="columnheader" key={column}>
                {column}
              </strong>
            ))}
          </div>

          {inventory.rows.map((row, index) => (
            <div className="inventory-table-row" role="row" key={index}>
              <input
                aria-label={`Item ${index + 1} name`}
                value={row.itemName}
                onChange={(event) => updateRow(index, { ...row, itemName: event.target.value })}
              />
              <input
                aria-label={`Item ${index + 1} description`}
                value={row.description}
                onChange={(event) => updateRow(index, { ...row, description: event.target.value })}
              />
              <input
                aria-label={`Item ${index + 1} type`}
                value={row.type}
                onChange={(event) => updateRow(index, { ...row, type: event.target.value })}
              />
              <input
                aria-label={`Item ${index + 1} quantity`}
                inputMode="numeric"
                value={row.quantity}
                onChange={(event) => updateRow(index, { ...row, quantity: formatNumberText(event.target.value) })}
              />
              <input
                aria-label={`Item ${index + 1} weight`}
                inputMode="decimal"
                value={row.weight}
                onChange={(event) => updateRow(index, { ...row, weight: formatDecimalText(event.target.value) })}
              />
              <output aria-label={`Item ${index + 1} weight total`}>{getWeightTotal(row)}</output>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function createDefaultInventory(): InventoryData {
  return {
    backpackName: "",
    rows: Array.from({ length: 18 }, () => createInventoryRow()),
  };
}

function createInventoryRow(): InventoryRow {
  return {
    itemName: "",
    description: "",
    type: "",
    quantity: "",
    weight: "",
  };
}

function normalizeInventory(data: unknown): InventoryData {
  const defaults = createDefaultInventory();
  if (!data || typeof data !== "object") return defaults;

  const partialInventory = data as Partial<InventoryData>;
  return {
    backpackName: typeof partialInventory.backpackName === "string" ? partialInventory.backpackName : "",
    rows: defaults.rows.map((defaultRow, index) => ({
      ...defaultRow,
      ...partialInventory.rows?.[index],
    })),
  };
}

function parseNumber(value: string) {
  const cleanValue = value.replace(/,/g, "");
  const parsed = Number(cleanValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumberText(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("en-US").format(Number(digits));
}

function formatDecimalText(value: string) {
  const cleanValue = value.replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = cleanValue.split(".");
  const decimal = decimalParts.join("").slice(0, 2);
  const formattedWhole = whole ? new Intl.NumberFormat("en-US").format(Number(whole)) : "";
  return decimalParts.length > 0 ? `${formattedWhole}.${decimal}` : formattedWhole;
}

function getWeightTotal(row: InventoryRow) {
  const quantity = parseNumber(row.quantity);
  const weight = parseNumber(row.weight);
  const total = quantity * weight;
  if (!total) return "";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(total);
}
