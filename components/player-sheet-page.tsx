"use client";

import { useCallback, useEffect, useState } from "react";
import { PlayerCharacterDashboard } from "@/components/player-character-dashboard";
import { WorkspaceShell } from "@/components/workspace-shell";
import { GameClassRecord, normalizeClassRecord } from "@/data/class-framework";
import { createClient } from "@/lib/supabase/browser";

type SheetHeaderCharacter = {
  name: string;
  class_name: string;
  sheet_data?: {
    selectedClassId?: string;
    classProgress?: {
      selectedSubclassId?: string;
    };
  } | null;
};

type DbGameClass = Partial<GameClassRecord> & {
  id: string;
  name: string;
  description: string;
};

export function PlayerSheetPage() {
  const [title, setTitle] = useState("Trailblazer License");

  const loadSheetHeader = useCallback(async () => {
    const characterId = window.localStorage.getItem("aeons:selectedCharacterId");
    if (!characterId) return;

    const supabase = createClient();
    const [characterResult, classesResult] = await Promise.all([
      supabase.from("characters").select("name,class_name,sheet_data").eq("id", characterId).single(),
      supabase.from("game_classes").select("*"),
    ]);

    if (!characterResult.data) return;

    const character = characterResult.data as SheetHeaderCharacter;
    const classes = (classesResult.data || []).map((classRecord) => normalizeClassRecord(classRecord as DbGameClass));
    const characterName = character.name?.trim() || "Unnamed Character";
    const className = getLicenseClassName(character, classes);
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

function getLicenseClassName(character: SheetHeaderCharacter, classes: GameClassRecord[]) {
  const selectedClassId = character.sheet_data?.selectedClassId;
  const selectedSubclassId = character.sheet_data?.classProgress?.selectedSubclassId;
  const selectedClass = classes.find((classRecord) => classRecord.id === selectedClassId);
  const selectedSubclass = selectedClass?.subclasses.find((subclass) => subclass.id === selectedSubclassId);

  const subclassName = selectedSubclass?.name.trim();
  if (subclassName) return subclassName;

  const className = selectedClass?.name.trim();
  if (className) return className;

  return normalizeClassName(character.class_name);
}

function normalizeClassName(className: string) {
  const cleanedClassName = className?.trim();
  if (!cleanedClassName || cleanedClassName.toLowerCase() === "unchosen class") return "Classless";
  return cleanedClassName;
}
