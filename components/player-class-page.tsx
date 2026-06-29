"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClassFeature, GameClassRecord, normalizeClassRecord, SubClassRecord } from "@/data/class-framework";
import { createClient } from "@/lib/supabase/browser";

type DbCharacter = {
  id: string;
  name: string;
  class_name: string;
  sheet_data?: Record<string, unknown> | null;
};

type DbGameClass = {
  id: string;
  name: string;
  description: string;
  attribute_bonuses: GameClassRecord["attribute_bonuses"];
  skills: ClassFeature[];
  abilities: ClassFeature[];
  subclasses: SubClassRecord[];
};

export function PlayerClassPage() {
  const [character, setCharacter] = useState<DbCharacter | null>(null);
  const [classes, setClasses] = useState<GameClassRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [sheetData, setSheetData] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const hasLoadedAutoSave = useRef(false);

  const selectedClass = useMemo(
    () => classes.find((classRecord) => classRecord.id === selectedClassId) || null,
    [classes, selectedClassId],
  );

  const loadClassPage = useCallback(async () => {
    const characterId = window.localStorage.getItem("aeons:selectedCharacterId");

    if (!characterId) {
      setMessage("Choose a character before opening the class page.");
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const [characterResult, classesResult] = await Promise.all([
      supabase.from("characters").select("id,name,class_name,sheet_data").eq("id", characterId).single(),
      supabase.from("game_classes").select("*").order("name", { ascending: true }),
    ]);

    if (characterResult.error) {
      setMessage(characterResult.error.message);
      setIsLoading(false);
      return;
    }

    if (classesResult.error) {
      setMessage(
        classesResult.error.message.includes("game_classes")
          ? "Run supabase/migrations/010_add_game_classes.sql in Supabase SQL Editor."
          : classesResult.error.message,
      );
      setIsLoading(false);
      return;
    }

    const dbCharacter = characterResult.data as DbCharacter;
    const savedSheetData = dbCharacter.sheet_data || {};
    const mappedClasses = (classesResult.data || []).map((classRecord) => normalizeClassRecord(classRecord as DbGameClass));
    const savedClassId = typeof savedSheetData.selectedClassId === "string" ? savedSheetData.selectedClassId : "";
    const matchingClass = mappedClasses.find((classRecord) => classRecord.id === savedClassId);

    setCharacter(dbCharacter);
    setSheetData(savedSheetData);
    setClasses(mappedClasses);
    setSelectedClassId(matchingClass?.id || "");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Class choices load after the selected character is known in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadClassPage();
  }, [loadClassPage]);

  useEffect(() => {
    if (!character) return;

    if (!hasLoadedAutoSave.current) {
      hasLoadedAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      const nextClassName = selectedClass?.name || "Unchosen Class";
      setMessage("Saving class choice...");

      const { error } = await supabase
        .from("characters")
        .update({
          class_name: nextClassName,
          sheet_data: {
            ...sheetData,
            selectedClassId,
          },
        })
        .eq("id", character.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Class saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [character, selectedClass, selectedClassId, sheetData]);

  if (isLoading) {
    return (
      <section className="list-card section-gap">
        <div className="list-header">
          <h3>Loading Classes</h3>
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
    <div className="player-class-layout">
      {message ? <p className="form-message class-builder-message">{message}</p> : null}

      <section className="list-card">
        <div className="list-header">
          <h3>Choose Basic Class</h3>
          <span className="tag teal">{classes.length} available</span>
        </div>

        <label className="field section-gap">
          <span>Class</span>
          <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
            <option value="">Classless</option>
            {classes.map((classRecord) => (
              <option key={classRecord.id} value={classRecord.id}>
                {classRecord.name}
              </option>
            ))}
          </select>
        </label>

        <div className="class-choice-summary section-gap">
          <strong>{selectedClass?.name || "Classless"}</strong>
          <p className="subcopy">{selectedClass?.description || "No class has been chosen for this Trailblazer yet."}</p>
        </div>
      </section>

      {selectedClass ? (
        <section className="detail-panel class-view-panel">
          <div className="list-header">
            <h3>{selectedClass.name}</h3>
            <span className="tag gold">Basic Class</span>
          </div>

          <AttributeBonusSummary classRecord={selectedClass} />

          <div className="class-feature-panels">
            <FeatureList title="Class Skills" features={selectedClass.skills} />
            <FeatureList title="Class Abilities" features={selectedClass.abilities} />
          </div>

          <section className="class-builder-section">
            <div className="list-header">
              <h3>Subclasses</h3>
              <span className="tag">{selectedClass.subclasses.length} paths</span>
            </div>
            <div className="subclass-read-list">
              {selectedClass.subclasses.map((subclass) => (
                <div className="subclass-read-card" key={subclass.id}>
                  <strong>{subclass.name}</strong>
                  <p className="subcopy">{subclass.description || "No subclass description yet."}</p>
                  <div className="class-feature-panels">
                    <FeatureList title="Subclass Skills" features={subclass.skills} />
                    <FeatureList title="Subclass Abilities" features={subclass.abilities} />
                  </div>
                </div>
              ))}
              {selectedClass.subclasses.length === 0 ? (
                <div className="empty-state">
                  <strong>No subclasses yet.</strong>
                  <span>The Chronicler can add evolutions for this class later.</span>
                </div>
              ) : null}
            </div>
          </section>
        </section>
      ) : (
        <section className="detail-panel class-view-panel">
          <h3>Classless</h3>
          <p className="subcopy">Choose a basic class to see its Chronicler-maintained skills and abilities.</p>
        </section>
      )}
    </div>
  );
}

function AttributeBonusSummary({ classRecord }: { classRecord: GameClassRecord }) {
  const bonuses = Object.entries(classRecord.attribute_bonuses).filter(([, value]) => value);

  return (
    <section className="class-builder-section">
      <div className="list-header">
        <h3>Attribute Bonuses</h3>
        <span className="tag">{bonuses.length || "None"}</span>
      </div>
      <div className="class-bonus-grid">
        {Object.entries(classRecord.attribute_bonuses).map(([attribute, value]) => (
          <div className="class-bonus-read" key={attribute}>
            <span>{attribute.toUpperCase()}</span>
            <strong>{value || "0"}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureList({ title, features }: { title: string; features: ClassFeature[] }) {
  const visibleFeatures = features.filter((feature) => feature.name || feature.description);

  return (
    <section className="class-builder-section">
      <div className="list-header">
        <h3>{title}</h3>
        <span className="tag teal">{visibleFeatures.length}</span>
      </div>
      <div className="class-read-feature-list">
        {visibleFeatures.map((feature, index) => (
          <div className="class-read-feature" key={`${feature.name}-${index}`}>
            <div>
              <strong>{feature.name || "Unnamed"}</strong>
              <span>
                {feature.slot ? `Slot ${feature.slot} / ` : ""}Level {feature.level}
                {feature.mpCost ? ` / ${feature.mpCost} MP` : ""}
                {feature.spCost ? ` / ${feature.spCost} SP` : ""}
              </span>
            </div>
            <p className="subcopy">{feature.description || "No description yet."}</p>
          </div>
        ))}
        {visibleFeatures.length === 0 ? (
          <div className="empty-state">
            <strong>No entries yet.</strong>
            <span>The Chronicler can add up to 10 here.</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
