"use client";

import { useCallback, useEffect, useState } from "react";
import { PlayerCharacterDashboard } from "@/components/player-character-dashboard";
import { WorkspaceShell } from "@/components/workspace-shell";
import { createClient } from "@/lib/supabase/browser";

type SheetHeaderCharacter = {
  name: string;
  class_name: string;
};

export function PlayerSheetPage() {
  const [title, setTitle] = useState("Trailblazer License");

  const loadSheetHeader = useCallback(async () => {
    const characterId = window.localStorage.getItem("aeons:selectedCharacterId");
    if (!characterId) return;

    const supabase = createClient();
    const { data } = await supabase.from("characters").select("name,class_name").eq("id", characterId).single();
    if (!data) return;

    const character = data as SheetHeaderCharacter;
    const characterName = character.name?.trim() || "Unnamed Character";
    const className = normalizeClassName(character.class_name);
    setTitle(`${characterName}, ${className}`);
  }, []);

  useEffect(() => {
    // The selected character id is stored in the browser after the picker flow.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSheetHeader();
  }, [loadSheetHeader]);

  return (
    <WorkspaceShell
      role="trailblazer"
      eyebrow="Trailblazer License"
      title={title}
      copy="Edit this character's license, attributes, equipment slots, notes, and campaign-ready details."
    >
      <PlayerCharacterDashboard />
    </WorkspaceShell>
  );
}

function normalizeClassName(className: string) {
  const cleanedClassName = className?.trim();
  if (!cleanedClassName || cleanedClassName.toLowerCase() === "unchosen class") return "Classless";
  return cleanedClassName;
}
