import { Icon } from "@/components/icons";

export function StagePage({ isDm }: { isDm: boolean }) {
  return (
    <div className="stage-layout">
      <section className="stage-map">
        <div className="map-control-strip">
          <button className="tool-button" title="Zoom in">
            <Icon name="zoomIn" />
          </button>
          <button className="tool-button" title="Measure">
            <Icon name="ruler" />
          </button>
          <button className="tool-button" title="Roll dice">
            <Icon name="dice" />
          </button>
          <button className="tool-button" title="Upload resource">
            <Icon name="upload" />
          </button>
        </div>
      </section>
      <aside className="stage-side">
        <section className="stage-resource">
          <div className="list-header">
            <h3>{isDm ? "Chronicler Controls" : "Table"}</h3>
            <span className="tag teal">Stage shell</span>
          </div>
          <p className="subcopy">
            {isDm
              ? "Map queue, reveal tools, event popups, handouts, and encounter controls will live here."
              : "Trailblazers see the active map, video tiles, shared notes, and Chronicler resources."}
          </p>
        </section>
        <section className="stage-resource">
          <h3>Video</h3>
          <div className="video-grid">
            {["Chronicler", "Cory", "Mara", "Jules"].map((name) => (
              <div className="video-tile" key={name}>
                <strong>{name}</strong>
                <span className="muted">Camera slot</span>
              </div>
            ))}
          </div>
        </section>
        <section className="stage-resource">
          <h3>Resources</h3>
          <ul className="compact-list">
            <li>
              <strong>Meridian Gate</strong>
              <span>Active map</span>
            </li>
            <li>
              <strong>Oracle Handout</strong>
              <span>Ready to reveal</span>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
