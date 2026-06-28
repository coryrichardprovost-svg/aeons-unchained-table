import { TablePage } from "@/components/detail-page";
import { WorkspaceShell } from "@/components/workspace-shell";
import { campaigns } from "@/data/sample-data";

export default function DmDashboardPage() {
  return (
    <WorkspaceShell
      role="chronicler"
      eyebrow="Chronicler Desk"
      title="Master of Strings Control Room"
      copy="A routed control room for Nate to build the world, prepare sessions, update game data, and run the table."
    >
      <div className="content-grid">
        <div className="full-grid">
          <div className="card-grid">
            <StatCard label="Active Campaign" value="1" tag="Master of Strings" tone="gold" />
            <StatCard label="Trailblazers" value="4" tag="Discord group" tone="teal" />
            <StatCard label="Next Session" value="Fri" tag="8:00 PM" />
          </div>
          <TablePage title="Campaigns" rows={campaigns} tag="Chronicler controlled" />
        </div>
        <aside className="detail-panel">
          <h3>Prep Queue</h3>
          <ul className="compact-list">
            <li>
              <strong>Update the current region market</strong>
              <span>Prices should reach Trailblazer inventories</span>
            </li>
            <li>
              <strong>Create met NPC records</strong>
              <span>Export known NPCs to Trailblazer knowledge</span>
            </li>
            <li>
              <strong>Prepare the stage map</strong>
              <span>Grid landscape for the next live session</span>
            </li>
          </ul>
        </aside>
      </div>
    </WorkspaceShell>
  );
}

function StatCard({ label, value, tag, tone }: { label: string; value: string; tag: string; tone?: string }) {
  return (
    <div className="stat-card">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
      <span className={`tag ${tone || ""}`}>{tag}</span>
    </div>
  );
}
