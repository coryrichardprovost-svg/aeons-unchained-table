"use client";

import Link from "next/link";

const marketSections = [
  {
    href: "/dm/market/items",
    title: "Item Database",
    tag: "Active",
    copy: "Create the shared item records shops and markets will pull from.",
  },
  {
    href: "/dm/market",
    title: "Markets",
    tag: "Next",
    copy: "Markets will connect to cities, towns, districts, villages, and points of interest.",
  },
  {
    href: "/dm/market",
    title: "Shops",
    tag: "Next",
    copy: "Shops will live inside markets and choose item types or specific stock.",
  },
];

export function ChroniclerMarketDashboard() {
  return (
    <div className="market-dashboard">
      <section className="list-card">
        <div className="list-header">
          <div>
            <h3>Market Backend</h3>
            <p className="subcopy">Start with the item database, then markets and shops can use the same source of truth.</p>
          </div>
          <Link className="primary-inline-button compact-action" href="/dm/market/items">
            Open Items
          </Link>
        </div>
      </section>

      <section className="market-section-grid">
        {marketSections.map((section) => (
          <Link className="market-section-card" href={section.href} key={section.title}>
            <div>
              <strong>{section.title}</strong>
              <p>{section.copy}</p>
            </div>
            <span className={section.tag === "Active" ? "tag teal" : "tag gold"}>{section.tag}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
