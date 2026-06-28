import type { ReactNode } from "react";

export type IconName =
  | "aeon"
  | "bag"
  | "camera"
  | "crown"
  | "dice"
  | "forge"
  | "invite"
  | "logout"
  | "map"
  | "note"
  | "play"
  | "plus"
  | "ruler"
  | "scroll"
  | "spark"
  | "upload"
  | "user"
  | "zoomIn";

const paths: Record<IconName, ReactNode> = {
  aeon: (
    <>
      <path d="M12 3a9 9 0 1 0 9 9" />
      <path d="M12 3a9 9 0 1 1-9 9" />
      <path d="M7 12h10" />
      <path d="M12 7v10" />
    </>
  ),
  bag: (
    <>
      <path d="M6 8h12l1 13H5L6 8z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </>
  ),
  camera: (
    <>
      <path d="M15 10l4-3v10l-4-3v-4z" />
      <rect x="3" y="7" width="12" height="10" rx="2" />
    </>
  ),
  crown: (
    <>
      <path d="m3 8 4 9h10l4-9-5 3-4-7-4 7-5-3z" />
      <path d="M7 21h10" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 8h.01" />
      <path d="M16 8h.01" />
      <path d="M12 12h.01" />
      <path d="M8 16h.01" />
      <path d="M16 16h.01" />
    </>
  ),
  forge: (
    <>
      <path d="M4 17h16" />
      <path d="M6 17l2-8h8l2 8" />
      <path d="M9 9V5h6v4" />
      <path d="M8 21h8" />
    </>
  ),
  invite: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </>
  ),
  logout: (
    <>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 19V5" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
      <path d="M9 3v15" />
      <path d="M15 6v15" />
    </>
  ),
  note: (
    <>
      <path d="M5 4h14v16H5z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h3" />
    </>
  ),
  play: <path d="m8 5 11 7-11 7V5z" />,
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  ruler: (
    <>
      <path d="m4 17 13-13 3 3L7 20l-3-3z" />
      <path d="m13 8 3 3" />
      <path d="m10 11 2 2" />
    </>
  ),
  scroll: (
    <>
      <path d="M8 5h10a3 3 0 0 1 0 6H7a3 3 0 0 0 0 6h11" />
      <path d="M8 5a3 3 0 0 0 0 6" />
      <path d="M7 17a3 3 0 0 1 0-6" />
    </>
  ),
  spark: <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2z" />,
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </>
  ),
  user: (
    <>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  zoomIn: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </>
  ),
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
