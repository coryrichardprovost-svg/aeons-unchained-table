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

type ClassProgressData = {
  totalExp: string;
  selectedSubclassId: string;
  ranks: Record<string, number>;
};

type FeatureEntry = {
  feature: ClassFeature;
  id: string;
  slot: number;
};

export function PlayerClassPage() {
  const [character, setCharacter] = useState<DbCharacter | null>(null);
  const [classes, setClasses] = useState<GameClassRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [sheetData, setSheetData] = useState<Record<string, unknown>>({});
  const [progress, setProgress] = useState<ClassProgressData>(createDefaultProgress());
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const hasLoadedAutoSave = useRef(false);

  const selectedClass = useMemo(
    () => classes.find((classRecord) => classRecord.id === selectedClassId) || null,
    [classes, selectedClassId],
  );
  const selectedSubclass = useMemo(
    () => selectedClass?.subclasses.find((subclass) => subclass.id === progress.selectedSubclassId) || null,
    [progress.selectedSubclassId, selectedClass],
  );
  const totalExp = parseNumber(progress.totalExp);
  const spentExp = getTotalSpentExp(progress.ranks);
  const unspentExp = Math.max(0, totalExp - spentExp);

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
    setProgress(normalizeProgress(savedSheetData.classProgress));
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
      const nextSheetData = {
        ...sheetData,
        selectedClassId,
        classProgress: progress,
      };
      setMessage("Saving class progress...");

      const { error } = await supabase
        .from("characters")
        .update({
          class_name: nextClassName,
          sheet_data: nextSheetData,
        })
        .eq("id", character.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Class progress saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [character, progress, selectedClass, selectedClassId, sheetData]);

  function chooseClass(classId: string) {
    setSelectedClassId(classId);
    setProgress((current) => ({ ...current, selectedSubclassId: "", ranks: {} }));
  }

  function chooseSubclass(subclassId: string) {
    setProgress((current) => ({
      ...current,
      selectedSubclassId: subclassId,
      ranks: Object.fromEntries(Object.entries(current.ranks).filter(([featureId]) => !featureId.startsWith("subclass:"))),
    }));
  }

  function updateRank(featureId: string, rank: number) {
    setProgress((current) => ({
      ...current,
      ranks: {
        ...current.ranks,
        [featureId]: rank,
      },
    }));
  }

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
    <div className="player-class-sheet">
      {message ? <p className="form-message">{message}</p> : null}

      <section className="player-class-top">
        <div className="player-class-choice-panel">
          <label>
            <span>Class</span>
            <select value={selectedClassId} onChange={(event) => chooseClass(event.target.value)}>
              <option value="">Classless</option>
              {classes.map((classRecord) => (
                <option key={classRecord.id} value={classRecord.id}>
                  {classRecord.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Subclass</span>
            <select
              value={progress.selectedSubclassId}
              onChange={(event) => chooseSubclass(event.target.value)}
              disabled={!selectedClass}
            >
              <option value="">No Subclass</option>
              {selectedClass?.subclasses.map((subclass) => (
                <option key={subclass.id} value={subclass.id}>
                  {subclass.name || "Unnamed Subclass"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="player-exp-panel">
          <label>
            <span>Total EXP</span>
            <input
              inputMode="numeric"
              value={progress.totalExp}
              onChange={(event) => setProgress((current) => ({ ...current, totalExp: formatNumberText(event.target.value) }))}
            />
          </label>
          <label>
            <span>Total Spent EXP</span>
            <input readOnly value={formatNumber(spentExp)} />
          </label>
          <label>
            <span>Current Unspent</span>
            <input readOnly value={formatNumber(unspentExp)} />
          </label>
        </div>
      </section>

      {selectedClass ? (
        <section className="player-class-main">
          <div className="player-class-heading">
            <h3>{selectedClass.name}</h3>
            <p className="subcopy">{selectedClass.description || "No class description yet."}</p>
          </div>

          <div className="player-class-columns">
            <FeatureList
              title="Class Skills"
              prefix={`class:${selectedClass.id}:skill`}
              features={selectedClass.skills}
              progress={progress}
              totalExp={totalExp}
              onRankChange={updateRank}
            />
            <FeatureList
              title="Class Abilities"
              prefix={`class:${selectedClass.id}:ability`}
              features={selectedClass.abilities}
              progress={progress}
              totalExp={totalExp}
              onRankChange={updateRank}
            />
          </div>

          {selectedSubclass ? (
            <>
              <div className="player-class-heading">
                <h3>{selectedSubclass.name || "Unnamed Subclass"}</h3>
                <p className="subcopy">{selectedSubclass.description || "No subclass description yet."}</p>
              </div>
              <div className="player-class-columns">
                <FeatureList
                  title="Subclass Skills"
                  prefix={`subclass:${selectedSubclass.id}:skill`}
                  features={selectedSubclass.skills}
                  progress={progress}
                  totalExp={totalExp}
                  onRankChange={updateRank}
                />
                <FeatureList
                  title="Subclass Abilities"
                  prefix={`subclass:${selectedSubclass.id}:ability`}
                  features={selectedSubclass.abilities}
                  progress={progress}
                  totalExp={totalExp}
                  onRankChange={updateRank}
                />
              </div>
            </>
          ) : null}
        </section>
      ) : (
        <section className="detail-panel class-view-panel">
          <h3>Classless</h3>
          <p className="subcopy">Choose a basic class to see its skills, abilities, ranks, and EXP costs.</p>
        </section>
      )}
    </div>
  );
}

function FeatureList({
  title,
  prefix,
  features,
  progress,
  totalExp,
  onRankChange,
}: {
  title: string;
  prefix: string;
  features: ClassFeature[];
  progress: ClassProgressData;
  totalExp: number;
  onRankChange: (featureId: string, rank: number) => void;
}) {
  const visibleFeatures = features
    .map((feature, index) => ({ feature, slot: index + 1, id: `${prefix}:${index}` }))
    .filter(({ feature }) => feature.name || feature.description);

  return (
    <section className="player-feature-section">
      <h3>{title}</h3>
      <div className="player-feature-stack">
        {visibleFeatures.map((entry) => (
          <FeatureCard key={entry.id} entry={entry} progress={progress} totalExp={totalExp} onRankChange={onRankChange} />
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

function FeatureCard({
  entry,
  progress,
  totalExp,
  onRankChange,
}: {
  entry: FeatureEntry;
  progress: ClassProgressData;
  totalExp: number;
  onRankChange: (featureId: string, rank: number) => void;
}) {
  const rank = progress.ranks[entry.id] || 0;
  const spent = getRankCost(rank);
  const spentWithoutCurrent = getTotalSpentExp(progress.ranks) - spent;
  const maxAffordableRank = getMaxAffordableRank(totalExp - spentWithoutCurrent);
  const maxSelectableRank = Math.max(rank, maxAffordableRank);

  return (
    <article className="player-feature-card">
      <div className="player-feature-info">
        <div className="player-feature-name">{entry.feature.name || `Slot ${entry.slot}`}</div>
        <div className="player-feature-required">
          <span>Required Level</span>
          <strong>{entry.feature.level || "0"}</strong>
        </div>
        <div className="player-feature-cost-row">
          <span>{rank === 0 ? "100" : "0"}</span>
          <strong>Buy</strong>
        </div>
        <div className="player-feature-cost-row">
          <span>{rank >= 5 ? "0" : formatNumber(100 * (rank + 1))}</span>
          <strong>Upgrade</strong>
        </div>
        <div className="player-feature-cost-row">
          <select value={rank} onChange={(event) => onRankChange(entry.id, Number(event.target.value))}>
            {Array.from({ length: maxSelectableRank + 1 }).map((_, optionRank) => (
              <option key={optionRank} value={optionRank}>
                {optionRank}
              </option>
            ))}
          </select>
          <strong>Rank</strong>
        </div>
        <div className="player-feature-cost-row">
          <span>{formatNumber(spent)}</span>
          <strong>EXP Spent</strong>
        </div>
        <div className="player-feature-resource-row">
          <span>{entry.feature.mpCost || "0"} MP</span>
          <span>{entry.feature.spCost || "0"} SP</span>
        </div>
      </div>
      <div className="player-feature-description">{entry.feature.description || "No description yet."}</div>
    </article>
  );
}

function createDefaultProgress(): ClassProgressData {
  return {
    totalExp: "",
    selectedSubclassId: "",
    ranks: {},
  };
}

function normalizeProgress(progress: unknown): ClassProgressData {
  if (!progress || typeof progress !== "object") return createDefaultProgress();
  const partialProgress = progress as Partial<ClassProgressData>;

  return {
    totalExp: typeof partialProgress.totalExp === "string" ? partialProgress.totalExp : "",
    selectedSubclassId: typeof partialProgress.selectedSubclassId === "string" ? partialProgress.selectedSubclassId : "",
    ranks: normalizeRanks(partialProgress.ranks),
  };
}

function normalizeRanks(ranks: ClassProgressData["ranks"] | undefined) {
  if (!ranks) return {};
  return Object.fromEntries(Object.entries(ranks).map(([key, value]) => [key, clampRank(Number(value))]));
}

function getRankCost(rank: number) {
  const safeRank = clampRank(rank);
  return 50 * safeRank * (safeRank + 1);
}

function getTotalSpentExp(ranks: ClassProgressData["ranks"]) {
  return Object.values(ranks).reduce((total, rank) => total + getRankCost(rank), 0);
}

function getMaxAffordableRank(availableExp: number) {
  for (let rank = 5; rank >= 0; rank -= 1) {
    if (getRankCost(rank) <= availableExp) return rank;
  }
  return 0;
}

function clampRank(rank: number) {
  if (!Number.isFinite(rank)) return 0;
  return Math.min(5, Math.max(0, rank));
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatNumberText(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return formatNumber(Number(digits));
}
