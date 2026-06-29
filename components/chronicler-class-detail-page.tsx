"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  attributeBonusKeys,
  ClassFeature,
  createBlankSubClass,
  GameClassRecord,
  normalizeClassRecord,
  SubClassRecord,
} from "@/data/class-framework";
import { createClient } from "@/lib/supabase/browser";

type DbGameClass = Partial<GameClassRecord> & {
  id: string;
  name: string;
  description: string;
};

export function ChroniclerClassDetailPage({ classId }: { classId: string }) {
  const [classRecord, setClassRecord] = useState<GameClassRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const hasLoadedAutoSave = useRef(false);

  const loadClass = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("game_classes").select("*").eq("id", classId).single();

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    setClassRecord(normalizeClassRecord(data as DbGameClass));
    setIsLoading(false);
  }, [classId]);

  useEffect(() => {
    // Class records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadClass();
  }, [loadClass]);

  useEffect(() => {
    if (!classRecord) return;

    if (!hasLoadedAutoSave.current) {
      hasLoadedAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving class...");

      const { error } = await supabase
        .from("game_classes")
        .update({
          name: classRecord.name.trim() || "Unnamed Class",
          description: classRecord.description,
          attribute_bonuses: classRecord.attribute_bonuses,
          skills: classRecord.skills,
          abilities: classRecord.abilities,
          subclasses: classRecord.subclasses,
        })
        .eq("id", classRecord.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Class saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [classRecord]);

  if (isLoading) {
    return (
      <section className="list-card section-gap">
        <div className="list-header">
          <h3>Loading Class</h3>
          <span className="tag teal">Supabase</span>
        </div>
      </section>
    );
  }

  if (!classRecord) {
    return (
      <section className="list-card section-gap">
        <div className="list-header">
          <h3>Class Not Found</h3>
          <span className="tag crimson">Missing</span>
        </div>
        <p className="subcopy">{message}</p>
        <Link className="primary-inline-button section-gap" href="/dm/classes">
          Back to Classes
        </Link>
      </section>
    );
  }

  function updateFeatureList(featureType: "skills" | "abilities", index: number, nextFeature: ClassFeature) {
    if (!classRecord) return;
    setClassRecord({
      ...classRecord,
      [featureType]: classRecord[featureType].map((feature, featureIndex) => (featureIndex === index ? nextFeature : feature)),
    });
  }

  function updateSubClass(index: number, nextSubClass: SubClassRecord) {
    if (!classRecord) return;
    setClassRecord({
      ...classRecord,
      subclasses: classRecord.subclasses.map((subclass, subclassIndex) => (subclassIndex === index ? nextSubClass : subclass)),
    });
  }

  return (
    <div className="class-detail-page">
      {message ? <p className="form-message">{message}</p> : null}

      <section className="detail-panel class-editor-panel">
        <div className="list-header">
          <Link className="secondary-button compact-action" href="/dm/classes">
            Back to Classes
          </Link>
          <span className="tag teal">Autosaves</span>
        </div>

        <div className="class-detail-heading">
          <label className="field">
            <span>Class Name</span>
            <input value={classRecord.name} onChange={(event) => setClassRecord({ ...classRecord, name: event.target.value })} />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea value={classRecord.description} onChange={(event) => setClassRecord({ ...classRecord, description: event.target.value })} />
          </label>
        </div>

        <section className="class-builder-section">
          <div className="list-header">
            <h3>Attribute Bonuses</h3>
            <span className="tag gold">Optional</span>
          </div>
          <div className="class-bonus-grid">
            {attributeBonusKeys.map((attribute) => (
              <label key={attribute}>
                <span>{attribute.toUpperCase()}</span>
                <input
                  inputMode="numeric"
                  value={classRecord.attribute_bonuses[attribute]}
                  onChange={(event) =>
                    setClassRecord({
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

        <FeatureEditor title="Class Skills" features={classRecord.skills} onChange={(index, feature) => updateFeatureList("skills", index, feature)} />
        <FeatureEditor
          title="Class Abilities"
          features={classRecord.abilities}
          onChange={(index, feature) => updateFeatureList("abilities", index, feature)}
        />

        <section className="class-builder-section">
          <div className="list-header">
            <h3>Subclasses</h3>
            <button
              className="secondary-button compact-action"
              onClick={() => setClassRecord({ ...classRecord, subclasses: [...classRecord.subclasses, createBlankSubClass()] })}
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
    </div>
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
      <div className="class-detail-heading">
        <label className="field">
          <span>Subclass Name</span>
          <input value={subclass.name} onChange={(event) => onChange({ ...subclass, name: event.target.value })} />
        </label>
        <label className="field">
          <span>Subclass Description</span>
          <textarea value={subclass.description} onChange={(event) => onChange({ ...subclass, description: event.target.value })} />
        </label>
      </div>
      <FeatureEditor title="Subclass Skills" features={subclass.skills} onChange={(index, feature) => updateFeatureList("skills", index, feature)} />
      <FeatureEditor title="Subclass Abilities" features={subclass.abilities} onChange={(index, feature) => updateFeatureList("abilities", index, feature)} />
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
          <strong>Slot</strong>
          <strong>Name</strong>
          <strong>Description</strong>
          <strong>Required Level</strong>
          <strong>MP</strong>
          <strong>SP</strong>
        </div>
        {features.map((feature, index) => (
          <div className="class-feature-row" key={index}>
            <span>{index + 1}</span>
            <input value={feature.name} onChange={(event) => onChange(index, { ...feature, name: event.target.value })} />
            <input value={feature.description} onChange={(event) => onChange(index, { ...feature, description: event.target.value })} />
            <input inputMode="numeric" value={feature.level} onChange={(event) => onChange(index, { ...feature, level: formatNumberText(event.target.value) })} />
            <input inputMode="numeric" value={feature.mpCost} onChange={(event) => onChange(index, { ...feature, mpCost: formatNumberText(event.target.value) })} />
            <input inputMode="numeric" value={feature.spCost} onChange={(event) => onChange(index, { ...feature, spCost: formatNumberText(event.target.value) })} />
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

function formatNumberText(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return `${Number(digits)}`;
}
