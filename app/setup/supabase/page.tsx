import Link from "next/link";
import { Icon } from "@/components/icons";

export default function SupabaseSetupPage() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const ready = hasUrl && hasKey;

  return (
    <main className="app-shell">
      <section className="setup-page">
        <div className="setup-panel">
          <div className="brand-mark">
            <Icon name="aeon" />
          </div>
          <p className="eyebrow">Supabase connection</p>
          <h1>Connect Aeons Unchained Table</h1>
          <p className="subcopy">
            Add your Supabase Project URL and Publishable key to `.env.local`, then run the SQL schema in Supabase.
          </p>

          <div className="status-grid">
            <StatusRow label="Project URL" ready={hasUrl} />
            <StatusRow label="Publishable Key" ready={hasKey} />
            <StatusRow label="Local App Config" ready={ready} />
          </div>

          <div className="setup-actions">
            <Link className="secondary-button" href="/">
              Back to App
            </Link>
            <a className="primary-inline-button" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
              Open Supabase
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="status-row">
      <strong>{label}</strong>
      <span className={`tag ${ready ? "teal" : "crimson"}`}>{ready ? "Ready" : "Missing"}</span>
    </div>
  );
}
