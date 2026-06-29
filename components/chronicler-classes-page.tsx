"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  attributeBonusKeys,
  ClassFeature,
  createBlankClass,
  createBlankSubClass,
  GameClassRecord,
  normalizeClassRecord,
  SubClassRecord,
} from "@/data/class-framework";
import { createClient } from "@/lib/supabase/browser";

type DbGameClass = {
  id: string;
  name: string;
  description: string;
  attribute_bonuses: GameClassRecord["attribute_bonuses"];
  skills: ClassFeature[];
  abilities: ClassFeature[];
  subclasses: SubClassRecord[];
};

export function ChroniclerClassesPage() {
  const [classes, setClasses] = useState<GameClassRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const loadedClassIds = useRef(new Set<string>());

  const selectedClass = useMemo(
    () => classes.find((classRecord) => classRecord.id === selectedId) || null,
    [classes, selectedId],
  );

  const loadClasses = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("game_classes").select("*").order("name", { ascending: true });

    if (error) {
      setMessage(error.message.includes("game_classes") ? "Run supabase/migrations/010_add_game_classes.sql in Supabase SQL Editor." : error.message);
      setIsLoading(false);
      return;
    }

    const mappedClasses = (data || []).map((classRecord) => normalizeClassRecord(classRecord as DbGameClass));
    setClasses(mappedClasses);
    setSelectedId(mappedClasses[0]?.id || "");
    mappedClasses.forEach((classRecord) => loadedClassIds.current.add(classRecord.id));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Class records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (!selectedClass || !loadedClassIds.current.has(selectedClass.id)) return;

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving class...");

      const { error } = await supabase
        .from("game_classes")
        .update({
          name: selectedClass.name.trim() || "Unnamed Class",
          description: selectedClass.description,
          attribute_bonuses: selectedClass.attribute_bonuses,
          skills: selectedClass.skills,
          abilities: selectedClass.abilities,
          subclasses: selectedClass.subclasses,
        })
        .eq("id", selectedClass.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Class saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [selectedClass]);

  async function createClass() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const blankClass = createBlankClass();

    const { data, error } = await supabase
      .from("game_classes")
      .insert({
        owner_user_id: user?.id,
        ...blankClass,
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    const savedClass = normalizeClassRecord(data as DbGameClass);
    loadedClassIds.current.add(savedClass.id);
    setClasses((current) => [savedClass, ...current]);
    setSelectedId(savedClass.id);
    setMessage("New class created.");
  }

  function updateSelectedClass(nextClass: GameClassRecord) {
    setClasses((current) => current.map((classRecord) => (classRecord.id === nextClass.id ? nextClass : classRecord)));
  }

  return (
    <div className="class-builder-layout">
      {message ? <p className="form-message class-builder-message">{message}</p> : null}

      <section className="list-card class-rail">
        <div className="list-header">
          <h3>Classes</h3>
          <button className="primary-inline-button compact-action" onClick={createClass}>
            New Class
          </button>
        </div>

        <div className="license-card-list">
          {classes.map((classRecord) => (
            <button
              className={`profile-card ${classRecord.id === selectedId ? "active" : ""}`}
              key={classRecord.id}
              onClick={() => setSelectedId(classRecord.id)}
            >
              <strong>{classRecord.name}</strong>
              <span>{classRecord.description || "No description yet."}</span>
              <span className="tag teal">{classRecord.subclasses.length} subclasses</span>
            </button>
          ))}

          {!isLoading && classes.length === 0 ? (
            <div className="empty-state">
              <strong>No classes yet.</strong>
              <span>Create the first Aeons Unchained class.</span>
            </div>
          ) : null}
        </div>
      </section>

      {selectedClass ? (
        <ClassEditor classRecord={selectedClass} onChange={updateSelectedClass} />
      ) : (
        <section className="detail-panel class-editor-panel">
          <h3>{isLoading ? "Loading Classes" : "Select a Class"}</h3>
          <p className="subcopy">Create or select a class to start editing its bonuses, skills, abilities, and subclasses.</p>
        </section>
      )}
    </div>
  );
}

function ClassEditor({ classRecord, onChange }: { classRecord: GameClassRecord; onChange: (classRecord: GameClassRecord) => void }) {
  function updateFeatureList(featureType: "skills" | "abilities", index: number, nextFeature: ClassFeature) {
    onChange({
      ...classRecord,
      [featureType]: classRecord[featureType].map((feature, featureIndex) => (featureIndex === index ? nextFeature : feature)),
    });
  }

  function updateSubClass(index: number, nextSubClass: SubClassRecord) {
    onChange({
      ...classRecord,
      subclasses: classRecord.subclasses.map((subclass, subclassIndex) => (subclassIndex === index ? nextSubClass : subclass)),
    });
  }

  return (
    <section className="detail-panel class-editor-panel">
      <div className="list-header">
        <h3>Class Page</h3>
        <span className="tag teal">Autosaves</span>
      </div>

      <div className="class-editor-grid">
        <label className="field">
          <span>Class Name</span>
          <input value={classRecord.name} onChange={(event) => onChange({ ...classRecord, name: event.target.value })} />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea value={classRecord.description} onChange={(event) => onChange({ ...classRecord, description: event.target.value })} />
        </label>
      </div>

      <section className="class-builder-section">
        <div className="list-header">
          <h3>Attribute Bonuses</h3>
          <span className="tag gold">Numbers</span>
        </div>
        <div className="class-bonus-grid">
          {attributeBonusKeys.map((attribute) => (
            <label key={attribute}>
              <span>{attribute.toUpperCase()}</span>
              <input
                inputMode="numeric"
                value={classRecord.attribute_bonuses[attribute]}
                onChange={(event) =>
                  onChange({
                    ...classRecord,
                    attribute_bonuses: {
                      ...classRecord.attribute_bonuses,
                      [attribute]: formatSignedNumber(event.target.value),
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      </section>

      <div className="class-feature-panels">
        <FeatureEditor title="Class Skills" features={classRecord.skills} onChange={(index, feature) => updateFeatureList("skills", index, feature)} />
        <FeatureEditor title="Class Abilities" features={classRecord.abilities} onChange={(index, feature) => updateFeatureList("abilities", index, feature)} />
      </div>

      <section className="class-builder-section">
        <div className="list-header">
          <h3>Subclasses</h3>
          <button
            className="secondary-button compact-action"
            onClick={() => onChange({ ...classRecord, subclasses: [...classRecord.subclasses, createBlankSubClass()] })}
          >
            Add Subclass
          </button>
        </div>

        <div className="subclass-stack">
          {classRecord.subclasses.map((subclass, index) => (
            <SubClassEditor key={subclass.id} subclass={subclass} onChange={(nextSubClass) => updateSubClass(index, nextSubClass)} />
          ))}

          {classRecord.subclasses.length === 0 ? (
            <div className="empty-state">
              <strong>No subclasses yet.</strong>
              <span>Add evolutions or advanced paths for this class when you are ready.</span>
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}

function SubClassEditor({ subclass, onChange }: { subclass: SubClassRecord; onChange: (subclass: SubClassRecord) => void }) {
  function updateFeatureList(featureType: "skills" | "abilities", index: number, nextFeature: ClassFeature) {
    onChange({
      ...subclass,
      [featureType]: subclass[featureType].map((feature, featureIndex) => (featureIndex === index ? nextFeature : feature)),
    });
  }

  return (
    <section className="subclass-editor">
      <div className="class-editor-grid">
        <label className="field">
          <span>Subclass Name</span>
          <input value={subclass.name} onChange={(event) => onChange({ ...subclass, name: event.target.value })} />
        </label>
        <label className="field">
          <span>Subclass Description</span>
          <textarea value={subclass.description} onChange={(event) => onChange({ ...subclass, description: event.target.value })} />
        </label>
      </div>
      <div className="class-feature-panels">
        <FeatureEditor title="Subclass Skills" features={subclass.skills} onChange={(index, feature) => updateFeatureList("skills", index, feature)} />
        <FeatureEditor title="Subclass Abilities" features={subclass.abilities} onChange={(index, feature) => updateFeatureList("abilities", index, feature)} />
      </div>
    </section>
  );
}

function FeatureEditor({
  title,
  features,
  onChange,
}: {
  title: string;
  features: ClassFeature[];
  onChange: (index: number, feature: ClassFeature) => void;
}) {
  return (
    <section className="class-builder-section">
      <div className="list-header">
        <h3>{title}</h3>
        <span className="tag">{features.length} slots</span>
      </div>
      <div className="class-feature-table">
        <div className="class-feature-row class-feature-head">
          <strong>Name</strong>
          <strong>Description</strong>
          <strong>Level</strong>
        </div>
        {features.map((feature, index) => (
          <div className="class-feature-row" key={index}>
            <input value={feature.name} onChange={(event) => onChange(index, { ...feature, name: event.target.value })} />
            <input value={feature.description} onChange={(event) => onChange(index, { ...feature, description: event.target.value })} />
            <select value={feature.level} onChange={(event) => onChange(index, { ...feature, level: event.target.value })}>
              {["1", "2", "3", "4", "5"].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatSignedNumber(value: string) {
  const sign = value.trim().startsWith("-") ? "-" : "";
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return `${sign}${Number(digits)}`;
}
