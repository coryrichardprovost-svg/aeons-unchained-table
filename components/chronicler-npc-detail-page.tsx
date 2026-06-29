"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameClassRecord, normalizeClassRecord } from "@/data/class-framework";
import { createClient } from "@/lib/supabase/browser";

type WorldLocation = {
  id: string;
  name: string;
  location_type: string;
};

type NpcStatusKey = "health" | "stamina" | "mind" | "divinity";
type NpcAttributeKey = "str" | "spd" | "int" | "cha" | "con" | "dex" | "wis" | "fth";

type NpcStatus = Record<NpcStatusKey, { current: string; max: string }>;
type NpcAttributes = Record<NpcAttributeKey, string>;

type NpcRecord = {
  id: string;
  owner_user_id: string | null;
  name: string;
  age: string;
  sex: string;
  class_name: string;
  level: number;
  personality_type: string;
  description: string;
  image_url: string;
  location_id: string | null;
  faction: string;
  organization: string;
  status: NpcStatus;
  attributes: NpcAttributes;
};

type DbNpcRecord = Partial<NpcRecord> & {
  id: string;
};

const statusKeys: NpcStatusKey[] = ["health", "stamina", "mind", "divinity"];
const attributeKeys: NpcAttributeKey[] = ["str", "spd", "int", "cha", "con", "dex", "wis", "fth"];

export function ChroniclerNpcDetailPage({ npcId }: { npcId: string }) {
  const [npc, setNpc] = useState<NpcRecord | null>(null);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [classes, setClasses] = useState<GameClassRecord[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedAutoSave = useRef(false);

  const loadNpc = useCallback(async () => {
    const supabase = createClient();
    const [{ data: npcData, error: npcError }, { data: locationData, error: locationError }, { data: classData, error: classError }] =
      await Promise.all([
        supabase.from("npcs").select("*").eq("id", npcId).single(),
        supabase.from("world_locations").select("id,name,location_type").order("name", { ascending: true }),
        supabase.from("game_classes").select("*").order("name", { ascending: true }),
      ]);

    if (npcError) {
      setMessage(npcError.message.includes("npcs") ? "Run supabase/migrations/012_add_npcs.sql in Supabase SQL Editor." : npcError.message);
      setIsLoading(false);
      return;
    }

    if (locationError || classError) {
      setMessage(locationError?.message || classError?.message || "Could not load NPC helpers.");
      setIsLoading(false);
      return;
    }

    setNpc(normalizeNpc(npcData as DbNpcRecord));
    setLocations((locationData || []) as WorldLocation[]);
    setClasses(((classData || []) as DbNpcRecord[]).map((classRecord) => normalizeClassRecord(classRecord as Partial<GameClassRecord> & { id: string })));
    setIsLoading(false);
  }, [npcId]);

  useEffect(() => {
    // NPC record loads after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNpc();
  }, [loadNpc]);

  useEffect(() => {
    if (!npc) return;

    if (!hasLoadedAutoSave.current) {
      hasLoadedAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving NPC...");

      const { error } = await supabase
        .from("npcs")
        .update({
          name: npc.name.trim() || "Unnamed NPC",
          age: npc.age,
          sex: npc.sex,
          class_name: npc.class_name,
          level: Number.isFinite(npc.level) ? npc.level : 0,
          personality_type: npc.personality_type,
          description: npc.description,
          image_url: npc.image_url,
          location_id: npc.location_id || null,
          faction: npc.faction,
          organization: npc.organization,
          status: npc.status,
          attributes: npc.attributes,
        })
        .eq("id", npc.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("NPC saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [npc]);

  const classOptions = useMemo(() => classes.map((classRecord) => classRecord.name).filter(Boolean), [classes]);

  if (isLoading) {
    return <p className="form-message">Loading NPC...</p>;
  }

  if (!npc) {
    return <p className="form-message">{message || "NPC not found."}</p>;
  }

  function updateNpc(patch: Partial<NpcRecord>) {
    setNpc((current) => (current ? { ...current, ...patch } : current));
  }

  function updateStatus(statusKey: NpcStatusKey, field: "current" | "max", value: string) {
    setNpc((current) =>
      current
        ? {
            ...current,
            status: {
              ...current.status,
              [statusKey]: {
                ...current.status[statusKey],
                [field]: value,
              },
            },
          }
        : current,
    );
  }

  function updateAttribute(attributeKey: NpcAttributeKey, value: string) {
    setNpc((current) =>
      current
        ? {
            ...current,
            attributes: {
              ...current.attributes,
              [attributeKey]: value,
            },
          }
        : current,
    );
  }

  return (
    <div className="npc-detail-page">
      <div className="npc-detail-actions">
        <Link className="secondary-inline-button compact-action" href="/dm/npcs">
          Back to NPCs
        </Link>
        {message ? <span>{message}</span> : null}
      </div>

      <section className="list-card npc-detail-hero">
        <div className="npc-portrait-panel">
          <div className="npc-detail-portrait" style={npc.image_url ? { backgroundImage: `url(${npc.image_url})` } : undefined}>
            {!npc.image_url ? npc.name.slice(0, 1).toUpperCase() : null}
          </div>
          <label className="field">
            <span>Image URL</span>
            <input value={npc.image_url} onChange={(event) => updateNpc({ image_url: event.target.value })} placeholder="Paste image link" />
          </label>
        </div>

        <div className="npc-identity-panel">
          <label className="field npc-name-field">
            <span>NPC Name</span>
            <input value={npc.name} onChange={(event) => updateNpc({ name: event.target.value })} />
          </label>

          <div className="npc-detail-grid">
            <label className="field npc-compact-field">
              <span>Age</span>
              <input value={npc.age} onChange={(event) => updateNpc({ age: event.target.value })} />
            </label>
            <label className="field npc-compact-field">
              <span>Sex</span>
              <input value={npc.sex} onChange={(event) => updateNpc({ sex: event.target.value })} />
            </label>
            <label className="field npc-class-field">
              <span>Class</span>
              <select value={npc.class_name} onChange={(event) => updateNpc({ class_name: event.target.value })}>
                <option value="">No class</option>
                {classOptions.map((className) => (
                  <option value={className} key={className}>
                    {className}
                  </option>
                ))}
              </select>
            </label>
            <label className="field npc-compact-field">
              <span>Level</span>
              <input
                inputMode="numeric"
                value={npc.level}
                onChange={(event) => updateNpc({ level: clampNumber(event.target.value, 0, 999) })}
              />
            </label>
            <label className="field npc-wide-field">
              <span>Personality Type</span>
              <input value={npc.personality_type} onChange={(event) => updateNpc({ personality_type: event.target.value })} />
            </label>
            <label className="field npc-wide-field">
              <span>Where They Are From</span>
              <select value={npc.location_id || ""} onChange={(event) => updateNpc({ location_id: event.target.value || null })}>
                <option value="">No location</option>
                {locations.map((location) => (
                  <option value={location.id} key={location.id}>
                    {location.name} ({location.location_type})
                  </option>
                ))}
              </select>
            </label>
            <label className="field npc-wide-field">
              <span>Faction</span>
              <input value={npc.faction} onChange={(event) => updateNpc({ faction: event.target.value })} />
            </label>
            <label className="field npc-wide-field">
              <span>Organization</span>
              <input value={npc.organization} onChange={(event) => updateNpc({ organization: event.target.value })} />
            </label>
          </div>
        </div>
      </section>

      <section className="list-card npc-description-panel">
        <label className="field">
          <span>Description</span>
          <textarea value={npc.description} onChange={(event) => updateNpc({ description: event.target.value })} />
        </label>
      </section>

      <section className="npc-sheet-grid">
        <div className="list-card npc-stat-section">
          <div className="list-header">
            <h3>Status</h3>
          </div>
          <div className="npc-status-grid">
            {statusKeys.map((statusKey) => (
              <div className="npc-status-box" key={statusKey}>
                <strong>{formatLabel(statusKey)}</strong>
                <label>
                  <span>Current</span>
                  <input inputMode="numeric" value={npc.status[statusKey].current} onChange={(event) => updateStatus(statusKey, "current", event.target.value)} />
                </label>
                <label>
                  <span>Max</span>
                  <input inputMode="numeric" value={npc.status[statusKey].max} onChange={(event) => updateStatus(statusKey, "max", event.target.value)} />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="list-card npc-stat-section">
          <div className="list-header">
            <h3>Attributes</h3>
          </div>
          <div className="npc-attribute-grid">
            {attributeKeys.map((attributeKey) => (
              <label className="npc-attribute-box" key={attributeKey}>
                <span>{attributeKey.toUpperCase()}</span>
                <input inputMode="numeric" value={npc.attributes[attributeKey]} onChange={(event) => updateAttribute(attributeKey, event.target.value)} />
              </label>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function normalizeNpc(npc: DbNpcRecord): NpcRecord {
  return {
    id: npc.id,
    owner_user_id: npc.owner_user_id || null,
    name: npc.name || "Unnamed NPC",
    age: npc.age || "",
    sex: npc.sex || "",
    class_name: npc.class_name || "",
    level: npc.level ?? 1,
    personality_type: npc.personality_type || "",
    description: npc.description || "",
    image_url: npc.image_url || "",
    location_id: npc.location_id || null,
    faction: npc.faction || "",
    organization: npc.organization || "",
    status: {
      ...createBlankStatus(),
      ...npc.status,
    },
    attributes: {
      ...createBlankAttributes(),
      ...npc.attributes,
    },
  };
}

function createBlankStatus(): NpcStatus {
  return {
    health: { current: "", max: "" },
    stamina: { current: "", max: "" },
    mind: { current: "", max: "" },
    divinity: { current: "", max: "" },
  };
}

function createBlankAttributes(): NpcAttributes {
  return {
    str: "10",
    spd: "10",
    int: "10",
    cha: "10",
    con: "10",
    dex: "10",
    wis: "10",
    fth: "10",
  };
}

function formatLabel(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function clampNumber(value: string, min: number, max: number) {
  const parsedValue = Number(value.replace(/[^\d]/g, ""));
  if (!Number.isFinite(parsedValue)) return min;
  return Math.min(max, Math.max(min, parsedValue));
}
