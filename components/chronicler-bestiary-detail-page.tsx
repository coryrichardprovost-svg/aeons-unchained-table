"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type WorldLocation = {
  id: string;
  name: string;
  location_type: string;
};

type CreatureStatusKey = "health" | "stamina" | "mind" | "divinity";
type CreatureAttributeKey = "str" | "spd" | "int" | "cha" | "con" | "dex" | "wis" | "fth";
type CreatureStatus = Record<CreatureStatusKey, string>;
type CreatureAttributes = Record<CreatureAttributeKey, string>;

type CreatureRecord = {
  id: string;
  owner_user_id: string | null;
  name: string;
  creature_type: string;
  image_url: string;
  description: string;
  origin_location_id: string | null;
  origin_location_ids: string[];
  strengths: string;
  weaknesses: string;
  status: CreatureStatus;
  attributes: CreatureAttributes;
  visibility: "chronicler" | "players";
};

const statusKeys: CreatureStatusKey[] = ["health", "stamina", "mind", "divinity"];
const attributeKeys: CreatureAttributeKey[] = ["str", "spd", "int", "cha", "con", "dex", "wis", "fth"];

export function ChroniclerBestiaryDetailPage({ creatureId }: { creatureId: string }) {
  const router = useRouter();
  const [creature, setCreature] = useState<CreatureRecord | null>(null);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hasLoadedAutoSave = useRef(false);

  const loadCreature = useCallback(async () => {
    const supabase = createClient();
    const [{ data: creatureData, error: creatureError }, { data: locationData, error: locationError }] = await Promise.all([
      supabase.from("bestiary_creatures").select("*").eq("id", creatureId).single(),
      supabase.from("world_locations").select("id,name,location_type").order("name", { ascending: true }),
    ]);

    if (creatureError) {
      setMessage(creatureError.message.includes("bestiary_creatures") ? "Run supabase/migrations/016_add_bestiary.sql in Supabase SQL Editor." : creatureError.message);
      setIsLoading(false);
      return;
    }

    if (locationError) {
      setMessage(locationError.message);
      setIsLoading(false);
      return;
    }

    setCreature(normalizeCreature(creatureData as Partial<CreatureRecord> & { id: string }));
    setLocations((locationData || []) as WorldLocation[]);
    setIsLoading(false);
  }, [creatureId]);

  useEffect(() => {
    // Creature records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCreature();
  }, [loadCreature]);

  useEffect(() => {
    if (!creature) return;

    if (!hasLoadedAutoSave.current) {
      hasLoadedAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving creature...");

      const { error } = await supabase
        .from("bestiary_creatures")
        .update({
          name: creature.name.trim() || "Unnamed Creature",
          creature_type: creature.creature_type,
          image_url: creature.image_url,
          description: creature.description,
          origin_location_id: creature.origin_location_ids[0] || creature.origin_location_id || null,
          origin_location_ids: creature.origin_location_ids,
          strengths: creature.strengths,
          weaknesses: creature.weaknesses,
          status: creature.status,
          attributes: creature.attributes,
          visibility: creature.visibility,
        })
        .eq("id", creature.id);

      setMessage(error ? error.message : "Creature saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [creature]);

  if (isLoading) return <p className="form-message">Loading creature...</p>;
  if (!creature) return <p className="form-message">{message || "Creature not found."}</p>;

  function updateCreature(patch: Partial<CreatureRecord>) {
    setCreature((current) => (current ? { ...current, ...patch } : current));
  }

  function addOriginLocation(locationId: string) {
    if (!locationId) return;
    setCreature((current) =>
      current
        ? {
            ...current,
            origin_location_id: current.origin_location_id || locationId,
            origin_location_ids: Array.from(new Set([...current.origin_location_ids, locationId])),
          }
        : current,
    );
  }

  function removeOriginLocation(locationId: string) {
    setCreature((current) => {
      if (!current) return current;
      const nextOriginIds = current.origin_location_ids.filter((originId) => originId !== locationId);
      return {
        ...current,
        origin_location_id: nextOriginIds[0] || null,
        origin_location_ids: nextOriginIds,
      };
    });
  }

  function updateStatus(statusKey: CreatureStatusKey, value: string) {
    setCreature((current) =>
      current
        ? {
            ...current,
            status: {
              ...current.status,
              [statusKey]: value,
            },
          }
        : current,
    );
  }

  function updateAttribute(attributeKey: CreatureAttributeKey, value: string) {
    setCreature((current) =>
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

  async function deleteCreature() {
    if (!creature) return;
    const supabase = createClient();
    setMessage("Deleting creature...");
    const { error } = await supabase.from("bestiary_creatures").delete().eq("id", creature.id);

    if (error) {
      setMessage(error.message);
      setShowDeleteConfirm(false);
      return;
    }

    router.push("/dm/knowledge?tab=Bestiary");
  }

  return (
    <div className="bestiary-detail-page">
      <div className="npc-detail-actions">
        <Link className="secondary-inline-button compact-action" href="/dm/knowledge?tab=Bestiary">
          Back to Bestiary
        </Link>
        <button className="danger-inline-button compact-action" onClick={() => setShowDeleteConfirm(true)}>
          Delete Creature
        </button>
        {message ? <span>{message}</span> : null}
      </div>

      <section className="bestiary-book">
        <div className="bestiary-book-page bestiary-book-image-page">
          <div className="bestiary-creature-image" style={creature.image_url ? { backgroundImage: `url(${creature.image_url})` } : undefined}>
            {!creature.image_url ? creature.name.slice(0, 1).toUpperCase() : null}
          </div>
          <label className="field">
            <span>Image URL</span>
            <input value={creature.image_url} onChange={(event) => updateCreature({ image_url: event.target.value })} />
          </label>
          <label className="field">
            <span>Where It Is From</span>
            <select value="" onChange={(event) => addOriginLocation(event.target.value)}>
              <option value="">Add origin area</option>
              {locations.map((location) => (
                <option value={location.id} key={location.id}>
                  {location.name} ({location.location_type})
                </option>
              ))}
            </select>
          </label>
          <div className="bestiary-origin-chip-list">
            {creature.origin_location_ids.map((locationId) => (
              <button type="button" className="tag teal tag-button" key={locationId} onClick={() => removeOriginLocation(locationId)}>
                {getLocationLabel(locationId, locations)} x
              </button>
            ))}
            {creature.origin_location_ids.length === 0 ? <p className="subcopy">No origin areas have been added yet.</p> : null}
          </div>
        </div>

        <div className="bestiary-book-page">
          <div className="bestiary-title-grid">
            <label className="field npc-name-field">
              <span>Creature Name</span>
              <input value={creature.name} onChange={(event) => updateCreature({ name: event.target.value })} />
            </label>
            <label className="field">
              <span>Creature Type</span>
              <input value={creature.creature_type} onChange={(event) => updateCreature({ creature_type: event.target.value })} />
            </label>
            <label className="field">
              <span>Visibility</span>
              <select value={creature.visibility} onChange={(event) => updateCreature({ visibility: event.target.value as CreatureRecord["visibility"] })}>
                <option value="chronicler">Chronicler Only</option>
                <option value="players">Player Visible Later</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>Description</span>
            <textarea value={creature.description} onChange={(event) => updateCreature({ description: event.target.value })} />
          </label>

          <div className="bestiary-split-notes">
            <label className="field">
              <span>Strengths</span>
              <textarea value={creature.strengths} onChange={(event) => updateCreature({ strengths: event.target.value })} />
            </label>
            <label className="field">
              <span>Weaknesses</span>
              <textarea value={creature.weaknesses} onChange={(event) => updateCreature({ weaknesses: event.target.value })} />
            </label>
          </div>
        </div>
      </section>

      <section className="bestiary-stat-grid">
        <div className="list-card npc-stat-section">
          <div className="list-header">
            <h3>Status</h3>
          </div>
          <div className="npc-status-grid">
            {statusKeys.map((statusKey) => (
              <div className="npc-status-box" key={statusKey}>
                <strong>{formatLabel(statusKey)}</strong>
                <label>
                  <span>{formatLabel(statusKey)}</span>
                  <input value={creature.status[statusKey]} onChange={(event) => updateStatus(statusKey, event.target.value)} />
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
                <input value={creature.attributes[attributeKey]} onChange={(event) => updateAttribute(attributeKey, event.target.value)} />
              </label>
            ))}
          </div>
        </div>
      </section>

      {showDeleteConfirm ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-creature-title">
          <section className="confirm-dialog">
            <p className="eyebrow">Protected Delete</p>
            <h3 id="delete-creature-title">Delete {creature.name}?</h3>
            <p className="subcopy">This will permanently remove this creature from the Bestiary, including its status, attributes, notes, and origin link.</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="danger-inline-button" onClick={deleteCreature}>
                Delete Creature
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function normalizeCreature(creature: Partial<CreatureRecord> & { id: string }): CreatureRecord {
  return {
    id: creature.id,
    owner_user_id: creature.owner_user_id || null,
    name: creature.name || "Unnamed Creature",
    creature_type: creature.creature_type || "",
    image_url: creature.image_url || "",
    description: creature.description || "",
    origin_location_id: creature.origin_location_id || null,
    origin_location_ids: normalizeOriginLocationIds(creature.origin_location_ids, creature.origin_location_id),
    strengths: creature.strengths || "",
    weaknesses: creature.weaknesses || "",
    status: normalizeStatus(creature.status),
    attributes: {
      ...createBlankAttributes(),
      ...creature.attributes,
    },
    visibility: creature.visibility || "chronicler",
  };
}

function normalizeOriginLocationIds(originLocationIds: unknown, originLocationId?: string | null) {
  const ids = Array.isArray(originLocationIds) ? originLocationIds.filter((value): value is string => typeof value === "string") : [];
  if (originLocationId && !ids.includes(originLocationId)) ids.unshift(originLocationId);
  return Array.from(new Set(ids));
}

function getLocationLabel(locationId: string, locations: WorldLocation[]) {
  const location = locations.find((candidate) => candidate.id === locationId);
  return location ? `${location.name} (${location.location_type})` : "Unknown area";
}

function createBlankStatus(): CreatureStatus {
  return {
    health: "",
    stamina: "",
    mind: "",
    divinity: "",
  };
}

function normalizeStatus(status: unknown): CreatureStatus {
  const blankStatus = createBlankStatus();
  if (!status || typeof status !== "object") return blankStatus;

  const statusRecord = status as Partial<Record<CreatureStatusKey, string | { current?: string; max?: string }>>;
  return {
    health: getStatusValue(statusRecord.health),
    stamina: getStatusValue(statusRecord.stamina),
    mind: getStatusValue(statusRecord.mind),
    divinity: getStatusValue(statusRecord.divinity),
  };
}

function getStatusValue(value: string | { current?: string; max?: string } | undefined) {
  if (typeof value === "string") return value;
  return value?.current || value?.max || "";
}

function createBlankAttributes(): CreatureAttributes {
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
