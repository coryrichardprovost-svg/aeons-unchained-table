export function DetailPage({
  mainTitle,
  items,
  sideTitle,
  sideItems,
}: {
  mainTitle: string;
  items: string[][];
  sideTitle: string;
  sideItems: string[];
}) {
  return (
    <div className="content-grid">
      <section className="list-card">
        <div className="list-header">
          <h3>{mainTitle}</h3>
          <span className="tag teal">Editable later</span>
        </div>
        <div className="ability-grid">
          {items.map(([title, copy]) => (
            <div className="list-card flat-card" key={title}>
              <strong>{title}</strong>
              <span className="muted">{copy}</span>
            </div>
          ))}
        </div>
      </section>
      <aside className="detail-panel">
        <h3>{sideTitle}</h3>
        <ul className="compact-list">
          {sideItems.map((item) => (
            <li key={item}>
              <strong>{item}</strong>
              <span>Shell entry</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

export function TablePage({ title, rows, tag }: { title: string; rows: string[][]; tag: string }) {
  return (
    <div className="full-grid">
      <section className="list-card">
        <div className="list-header">
          <h3>{title}</h3>
          <span className="tag teal">{tag}</span>
        </div>
        <div className="table-list">
          {rows.map((row) => (
            <div className="table-row" key={row.join("-")}>
              <strong>{row[0]}</strong>
              <span>{row[1]}</span>
              <span>{row[2]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
