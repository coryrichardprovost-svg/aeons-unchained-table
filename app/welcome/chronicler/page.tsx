import Link from "next/link";
import { Icon } from "@/components/icons";

export default function ChroniclerWelcomePage() {
  return (
    <main className="app-shell">
      <section className="setup-page">
        <div className="setup-panel welcome-panel">
          <div className="brand-mark">
            <Icon name="aeon" />
          </div>
          <p className="eyebrow">Welcome Chronicler</p>
          <h1>Open The World Desk</h1>
          <p className="subcopy">
            The Chronicler builds Aeons Unchained: world records, maps, NPCs, quests, items, pricing, rules, sessions,
            and the live stage for the Trailblazers.
          </p>
          <div className="setup-actions">
            <Link className="primary-inline-button" href="/dm">
              Open Chronicler Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
