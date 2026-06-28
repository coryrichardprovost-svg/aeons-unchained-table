export type Role = "trailblazer" | "chronicler";

export type CharacterProfile = {
  id: string;
  name: string;
  playerName: string;
  className: string;
  level: number;
  campaignName: string;
  ancestry: string;
  background: string;
  resolveCurrent: number;
  resolveMax: number;
  wounds: number;
  attributes: {
    str: number;
    spd: number;
    int: number;
    cha: number;
    con: number;
    dex: number;
    wis: number;
    fth: number;
  };
  notes: string;
};

export const starterCharacters: CharacterProfile[] = [
  {
    id: "gideon-vale",
    name: "Gideon Vale",
    playerName: "Cory",
    className: "Oathbroken Warden",
    level: 5,
    campaignName: "Master of Strings",
    ancestry: "Human",
    background: "Exiled bellkeeper",
    resolveCurrent: 14,
    resolveMax: 18,
    wounds: 1,
    attributes: {
      str: 16,
      spd: 12,
      int: 14,
      cha: 13,
      con: 15,
      dex: 12,
      wis: 14,
      fth: 15,
    },
    notes: "Active Trailblazer License for Nate's Master of Strings campaign.",
  },
  {
    id: "maera-quill",
    name: "Maera Quill",
    playerName: "Cory",
    className: "Star-Scribe",
    level: 1,
    campaignName: "Unassigned",
    ancestry: "Unknown",
    background: "Archive runaway",
    resolveCurrent: 10,
    resolveMax: 10,
    wounds: 0,
    attributes: {
      str: 8,
      spd: 14,
      int: 16,
      cha: 11,
      con: 12,
      dex: 14,
      wis: 16,
      fth: 12,
    },
    notes: "A spare Trailblazer License ready for a future campaign.",
  },
];
