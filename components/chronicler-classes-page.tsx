"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createBlankClass, GameClassRecord, normalizeClassRecord } from "@/data/class-framework";
import { createClient } from "@/lib/supabase/browser";

type DbGameClass = Partial<GameClassRecord> & {
  id: string;
  name: string;
  description: string;
};

export function ChroniclerClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<GameClassRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadClasses = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("game_classes").select("*").order("name", { ascending: true });

    if (error) {
      setMessage(error.message.includes("game_classes") ? "Run supabase/migrations/010_add_game_classes.sql in Supabase SQL Editor." : error.message);
      setIsLoading(false);
      return;
    }

    setClasses((data || []).map((classRecord) => normalizeClassRecord(classRecord as DbGameClass)));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Class records load after the browser Supabase session is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadClasses();
  }, [loadClasses]);

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

    router.push(`/dm/classes/${(data as DbGameClass).id}`);
  }

  return (
    <div className="classes-dashboard">
      {message ? <p className="form-message">{message}</p> : null}

      <section className="list-card">
        <div className="list-header">
          <h3>Classes Dashboard</h3>
          <button className="primary-inline-button compact-action" onClick={createClass}>
            New Class
          </button>
        </div>

        <div className="classes-dashboard-grid section-gap">
          {classes.map((classRecord) => (
            <Link className="class-dashboard-card" href={`/dm/classes/${classRecord.id}`} key={classRecord.id}>
              <div>
                <strong>{classRecord.name}</strong>
                <span>{classRecord.description || "No description yet."}</span>
              </div>
              <div className="class-dashboard-meta">
                <span className="tag teal">{countFilledFeatures(classRecord.skills)} skills</span>
                <span className="tag gold">{countFilledFeatures(classRecord.abilities)} abilities</span>
                <span className="tag">{classRecord.subclasses.length} subclasses</span>
              </div>
            </Link>
          ))}

          {!isLoading && classes.length === 0 ? (
            <div className="empty-state">
              <strong>No classes yet.</strong>
              <span>Create the first Aeons Unchained class.</span>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function countFilledFeatures(features: GameClassRecord["skills"]) {
  return features.filter((feature) => feature.name || feature.description).length;
}
