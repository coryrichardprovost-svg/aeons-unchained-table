"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CharacterProfile } from "@/data/domain";
import { Icon } from "@/components/icons";
import { createClient } from "@/lib/supabase/browser";

type DbCharacter = {
  id: string;
  owner_user_id: string;
  campaign_id: string | null;
  name: string;
  class_name: string;
  level: number;
  ancestry: string;
  background: string;
  resolve_current: number;
  resolve_max: number;
  wounds: number;
  notes: string;
  attributes: Record<string, number | undefined>;
};

export default function CharacterProfilesPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [userId, setUserId] = useState("");
  const [newCharacterName, setNewCharacterName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadCharacters = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setMessage(userError.message);
      setIsLoading(false);
      return;
    }

    if (!user) {
      setUserId("");
      setCharacters([]);
      setSelectedId("");
      setIsLoading(false);
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .eq("owner_user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    const mapped = (data || []).map(mapDbCharacter);
    setCharacters(mapped);

    const savedSelection = window.localStorage.getItem("aeons:selectedCharacterId") || "";
    const nextSelected = mapped.find((character) => character.id === savedSelection)?.id || mapped[0]?.id || "";
    setSelectedId(nextSelected);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Character cards load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCharacters();
  }, [loadCharacters]);

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedId) || null,
    [characters, selectedId],
  );

  function selectCharacter(character: CharacterProfile) {
    setSelectedId(character.id);
    setIsCreating(false);
    setMessage("");
  }

  function startNewCharacter() {
    setIsCreating(true);
    setSelectedId("");
    setNewCharacterName("");
    setMessage("");
  }

  function chooseCharacter(characterId = selectedId) {
    if (!characterId) {
      setMessage("Choose or create a character first.");
      return;
    }

    window.localStorage.setItem("aeons:selectedCharacterId", characterId);
    router.push("/player/sheet");
  }

  async function createCharacter() {
    if (!userId) {
      setMessage("Sign in before creating a character.");
      return;
    }

    const trimmedName = newCharacterName.trim();
    if (!trimmedName) {
      setMessage("Name your character first.");
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("characters")
      .insert({
        owner_user_id: userId,
        name: trimmedName,
        class_name: "Unchosen Class",
        level: 1,
        ancestry: "",
        background: "",
        resolve_current: 10,
        resolve_max: 10,
        wounds: 0,
        notes: "",
        attributes: {
          str: 10,
          spd: 10,
          int: 10,
          cha: 10,
          con: 10,
          dex: 10,
          wis: 10,
          fth: 10,
        },
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    const saved = mapDbCharacter(data as DbCharacter);
    setCharacters((current) => [saved, ...current]);
    setSelectedId(saved.id);
    window.localStorage.setItem("aeons:selectedCharacterId", saved.id);
    router.push("/player/sheet");
  }

  return (
    <main className="app-shell">
      <section className="character-gate">
        <div className="character-gate-header">
          <div className="brand-mark">
            <Icon name="aeon" />
          </div>
          <div>
            <p className="eyebrow">Trailblazer Entry</p>
            <h1>Choose Your Character</h1>
            <p className="subcopy">
              Select a Trailblazer profile before entering the table. Each character opens into its own dashboard.
            </p>
          </div>
        </div>

        {!userId && !isLoading ? (
          <section className="list-card section-gap">
            <div className="list-header">
              <h3>Sign In Required</h3>
              <span className="tag crimson">No session</span>
            </div>
            <p className="subcopy">Sign in or create an account before saving characters to Supabase.</p>
            <Link className="primary-inline-button" href="/auth">
              Open Sign In
            </Link>
          </section>
        ) : null}

        {message ? <p className="form-message section-gap">{message}</p> : null}

        <div className="character-select-layout character-gate-layout">
          <section className="list-card character-card-rail">
            <div className="list-header">
              <h3>Characters</h3>
              <span className="tag teal">{isLoading ? "Loading" : `${characters.length} saved`}</span>
            </div>
            <div className="license-card-list">
              <button className={`profile-card new-license-card ${isCreating ? "active" : ""}`} onClick={startNewCharacter}>
                <Icon name="plus" />
                <strong>New Character</strong>
                <span>Create a new Trailblazer</span>
              </button>
              {characters.map((character) => (
                <button
                  className={`profile-card ${character.id === selectedCharacter?.id ? "active" : ""}`}
                  key={character.id}
                  onClick={() => selectCharacter(character)}
                >
                  <strong>{character.name}</strong>
                  <span>{character.className}</span>
                  <span className="tag">{character.campaignName}</span>
                </button>
              ))}
              {!isLoading && characters.length === 0 ? (
                <div className="empty-state">
                  <strong>No characters yet.</strong>
                  <span className="muted">Create your first Trailblazer License.</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="detail-panel license-detail-panel character-picker-focus">
            {isCreating ? (
              <div className="character-create-panel">
                <div className="list-header character-create-header">
                  <div>
                    <p className="eyebrow">Character Creation</p>
                    <h3>Name Your Trailblazer</h3>
                    <p className="subcopy">Start with a name. The full License opens after creation.</p>
                  </div>
                  <span className="tag gold">New License</span>
                </div>
                <label className="field character-name-field">
                  <span>Character Name</span>
                  <input
                    autoFocus
                    value={newCharacterName}
                    onChange={(event) => setNewCharacterName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void createCharacter();
                    }}
                  />
                </label>
                <div className="license-action-row">
                  <button className="secondary-button" onClick={() => setIsCreating(false)}>
                    Cancel
                  </button>
                  <button className="primary-inline-button" onClick={createCharacter} disabled={!userId}>
                    <Icon name="scroll" /> Create Character
                  </button>
                </div>
              </div>
            ) : selectedCharacter ? (
              <>
                <div className="list-header">
                  <div>
                    <p className="eyebrow">Selected Trailblazer</p>
                    <h3>{selectedCharacter.name}</h3>
                  </div>
                  <span className="tag gold">Ready</span>
                </div>
                <div className="license-summary-grid">
                  <StatPill label="Class" value={selectedCharacter.className || "Unchosen Class"} />
                  <StatPill label="Level" value={`${selectedCharacter.level}`} />
                  <StatPill label="Campaign" value={selectedCharacter.campaignName} />
                  <StatPill label="Resolve" value={`${selectedCharacter.resolveCurrent} / ${selectedCharacter.resolveMax}`} />
                </div>
                <p className="subcopy section-gap">
                  Open this profile to enter that character&apos;s dashboard. Their sheet, inventory, knowledge, notes, and
                  crafting pages will belong to this selected Trailblazer.
                </p>
                <div className="license-action-row">
                  <button className="primary-inline-button" onClick={() => chooseCharacter()}>
                    Open Character Dashboard
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-detail-state">
                <p className="eyebrow">Trailblazer Profile</p>
                <h3>Pick a character or create a new one.</h3>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function mapDbCharacter(character: DbCharacter): CharacterProfile {
  return {
    id: character.id,
    name: character.name,
    playerName: "Trailblazer",
    className: character.class_name,
    level: character.level,
    campaignName: character.campaign_id ? "Assigned Campaign" : "Unassigned",
    ancestry: character.ancestry,
    background: character.background,
    resolveCurrent: character.resolve_current,
    resolveMax: character.resolve_max,
    wounds: character.wounds,
    attributes: normalizeAttributes(character.attributes),
    notes: character.notes,
  };
}

function normalizeAttributes(attributes: Record<string, number | undefined>): CharacterProfile["attributes"] {
  return {
    str: attributes.str ?? attributes.might ?? 10,
    spd: attributes.spd ?? attributes.grace ?? 10,
    int: attributes.int ?? attributes.wits ?? 10,
    cha: attributes.cha ?? attributes.presence ?? 10,
    con: attributes.con ?? attributes.spirit ?? 10,
    dex: attributes.dex ?? attributes.grace ?? 10,
    wis: attributes.wis ?? attributes.wits ?? 10,
    fth: attributes.fth ?? attributes.spirit ?? 10,
  };
}
