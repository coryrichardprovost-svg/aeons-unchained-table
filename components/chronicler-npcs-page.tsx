"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type WorldLocation = {
  id: string;
  parent_location_id: string | null;
  name: string;
  location_type: string;
};

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
};

export function ChroniclerNpcsPage() {
  const router = useRouter();
  const [npcs, setNpcs] = useState<NpcRecord[]>([]);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadNpcs = useCallback(async () => {
    const supabase = createClient();
    const [{ data: npcData, error: npcError }, { data: locationData, error: locationError }] = await Promise.all([
      supabase.from("npcs").select("*").order("name", { ascending: true }),
      supabase.from("world_locations").select("id,parent_location_id,name,location_type").order("name", { ascending: true }),
    ]);

    if (npcError) {
      setMessage(npcError.message.includes("npcs") ? "Run supabase/migrations/012_add_npcs.sql in Supabase SQL Editor." : npcError.message);
      setIsLoading(false);
      return;
    }

    if (locationError) {
      setMessage(locationError.message);
      setIsLoading(false);
      return;
    }

    setNpcs((npcData || []) as NpcRecord[]);
    setLocations((locationData || []) as WorldLocation[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // NPCs load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNpcs();
  }, [loadNpcs]);

  const groups = useMemo(() => {
    const groupNames = new Set<string>();
    npcs.forEach((npc) => {
      if (npc.faction.trim()) groupNames.add(npc.faction.trim());
      if (npc.organization.trim()) groupNames.add(npc.organization.trim());
    });
    return Array.from(groupNames).sort((left, right) => left.localeCompare(right));
  }, [npcs]);

  const filteredNpcs = useMemo(
    () =>
      npcs.filter((npc) => {
        const matchesLocation = !selectedLocationId || npc.location_id === selectedLocationId;
        const matchesGroup = !selectedGroup || npc.faction === selectedGroup || npc.organization === selectedGroup;
        return matchesLocation && matchesGroup;
      }),
    [npcs, selectedGroup, selectedLocationId],
  );

  async function createNpc() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("npcs")
      .insert({
        owner_user_id: user?.id,
        name: "New NPC",
        location_id: selectedLocationId || null,
      })
      .select("id")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(`/dm/npcs/${(data as { id: string }).id}`);
  }

  return (
    <div className="npc-dashboard">
      {message ? <p className="form-message">{message}</p> : null}

      <section className="list-card npc-dashboard-toolbar">
        <div className="list-header">
          <div>
            <h3>NPC Dashboard</h3>
            <p>Track people, factions, home locations, and the records the Chronicler can open during prep.</p>
          </div>
          <button className="primary-inline-button compact-action" onClick={createNpc}>
            New NPC
          </button>
        </div>

        <div className="npc-filter-grid">
          <label className="field">
            <span>Region or Location</span>
            <select value={selectedLocationId} onChange={(event) => setSelectedLocationId(event.target.value)}>
              <option value="">All Locations</option>
              {locations.map((location) => (
                <option value={location.id} key={location.id}>
                  {location.name} ({location.location_type})
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Faction or Organization</span>
            <select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)}>
              <option value="">All Groups</option>
              {groups.map((group) => (
                <option value={group} key={group}>
                  {group}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="npc-card-grid">
        {filteredNpcs.map((npc) => (
          <Link className="npc-card" href={`/dm/npcs/${npc.id}`} key={npc.id}>
            <div className="npc-card-portrait" style={npc.image_url ? { backgroundImage: `url(${npc.image_url})` } : undefined}>
              {!npc.image_url ? npc.name.slice(0, 1).toUpperCase() : null}
            </div>
            <div className="npc-card-body">
              <div>
                <strong>{npc.name}</strong>
                <span>{getLocationLabel(npc.location_id, locations)}</span>
              </div>
              <div className="npc-card-meta">
                <span className="tag teal">Level {npc.level || 0}</span>
                <span className="tag gold">{npc.class_name || "No class"}</span>
                <span className="tag">{npc.personality_type || "No personality set"}</span>
              </div>
              <p>{npc.description || "No description yet."}</p>
              <div className="npc-card-groups">
                <span>{npc.faction || "No faction"}</span>
                <span>{npc.organization || "No organization"}</span>
              </div>
            </div>
          </Link>
        ))}

        {!isLoading && filteredNpcs.length === 0 ? (
          <div className="empty-state">
            <strong>No NPCs found.</strong>
            <span>Create an NPC or clear the filters.</span>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function getLocationLabel(locationId: string | null, locations: WorldLocation[]) {
  const location = locations.find((candidate) => candidate.id === locationId);
  return location ? `${location.name} (${location.location_type})` : "No location set";
}
