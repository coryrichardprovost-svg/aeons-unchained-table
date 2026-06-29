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
  sheet_data?: Partial<CharacterSheetData> | null;
};

type StatusTrack = {
  current: string;
  max: string;
  grade: string;
  result: string;
};

type SheetRow = {
  item: string;
  note: string;
};

type GearSlot = {
  itemName: string;
  stats: Record<string, string>;
};

type SkillRow = {
  grade: string;
  item: string;
};

type CharacterSheetData = {
  status: Record<"health" | "stamina" | "mind" | "divinity", StatusTrack>;
  fatigue: number;
  carryingCapacity: {
    current: string;
    max: string;
  };
  movement: Record<"Sprint" | "Run" | "Walk" | "Sneak", string>;
  tension: Record<"PER" | "INS" | "INI" | "AP" | "MOR", string>;
  defenses: Record<"AGI" | "PRO" | "DEF" | "RES", string>;
  wallet: Record<"PP" | "GP" | "EP" | "SP" | "CP", string>;
  skills: Record<"Knowledge" | "Proficiency" | "Skill" | "Ability", SkillRow[]>;
  gear: SheetRow[];
  arsenal: Record<string, GearSlot>;
  armory: Record<string, GearSlot>;
  accessories: Record<string, GearSlot>;
};

export function PlayerCharacterDashboard() {
  const [character, setCharacter] = useState<CharacterProfile | null>(null);
  const [sheetData, setSheetData] = useState<CharacterSheetData>(createDefaultSheetData());
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

    const dbCharacter = data as DbCharacter;
    setCharacter(mapDbCharacter(dbCharacter));
    setSheetData(normalizeSheetData(dbCharacter.sheet_data));
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

      const { error } = await supabase.from("characters").update(getCharacterUpdate(character, sheetData)).eq("id", character.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Changes saved.");
    }, 700);

    return () => window.clearTimeout(saveTimer);
  }, [character, sheetData]);

  function updateSheetData(updater: (current: CharacterSheetData) => CharacterSheetData) {
    setSheetData((current) => updater(current));
  }

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
                <TrackBox
                  tone="health"
                  title="Health"
                  track={sheetData.status.health}
                  value={character.resolveMax}
                  onChange={(resolveMax) => setCharacter({ ...character, resolveMax })}
                  onTrackChange={(track) => updateSheetData((current) => ({ ...current, status: { ...current.status, health: track } }))}
                />
                <TrackBox
                  title="Stamina"
                  track={sheetData.status.stamina}
                  value={character.resolveCurrent}
                  onChange={(resolveCurrent) => setCharacter({ ...character, resolveCurrent })}
                  onTrackChange={(track) => updateSheetData((current) => ({ ...current, status: { ...current.status, stamina: track } }))}
                />
                <TrackBox
                  title="Mind"
                  track={sheetData.status.mind}
                  onTrackChange={(track) => updateSheetData((current) => ({ ...current, status: { ...current.status, mind: track } }))}
                />
                <TrackBox
                  title="Divinity"
                  track={sheetData.status.divinity}
                  onTrackChange={(track) => updateSheetData((current) => ({ ...current, status: { ...current.status, divinity: track } }))}
                />
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
                  {(["Knowledge", "Proficiency", "Skill", "Ability"] as const).map((title) => (
                    <SkillColumn
                      key={title}
                      title={title}
                      rows={sheetData.skills[title]}
                      onChange={(rows) => updateSheetData((current) => ({ ...current, skills: { ...current.skills, [title]: rows } }))}
                    />
                  ))}
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
                          <input
                            aria-label={`${label} movement`}
                            inputMode="numeric"
                            value={sheetData.movement[label as keyof CharacterSheetData["movement"]] || value}
                            onChange={(event) => {
                              const nextValue = formatNumberText(event.target.value);
                              updateSheetData((current) => ({ ...current, movement: { ...current.movement, [label]: nextValue } }));
                            }}
                          />
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
                        <input
                          aria-label={`${label} tension`}
                          inputMode="numeric"
                          value={sheetData.tension[label as keyof CharacterSheetData["tension"]]}
                          onChange={(event) => {
                            const nextValue = formatNumberText(event.target.value);
                            updateSheetData((current) => ({ ...current, tension: { ...current.tension, [label]: nextValue } }));
                          }}
                        />
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
                          <input
                            aria-label={`${label} defense`}
                            inputMode="numeric"
                            value={sheetData.defenses[label as keyof CharacterSheetData["defenses"]]}
                            onChange={(event) => {
                              const nextValue = formatNumberText(event.target.value);
                              updateSheetData((current) => ({ ...current, defenses: { ...current.defenses, [label]: nextValue } }));
                            }}
                          />
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
                          <input
                            aria-label={`${coin} wallet`}
                            inputMode="numeric"
                            value={sheetData.wallet[coin as keyof CharacterSheetData["wallet"]]}
                            onChange={(event) => {
                              const nextValue = formatNumberText(event.target.value);
                              updateSheetData((current) => ({ ...current, wallet: { ...current.wallet, [coin]: nextValue } }));
                            }}
                          />
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
              <MarkCounter title="Fatigue" value={sheetData.fatigue} onChange={(fatigue) => updateSheetData((current) => ({ ...current, fatigue }))} />
            </div>
            <GearTable
              className="license-area-arsenal"
              title="Arsenal"
              rows={["Main 1", "Off 1", "Main 2", "Off 2"]}
              columns={["RNG", "ATK", "PEN"]}
              values={sheetData.arsenal}
              onChange={(arsenal) => updateSheetData((current) => ({ ...current, arsenal }))}
            />
            <GearList
              className="license-area-gear"
              title="Gear"
              rows={sheetData.gear}
              onChange={(gear) => updateSheetData((current) => ({ ...current, gear }))}
            />
          </div>

          <div className="license-equipment-stack">
            <LicensePanel className="license-area-capacity" title="Carrying Capacity">
              <div className="capacity-box">
                <input
                  value={sheetData.carryingCapacity.current}
                  inputMode="numeric"
                  onChange={(event) => {
                    const nextValue = formatNumberText(event.target.value);
                    updateSheetData((current) => ({ ...current, carryingCapacity: { ...current.carryingCapacity, current: nextValue } }));
                  }}
                />
                <span>KG /</span>
                <input
                  value={sheetData.carryingCapacity.max}
                  inputMode="numeric"
                  onChange={(event) => {
                    const nextValue = formatNumberText(event.target.value);
                    updateSheetData((current) => ({ ...current, carryingCapacity: { ...current.carryingCapacity, max: nextValue } }));
                  }}
                />
                <span>KG</span>
              </div>
            </LicensePanel>
            <GearTable
              className="license-area-armory"
              title="Armory"
              rows={["Head", "Body", "Hands", "Feet"]}
              columns={["PRO", "DEF", "RES"]}
              values={sheetData.armory}
              onChange={(armory) => updateSheetData((current) => ({ ...current, armory }))}
            />
            <GearTable
              className="license-area-accessories"
              title="Accessories"
              rows={["Ears", "Neck", "Wrists", "Rings"]}
              columns={["PRO", "DEF", "RES"]}
              values={sheetData.accessories}
              onChange={(accessories) => updateSheetData((current) => ({ ...current, accessories }))}
            />
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

function TrackBox({
  title,
  value,
  tone,
  track,
  onChange,
  onTrackChange,
}: {
  title: string;
  value?: number;
  tone?: string;
  track: StatusTrack;
  onChange?: (value: number) => void;
  onTrackChange: (track: StatusTrack) => void;
}) {
  const currentValue = onChange && value !== undefined ? formatNumber(value) : track.current;

  return (
    <div className={`license-track-box ${tone || ""}`}>
      <strong>{title}</strong>
      <div className="status-track-main">
        <input
          aria-label={`${title} current`}
          inputMode="numeric"
          value={currentValue}
          onChange={(event) => {
            const nextValue = formatNumberText(event.target.value);
            if (onChange) onChange(parseNumber(nextValue));
            else onTrackChange({ ...track, current: nextValue });
          }}
        />
        <span>-</span>
        <input
          aria-label={`${title} max`}
          inputMode="numeric"
          value={track.max}
          onChange={(event) => onTrackChange({ ...track, max: formatNumberText(event.target.value) })}
        />
      </div>
      <div className="status-track-footer">
        <select aria-label={`${title} grade`} value={track.grade} onChange={(event) => onTrackChange({ ...track, grade: event.target.value })}>
          {["A", "B", "C", "D", "E", "F"].map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
        <span>=</span>
        <input
          aria-label={`${title} result`}
          inputMode="numeric"
          value={track.result}
          onChange={(event) => onTrackChange({ ...track, result: formatNumberText(event.target.value) })}
        />
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

function SkillColumn({ title, rows, onChange }: { title: string; rows: SkillRow[]; onChange: (rows: SkillRow[]) => void }) {
  return (
    <div className="skill-column">
      <strong>{title}</strong>
      {rows.map((row, index) => (
        <label key={`${title}-${index}`}>
          {row.item ? (
            <select
              aria-label={`${title} ${row.item} grade`}
              value={row.grade}
              onChange={(event) => onChange(replaceArrayItem(rows, index, { ...row, grade: event.target.value }))}
            >
              {["A", "B", "C", "D", "E", "F"].map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          ) : (
            <span aria-hidden="true" className="skill-empty-grade" />
          )}
          <input
            aria-label={`${title} ${index + 1}`}
            value={row.item}
            onChange={(event) => onChange(replaceArrayItem(rows, index, { ...row, item: event.target.value }))}
          />
        </label>
      ))}
    </div>
  );
}

function GearTable({
  title,
  rows,
  columns,
  values,
  onChange,
  className = "",
}: {
  title: string;
  rows: string[];
  columns: string[];
  values: Record<string, GearSlot>;
  onChange: (values: Record<string, GearSlot>) => void;
  className?: string;
}) {
  const isArsenal = title === "Arsenal";

  return (
    <section className={`gear-table ${className}`}>
      <h3>{title}</h3>
      {rows.map((rowName) => {
        const row = values[rowName] || createGearSlot(columns);
        return (
        <div className="gear-row" key={rowName}>
          <strong>{rowName}</strong>
          <div className="gear-entry">
            <input
              className="gear-item-name"
              aria-label={`${title} ${rowName} item name`}
              value={row.itemName}
              onChange={(event) => onChange({ ...values, [rowName]: { ...row, itemName: event.target.value } })}
            />
            <div className="gear-stat-grid">
              {columns.map((column) => (
                <label className={isArsenal && column === "RNG" ? "range-field" : ""} key={column}>
                  <span>{column}</span>
                  <input
                    aria-label={`${title} ${rowName} ${column}`}
                    inputMode={isArsenal && column === "RNG" ? "numeric" : undefined}
                    value={row.stats[column] || ""}
                    onChange={(event) => {
                      const nextValue = isArsenal && column === "RNG" ? formatNumberText(event.target.value) : event.target.value;
                      onChange({ ...values, [rowName]: { ...row, stats: { ...row.stats, [column]: nextValue } } });
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )})}
    </section>
  );
}

function GearList({ title, rows, onChange, className = "" }: { title: string; rows: SheetRow[]; onChange: (rows: SheetRow[]) => void; className?: string }) {
  return (
    <section className={`gear-list ${className}`}>
      <h3>{title}</h3>
      {rows.map((row, index) => (
        <div className="gear-list-row" key={index}>
          <input
            aria-label={`${title} ${index + 1}`}
            value={row.item}
            onChange={(event) => onChange(replaceArrayItem(rows, index, { ...row, item: event.target.value }))}
          />
          <input
            aria-label={`${title} ${index + 1} note`}
            value={row.note}
            onChange={(event) => onChange(replaceArrayItem(rows, index, { ...row, note: event.target.value }))}
          />
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

function getCharacterUpdate(character: CharacterProfile, sheetData: CharacterSheetData) {
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
    sheet_data: sheetData,
  };
}

function createDefaultStatusTrack(): StatusTrack {
  return {
    current: "",
    max: "",
    grade: "F",
    result: "",
  };
}

function createSkillRows(items: string[]) {
  return Array.from({ length: 9 }, (_, index) => ({
    grade: "F",
    item: items[index] || "",
  }));
}

function createGearSlot(columns: string[]): GearSlot {
  return {
    itemName: "",
    stats: Object.fromEntries(columns.map((column) => [column, ""])),
  };
}

function createGearSlots(rows: string[], columns: string[]) {
  return Object.fromEntries(rows.map((row) => [row, createGearSlot(columns)]));
}

function createDefaultSheetData(): CharacterSheetData {
  return {
    status: {
      health: createDefaultStatusTrack(),
      stamina: createDefaultStatusTrack(),
      mind: createDefaultStatusTrack(),
      divinity: createDefaultStatusTrack(),
    },
    fatigue: 0,
    carryingCapacity: {
      current: "",
      max: "",
    },
    movement: {
      Sprint: "70",
      Run: "50",
      Walk: "14",
      Sneak: "14",
    },
    tension: {
      PER: "",
      INS: "",
      INI: "",
      AP: "",
      MOR: "",
    },
    defenses: {
      AGI: "",
      PRO: "",
      DEF: "",
      RES: "",
    },
    wallet: {
      PP: "",
      GP: "",
      EP: "",
      SP: "",
      CP: "",
    },
    skills: {
      Knowledge: createSkillRows(["History", "Lore", "Politics", "Religion", "Occult", "Arcana", "Nature", "Academia"]),
      Proficiency: createSkillRows(["Alchemy", "Engineer", "Enchant", "Medicine", "Sorcery", "Primurgy", "Thaumaturgy", "Theurgy", "Goetia"]),
      Skill: createSkillRows(["Athletics", "Acrobatics", "Stealth", "Survival", "Riding", "Thievery", "Incanting"]),
      Ability: createSkillRows(["Investigation", "First Aid", "Focus", "Perform"]),
    },
    gear: Array.from({ length: 12 }, () => ({ item: "", note: "" })),
    arsenal: createGearSlots(["Main 1", "Off 1", "Main 2", "Off 2"], ["RNG", "ATK", "PEN"]),
    armory: createGearSlots(["Head", "Body", "Hands", "Feet"], ["PRO", "DEF", "RES"]),
    accessories: createGearSlots(["Ears", "Neck", "Wrists", "Rings"], ["PRO", "DEF", "RES"]),
  };
}

function normalizeSheetData(sheetData?: Partial<CharacterSheetData> | null): CharacterSheetData {
  const defaults = createDefaultSheetData();
  if (!sheetData) return defaults;

  return {
    ...defaults,
    ...sheetData,
    status: {
      ...defaults.status,
      ...sheetData.status,
    },
    carryingCapacity: {
      ...defaults.carryingCapacity,
      ...sheetData.carryingCapacity,
    },
    movement: {
      ...defaults.movement,
      ...sheetData.movement,
    },
    tension: {
      ...defaults.tension,
      ...sheetData.tension,
    },
    defenses: {
      ...defaults.defenses,
      ...sheetData.defenses,
    },
    wallet: {
      ...defaults.wallet,
      ...sheetData.wallet,
    },
    skills: {
      Knowledge: normalizeRows(sheetData.skills?.Knowledge, defaults.skills.Knowledge),
      Proficiency: normalizeRows(sheetData.skills?.Proficiency, defaults.skills.Proficiency),
      Skill: normalizeRows(sheetData.skills?.Skill, defaults.skills.Skill),
      Ability: normalizeRows(sheetData.skills?.Ability, defaults.skills.Ability),
    },
    gear: normalizeRows(sheetData.gear, defaults.gear),
    arsenal: normalizeGearSlots(sheetData.arsenal, defaults.arsenal),
    armory: normalizeGearSlots(sheetData.armory, defaults.armory),
    accessories: normalizeGearSlots(sheetData.accessories, defaults.accessories),
  };
}

function normalizeRows<T extends Record<string, string>>(rows: T[] | undefined, defaults: T[]) {
  return defaults.map((defaultRow, index) => ({
    ...defaultRow,
    ...rows?.[index],
  }));
}

function normalizeGearSlots(slots: Record<string, GearSlot> | undefined, defaults: Record<string, GearSlot>) {
  return Object.fromEntries(
    Object.entries(defaults).map(([row, defaultSlot]) => [
      row,
      {
        ...defaultSlot,
        ...slots?.[row],
        stats: {
          ...defaultSlot.stats,
          ...slots?.[row]?.stats,
        },
      },
    ]),
  );
}

function replaceArrayItem<T>(items: T[], index: number, nextItem: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
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

function formatNumberText(value: string) {
  const parsed = parseNumber(value);
  return value.trim() ? formatNumber(parsed) : "";
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
