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

type CreatureRecord = {
  id: string;
  owner_user_id: string | null;
  name: string;
  creature_type: string;
  image_url: string;
  description: string;
  origin_location_id: string | null;
  strengths: string;
  weaknesses: string;
  visibility: "chronicler" | "players";
};

export function ChroniclerKnowledgePage() {
  const router = useRouter();
  const [creatures, setCreatures] = useState<CreatureRecord[]>([]);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [activeTab, setActiveTab] = useState("Bestiary");
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadKnowledge = useCallback(async () => {
    const supabase = createClient();
    const [{ data: creatureData, error: creatureError }, { data: locationData, error: locationError }] = await Promise.all([
      supabase.from("bestiary_creatures").select("*").order("name", { ascending: true }),
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

    setCreatures((creatureData || []) as CreatureRecord[]);
    setLocations((locationData || []) as WorldLocation[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Bestiary records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadKnowledge();
  }, [loadKnowledge]);

  const filteredCreatures = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    return creatures.filter((creature) => !cleanSearch || creature.name.toLowerCase().includes(cleanSearch));
  }, [creatures, searchTerm]);

  async function createCreature() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("bestiary_creatures")
      .insert({
        owner_user_id: user?.id,
        name: "New Creature",
      })
      .select("id")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(`/dm/knowledge/bestiary/${(data as { id: string }).id}`);
  }

  return (
    <div className="knowledge-dashboard">
      {message ? <p className="form-message">{message}</p> : null}

      <section className="list-card knowledge-toolbar">
        <div className="list-header">
          <div>
            <h3>Chronicler Knowledge</h3>
            <p className="subcopy">Build the private lore library that can later become player-facing discoveries.</p>
          </div>
          <button className="primary-inline-button compact-action" onClick={createCreature}>
            New Creature
          </button>
        </div>

        <div className="knowledge-tabs" role="tablist" aria-label="Knowledge sections">
          {["Bestiary", "Lore", "Discoveries"].map((tab) => (
            <button className={`knowledge-tab ${activeTab === tab ? "active" : ""}`} key={tab} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "Bestiary" ? (
        <>
          <section className="list-card knowledge-search-card">
            <label className="field">
              <span>Search Creatures</span>
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Creature name" />
            </label>
          </section>

          <section className="bestiary-card-grid">
            {filteredCreatures.map((creature) => (
              <Link className="bestiary-card" href={`/dm/knowledge/bestiary/${creature.id}`} key={creature.id}>
                <div className="bestiary-card-image" style={creature.image_url ? { backgroundImage: `url(${creature.image_url})` } : undefined}>
                  {!creature.image_url ? creature.name.slice(0, 1).toUpperCase() : null}
                </div>
                <div className="bestiary-card-body">
                  <div>
                    <strong>{creature.name}</strong>
                    <span>{creature.creature_type || "Unknown creature type"}</span>
                  </div>
                  <p>{creature.description || "No creature description yet."}</p>
                  <div className="market-card-meta">
                    <span className="tag teal">{getLocationLabel(creature.origin_location_id, locations)}</span>
                    <span className="tag">{creature.visibility}</span>
                  </div>
                </div>
              </Link>
            ))}

            {!isLoading && filteredCreatures.length === 0 ? (
              <div className="empty-state">
                <strong>No creatures found.</strong>
                <span>Create a creature or clear the search.</span>
              </div>
            ) : null}
          </section>
        </>
      ) : (
        <section className="empty-state">
          <strong>{activeTab} will come next.</strong>
          <span>The first working knowledge section is the Bestiary.</span>
        </section>
      )}
    </div>
  );
}

function getLocationLabel(locationId: string | null, locations: WorldLocation[]) {
  const location = locations.find((candidate) => candidate.id === locationId);
  return location ? `${location.name} (${location.location_type})` : "No origin set";
}
