export type AttributeBonusKey = "str" | "spd" | "int" | "cha" | "con" | "dex" | "wis" | "fth";

export type ClassFeature = {
  name: string;
  description: string;
  level: string;
};

export type SubClassRecord = {
  id: string;
  name: string;
  description: string;
  skills: ClassFeature[];
  abilities: ClassFeature[];
};

export type GameClassRecord = {
  id: string;
  name: string;
  description: string;
  attribute_bonuses: Record<AttributeBonusKey, string>;
  skills: ClassFeature[];
  abilities: ClassFeature[];
  subclasses: SubClassRecord[];
};

export const attributeBonusKeys: AttributeBonusKey[] = ["str", "spd", "int", "cha", "con", "dex", "wis", "fth"];

export function createBlankFeature(): ClassFeature {
  return {
    name: "",
    description: "",
    level: "1",
  };
}

export function createFeatureSlots(length = 10) {
  return Array.from({ length }, () => createBlankFeature());
}

export function createBlankSubClass(): SubClassRecord {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    skills: createFeatureSlots(),
    abilities: createFeatureSlots(),
  };
}

export function createBlankClass(): Omit<GameClassRecord, "id"> {
  return {
    name: "New Class",
    description: "",
    attribute_bonuses: Object.fromEntries(attributeBonusKeys.map((key) => [key, ""])) as Record<AttributeBonusKey, string>,
    skills: createFeatureSlots(),
    abilities: createFeatureSlots(),
    subclasses: [],
  };
}

export function normalizeClassRecord(classRecord: Partial<GameClassRecord> & { id: string; name?: string }): GameClassRecord {
  const blankClass = createBlankClass();

  return {
    id: classRecord.id,
    name: classRecord.name || "Unnamed Class",
    description: classRecord.description || "",
    attribute_bonuses: {
      ...blankClass.attribute_bonuses,
      ...classRecord.attribute_bonuses,
    },
    skills: normalizeFeatures(classRecord.skills, blankClass.skills),
    abilities: normalizeFeatures(classRecord.abilities, blankClass.abilities),
    subclasses: normalizeSubClasses(classRecord.subclasses),
  };
}

export function normalizeFeatures(features: ClassFeature[] | undefined, defaults = createFeatureSlots()) {
  return defaults.map((defaultFeature, index) => ({
    ...defaultFeature,
    ...features?.[index],
  }));
}

function normalizeSubClasses(subclasses: SubClassRecord[] | undefined) {
  return (subclasses || []).map((subclass) => ({
    id: subclass.id || crypto.randomUUID(),
    name: subclass.name || "Unnamed Subclass",
    description: subclass.description || "",
    skills: normalizeFeatures(subclass.skills),
    abilities: normalizeFeatures(subclass.abilities),
  }));
}
