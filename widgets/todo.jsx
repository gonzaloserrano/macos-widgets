const _todoCmd = `cat ~/TODO.txt 2>/dev/null || echo ""`;

const _todoRe = /^\s*-\s*\[([ xX])\]\s*(.*)$/;
const parseTodoLine = (line) => {
  const m = line.match(_todoRe);
  if (!m) return { checked: null, text: line.trim() };
  return { checked: m[1].toLowerCase() === "x", text: m[2] };
};

const _todoS = {
  list: { cursor: "pointer", fontSize: "11px", lineHeight: "1.35", color: "rgba(255,255,255,0.85)" },
  row: { display: "flex", alignItems: "flex-start", gap: "4px", marginBottom: "2px" },
  idx: { color: "rgba(255,255,255,0.4)", flexShrink: 0, fontVariantNumeric: "tabular-nums" },
  checkbox: { margin: "2px 0 0", flexShrink: 0, accentColor: "#6eb5ff", width: "11px", height: "11px", cursor: "pointer" },
  text: { wordBreak: "break-word", minWidth: 0 },
  done: { textDecoration: "line-through", color: "rgba(255,255,255,0.4)" },
};

const Todo = ({ output, refresh }) => {
  const text = (output || "").trim();
  if (!text) return <div style={s.empty}>No TODOs</div>;
  const allLines = text.split("\n");
  const sepIdx = allLines.findIndex(l => l.trim() === "---");
  const blockLines = (sepIdx >= 0 ? allLines.slice(0, sepIdx) : allLines)
    .filter(l => l.trim());
  const totalCount = allLines.filter(l => l.trim() && l.trim() !== "---").length;
  const items = blockLines.map(parseTodoLine);

  return (
    <div>
      <div className="clickable" style={{ ...s.label, cursor: "pointer" }} onClick={refresh}>TODO{totalCount > blockLines.length ? ` (${totalCount})` : ""}</div>
      <div className="clickable" style={_todoS.list} onClick={() => run("open ~/TODO.txt")}>
        {items.map((item, i) => (
          <div key={i} style={_todoS.row}>
            <span style={_todoS.idx}>{i}.</span>
            {item.checked !== null && (
              <input type="checkbox" checked={item.checked} readOnly style={_todoS.checkbox} />
            )}
            <span style={{ ..._todoS.text, ...(item.checked ? _todoS.done : null) }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

widgets.push({ key: "todo", order: 3.5, ttl: 5, cmd: _todoCmd, Component: Todo });
