"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { CharacterProfile } from "@/data/domain";
import { createClient } from "@/lib/supabase/browser";

type DbCharacter = {
  id: string;
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

export function PlayerCharacterDashboard() {
  const [character, setCharacter] = useState<CharacterProfile | null>(null);
  const [fatigue, setFatigue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const hasLoadedAutoSave = useRef(false);

  const loadCharacter = useCallback(async () => {
    const characterId = window.localStorage.getItem("aeons:selectedCharacterId");

    if (!characterId) {
      setIsLoading(false);
      setMessage("Choose a character before opening the dashboard.");
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.from("characters").select("*").eq("id", characterId).single();

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    setCharacter(mapDbCharacter(data as DbCharacter));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // The selected character id is stored in the browser after the picker flow.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCharacter();
  }, [loadCharacter]);

  useEffect(() => {
    if (!character) return;

    if (!hasLoadedAutoSave.current) {
      hasLoadedAutoSave.current = true;
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      const supabase = createClient();
      setMessage("Saving changes...");

      const { error } = await supabase.from("characters").update(getCharacterUpdate(character)).eq("id", character.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Changes saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [character]);

  if (isLoading) {
    return (
      <section className="list-card">
        <div className="list-header">
          <h3>Loading License</h3>
          <span className="tag teal">Supabase</span>
        </div>
      </section>
    );
  }

  if (!character) {
    return (
      <section className="list-card">
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
    <div className="license-dashboard">
      {message ? <p className="form-message">{message}</p> : null}

      <section className="paper-license" aria-label="Trailblazer License">
        <header className="license-paper-header">
          <div className="license-id-lines">
            <label>
              Player:
              <input value={character.playerName} onChange={(event) => setCharacter({ ...character, playerName: event.target.value })} />
            </label>
            <label>
              Trailblazer:
              <input value={character.name} onChange={(event) => setCharacter({ ...character, name: event.target.value })} />
            </label>
          </div>
          <h2>Trailblazer&apos;s License</h2>
          <div className="license-edition">
            <span>The Caelan Chronicles:</span>
            <strong>AEONS UNCHAINED</strong>
          </div>
        </header>

        <div className="license-paper-grid">
          <div className="license-left-stack">
            <LicensePanel className="license-area-status" title="Status">
              <div className="license-status-grid">
                <TrackBox tone="health" title="Health" value={character.resolveMax} onChange={(resolveMax) => setCharacter({ ...character, resolveMax })} />
                <TrackBox title="Stamina" value={character.resolveCurrent} onChange={(resolveCurrent) => setCharacter({ ...character, resolveCurrent })} />
                <TrackBox title="Mind" />
                <TrackBox title="Divinity" />
              </div>
            </LicensePanel>

            <div className="license-left-lower-grid">
              <div className="license-main-stack">
                <LicensePanel className="license-area-attributes" title="Attributes">
                  <div className="license-track-grid four">
                    <AttributeBox code="STR" value={character.attributes.str} onChange={(str) => setCharacter({ ...character, attributes: { ...character.attributes, str } })} />
                    <AttributeBox code="SPD" value={character.attributes.spd} onChange={(spd) => setCharacter({ ...character, attributes: { ...character.attributes, spd } })} />
                    <AttributeBox code="INT" value={character.attributes.int} onChange={(int) => setCharacter({ ...character, attributes: { ...character.attributes, int } })} />
                    <AttributeBox code="CHA" value={character.attributes.cha} onChange={(cha) => setCharacter({ ...character, attributes: { ...character.attributes, cha } })} />
                    <AttributeBox code="CON" value={character.attributes.con} onChange={(con) => setCharacter({ ...character, attributes: { ...character.attributes, con } })} />
                    <AttributeBox code="DEX" value={character.attributes.dex} onChange={(dex) => setCharacter({ ...character, attributes: { ...character.attributes, dex } })} />
                    <AttributeBox code="WIS" value={character.attributes.wis} onChange={(wis) => setCharacter({ ...character, attributes: { ...character.attributes, wis } })} />
                    <AttributeBox code="FTH" value={character.attributes.fth} onChange={(fth) => setCharacter({ ...character, attributes: { ...character.attributes, fth } })} />
                  </div>
                </LicensePanel>

                <LicensePanel className="license-area-saves" title="Saves">
                  <div className="license-track-grid four">
                    <SaveBox title="Endurance" value={(character.attributes.str + character.attributes.con) / 4} />
                    <SaveBox title="Reflex" value={(character.attributes.spd + character.attributes.dex) / 4} />
                    <SaveBox title="Sanity" value={(character.attributes.int + character.attributes.wis) / 4} />
                    <SaveBox title="Willpower" value={(character.attributes.cha + character.attributes.fth) / 4} />
                  </div>
                </LicensePanel>

                <div className="license-area-skills license-skill-table">
                  <SkillColumn title="Knowledge" items={["History", "Lore", "Politics", "Religion", "Occult", "Arcana", "Nature", "Academia"]} />
                  <SkillColumn title="Proficiency" items={["Alchemy", "Engineer", "Enchant", "Medicine", "Sorcery", "Primurgy", "Thaumaturgy", "Theurgy", "Goetia"]} />
                  <SkillColumn title="Skill" items={["Athletics", "Acrobatics", "Stealth", "Survival", "Riding", "Thievery", "Incanting"]} />
                  <SkillColumn title="Ability" items={["Investigation", "First Aid", "Focus", "Perform"]} />
                </div>
              </div>

              <div className="license-middle-stack">
                <LicensePanel className="license-area-movement" title="Movement">
                  <div className="license-mini-table">
                    {[
                      ["70", "Sprint"],
                      ["50", "Run"],
                      ["14", "Walk"],
                      ["14", "Sneak"],
                    ].map(([value, label]) => (
                      <div className="movement-row" key={label}>
                        <label>
                          <input aria-label={`${label} movement`} defaultValue={value} inputMode="numeric" onChange={formatNumberInput} />
                          <span>m</span>
                        </label>
                        <strong>{label}</strong>
                      </div>
                    ))}
                  </div>
                </LicensePanel>

                <LicensePanel className="license-area-tension" title="Tension">
                  <div className="license-mini-table">
                    {["PER", "INS", "INI", "AP", "MOR"].map((label) => (
                      <div className="split-stat-row" key={label}>
                        <input aria-label={`${label} tension`} inputMode="numeric" onChange={formatNumberInput} />
                        <strong>{label}</strong>
                      </div>
                    ))}
                  </div>
                </LicensePanel>

                <div className="license-area-lower-middle">
                  <LicensePanel title="Defenses">
                    <div className="license-mini-table">
                      {["AGI", "PRO", "DEF", "RES"].map((label) => (
                        <div className="split-stat-row" key={label}>
                          <input aria-label={`${label} defense`} inputMode="numeric" onChange={formatNumberInput} />
                          <strong>{label}</strong>
                        </div>
                      ))}
                    </div>
                  </LicensePanel>

                  <section className="wallet-panel">
                    <strong>Wallet</strong>
                    <div className="wallet-grid">
                      {["PP", "GP", "EP", "SP", "CP"].map((coin) => (
                        <div className="wallet-row" key={coin}>
                          <input aria-label={`${coin} wallet`} inputMode="numeric" onChange={formatNumberInput} />
                          <span>{coin}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>

          <div className="license-equipment-stack">
            <div className="license-area-marks license-small-row">
              <MarkCounter title="Wounds" value={character.wounds} onChange={(wounds) => setCharacter({ ...character, wounds })} />
              <MarkCounter title="Fatigue" value={fatigue} onChange={setFatigue} />
            </div>
            <GearTable className="license-area-arsenal" title="Arsenal" rows={["Main 1", "Off 1", "Main 2", "Off 2"]} columns={["RNG", "ATK", "PEN"]} />
            <GearList className="license-area-gear" title="Gear" />
          </div>

          <div className="license-equipment-stack">
            <LicensePanel className="license-area-capacity" title="Carrying Capacity">
              <div className="capacity-box">
                <input />
                <span>KG /</span>
                <input />
                <span>KG</span>
              </div>
            </LicensePanel>
            <GearTable className="license-area-armory" title="Armory" rows={["Head", "Body", "Hands", "Feet"]} columns={["PRO", "DEF", "RES"]} />
            <GearTable className="license-area-accessories" title="Accessories" rows={["Ears", "Neck", "Wrists", "Rings"]} columns={["PRO", "DEF", "RES"]} />
          </div>
        </div>

        <footer className="license-paper-footer">
          <label className="license-notes">
            Notes
            <textarea value={character.notes} onChange={(event) => setCharacter({ ...character, notes: event.target.value })} />
          </label>
          <div>
            <span>AUtv0.6</span>
            <span>CSvb0.1</span>
          </div>
        </footer>
      </section>

    </div>
  );
}

function LicensePanel({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`license-panel ${className}`}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function TrackBox({ title, value, tone, onChange }: { title: string; value?: number; tone?: string; onChange?: (value: number) => void }) {
  const currentInputProps =
    onChange && value !== undefined
      ? {
          value: formatNumber(value),
          onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(parseNumber(event.target.value)),
        }
      : {
          onChange: formatNumberInput,
        };

  return (
    <div className={`license-track-box ${tone || ""}`}>
      <strong>{title}</strong>
      <div className="status-track-main">
        <input
          aria-label={`${title} current`}
          inputMode="numeric"
          {...currentInputProps}
        />
        <span>-</span>
        <input aria-label={`${title} max`} inputMode="numeric" onChange={formatNumberInput} />
      </div>
      <div className="status-track-footer">
        <select aria-label={`${title} grade`} defaultValue="F">
          {["A", "B", "C", "D", "E", "F"].map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
        <span>=</span>
        <input aria-label={`${title} result`} inputMode="numeric" onChange={formatNumberInput} />
      </div>
    </div>
  );
}

function AttributeBox({ code, value, onChange }: { code: string; value: number; onChange: (value: number) => void }) {
  const safeValue = clampAttributeValue(value);
  const grade = getAttributeGrade(safeValue);
  const dice = getAttributeDice(safeValue);

  return (
    <div className="license-attribute-box">
      <strong>{code}</strong>
      <div className="attribute-value-grid">
        <div className="attribute-derived">
          <span>{grade}</span>
          <span>{dice}</span>
        </div>
        <input
          aria-label={`${code} score`}
          inputMode="numeric"
          value={formatNumber(safeValue)}
          onChange={(event) => onChange(clampAttributeValue(parseNumber(event.target.value)))}
        />
      </div>
    </div>
  );
}

function SaveBox({ title, value }: { title: string; value: number }) {
  const safeValue = clampAttributeValue(value);
  const grade = getAttributeGrade(safeValue);
  const dice = getAttributeDice(safeValue);

  return (
    <div className="license-attribute-box">
      <strong>{title}</strong>
      <div className="attribute-value-grid">
        <div className="attribute-derived">
          <span>{grade}</span>
          <span>{dice}</span>
        </div>
        <input aria-label={`${title} save score`} inputMode="numeric" readOnly value={formatNumber(safeValue)} />
      </div>
    </div>
  );
}

function MarkCounter({ title, value, onChange }: { title: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="mark-counter">
      <strong>{title}</strong>
      <div className="mark-box-grid">
        {Array.from({ length: 3 }).map((_, index) => {
          const isMarked = index < value;
          return (
            <button
              aria-label={`${title} ${index + 1}`}
              className={isMarked ? "marked" : ""}
              key={index}
              onClick={() => onChange(isMarked && value === index + 1 ? index : index + 1)}
            >
              {isMarked ? "x" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SkillColumn({ title, items }: { title: string; items: string[] }) {
  const rows = Array.from({ length: 9 }, (_, index) => items[index] || "");

  return (
    <div className="skill-column">
      <strong>{title}</strong>
      {rows.map((item, index) => (
        <label key={`${title}-${index}`}>
          {item ? (
            <select aria-label={`${title} ${item} grade`} defaultValue="F">
              {["A", "B", "C", "D", "E", "F"].map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          ) : (
            <span aria-hidden="true" className="skill-empty-grade" />
          )}
          <input aria-label={`${title} ${index + 1}`} defaultValue={item} />
        </label>
      ))}
    </div>
  );
}

function GearTable({ title, rows, columns, className = "" }: { title: string; rows: string[]; columns: string[]; className?: string }) {
  const isArsenal = title === "Arsenal";

  return (
    <section className={`gear-table ${className}`}>
      <h3>{title}</h3>
      {rows.map((row) => (
        <div className="gear-row" key={row}>
          <strong>{row}</strong>
          <div className="gear-entry">
            <input className="gear-item-name" aria-label={`${title} ${row} item name`} />
            <div className="gear-stat-grid">
              {columns.map((column) => (
                <label className={isArsenal && column === "RNG" ? "range-field" : ""} key={column}>
                  <span>{column}</span>
                  <input
                    aria-label={`${title} ${row} ${column}`}
                    inputMode={isArsenal && column === "RNG" ? "numeric" : undefined}
                    onChange={isArsenal && column === "RNG" ? formatNumberInput : undefined}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

function GearList({ title, className = "" }: { title: string; className?: string }) {
  return (
    <section className={`gear-list ${className}`}>
      <h3>{title}</h3>
      {Array.from({ length: 12 }).map((_, index) => (
        <div className="gear-list-row" key={index}>
          <input aria-label={`${title} ${index + 1}`} />
          <input aria-label={`${title} ${index + 1} note`} />
        </div>
      ))}
    </section>
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

function getCharacterUpdate(character: CharacterProfile) {
  return {
    name: character.name.trim() || "Unnamed Character",
    class_name: character.className.trim() || "Unchosen Class",
    level: character.level,
    ancestry: character.ancestry,
    background: character.background,
    resolve_current: character.resolveCurrent,
    resolve_max: character.resolveMax,
    wounds: character.wounds,
    notes: character.notes,
    attributes: character.attributes,
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

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en-US").format(value);
}

function parseNumber(value: string) {
  const digits = value.replace(/[^\d-]/g, "");
  if (!digits || digits === "-") return 0;
  return Number(digits);
}

function formatNumberInput(event: ChangeEvent<HTMLInputElement>) {
  const parsed = parseNumber(event.target.value);
  event.target.value = event.target.value.trim() ? formatNumber(parsed) : "";
}

function clampAttributeValue(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(50, Math.max(0, value));
}

function getAttributeGrade(value: number) {
  if (value >= 50) return "A";
  if (value >= 40) return "B";
  if (value >= 30) return "C";
  if (value >= 20) return "D";
  if (value >= 10) return "E";
  return "F";
}

function getAttributeDice(value: number) {
  return `${Math.floor(clampAttributeValue(value) / 10)}d6`;
}
