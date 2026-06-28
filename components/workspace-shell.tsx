"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Icon, IconName } from "@/components/icons";
import { SignOutButton } from "@/components/sign-out-button";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

export function WorkspaceShell({
  role,
  title,
  eyebrow,
  copy,
  actions,
  children,
}: {
  role: "trailblazer" | "chronicler";
  title: string;
  eyebrow: string;
  copy: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const navItems = role === "chronicler" ? chroniclerNavItems : trailblazerNavItems;
  const [showChangeCharacterPrompt, setShowChangeCharacterPrompt] = useState(false);

  function confirmCharacterChange() {
    setShowChangeCharacterPrompt(false);
    router.push("/player/characters");
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="brand-mark">
              <Icon name="aeon" />
            </div>
            <div>
              <div className="sidebar-title">Aeons Unchained Table</div>
              <div className="sidebar-subtitle">{role === "chronicler" ? "Chronicler" : "Trailblazer"} Workspace</div>
            </div>
          </div>

          <nav className="nav-list">
            {navItems.map((item) =>
              item.href === "/player/characters" ? (
                <button
                  key={item.href}
                  className={`nav-item ${isActive(pathname, item.href) ? "active" : ""}`}
                  onClick={() => setShowChangeCharacterPrompt(true)}
                >
                  <Icon name={item.icon} /> {item.label}
                </button>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive(pathname, item.href) ? "active" : ""}`}
                >
                  <Icon name={item.icon} /> {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="sidebar-footer">
            <div className="account-pill">
              <strong>{role === "chronicler" ? "Chronicler Account" : "Trailblazer Account"}</strong>
              <span>Master of Strings prototype</span>
            </div>
            <SignOutButton />
          </div>
        </aside>

        <section className="workspace-main">
          <div className="topbar">
            <div className="page-title">
              <p className="eyebrow">{eyebrow}</p>
              <h2>{title}</h2>
              <p className="subcopy">{copy}</p>
            </div>
            {actions ? <div className="toolbar">{actions}</div> : null}
          </div>

          {children}
        </section>
      </section>

      {showChangeCharacterPrompt ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="change-character-title">
          <section className="confirm-dialog">
            <p className="eyebrow">Trailblazer License</p>
            <h3 id="change-character-title">Change character?</h3>
            <p className="subcopy">You will return to character selection before entering another Trailblazer dashboard.</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setShowChangeCharacterPrompt(false)}>
                Cancel
              </button>
              <button className="primary-inline-button" onClick={confirmCharacterChange}>
                Change Character
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/dm") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const trailblazerNavItems: NavItem[] = [
  { href: "/player/characters", label: "Licenses", icon: "user" },
  { href: "/player/sheet", label: "License", icon: "scroll" },
  { href: "/player/inventory", label: "Inventory", icon: "bag" },
  { href: "/player/class", label: "Class", icon: "spark" },
  { href: "/player/knowledge", label: "Knowledge", icon: "map" },
  { href: "/player/skills", label: "Skills", icon: "dice" },
  { href: "/player/notes", label: "Notes", icon: "note" },
  { href: "/player/crafting", label: "Crafting", icon: "forge" },
  { href: "/player/stage", label: "Stage", icon: "camera" },
];

const chroniclerNavItems: NavItem[] = [
  { href: "/dm", label: "Chronicler Desk", icon: "scroll" },
  { href: "/dm/campaigns", label: "Campaigns", icon: "map" },
  { href: "/dm/world", label: "World Atlas", icon: "map" },
  { href: "/dm/npcs", label: "NPCs", icon: "user" },
  { href: "/dm/quests", label: "Quests", icon: "note" },
  { href: "/dm/market", label: "Markets", icon: "bag" },
  { href: "/dm/rules", label: "Rules Library", icon: "spark" },
  { href: "/dm/sessions", label: "Sessions", icon: "dice" },
  { href: "/dm/stage", label: "Stage", icon: "camera" },
];
