const _todoCmd = `cat ~/TODO.txt 2>/dev/null || echo ""`;

const _todoCheckRe = /^(\s*)-\s*\[([ xX])\]\s*(.*)$/;
const _todoBulletRe = /^(\s*)-\s+(.*)$/;
const parseTodoLine = (line) => {
  const c = line.match(_todoCheckRe);
  if (c) return { depth: Math.floor(c[1].length / 2), checked: c[2].toLowerCase() === "x", text: c[3] };
  const b = line.match(_todoBulletRe);
  if (b) return { depth: Math.floor(b[1].length / 2), checked: null, text: b[2] };
  return { depth: 0, checked: null, text: line.trim() };
};

const _todoLinkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
const renderTodoText = (text) => {
  const parts = [];
  let last = 0;
  let m;
  while ((m = _todoLinkRe.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const url = m[2];
    parts.push(
      <a
        key={parts.length}
        style={{ color: "#6eb5ff", textDecoration: "underline", cursor: "pointer" }}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); run('open "' + url + '"'); }}
      >{m[1]}</a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
};

const _todoS = {
  list: { cursor: "pointer", fontSize: "11px", lineHeight: "1.35", color: "rgba(255,255,255,0.85)" },
  row: { display: "flex", alignItems: "flex-start", gap: "4px", marginBottom: "2px" },
  idx: { color: "rgba(255,255,255,0.4)", flexShrink: 0, fontVariantNumeric: "tabular-nums" },
  childMark: { color: "rgba(255,255,255,0.35)", flexShrink: 0 },
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

  let topIdx = 0;
  const numbered = items.map(item => ({
    ...item,
    label: item.depth === 0 ? `${topIdx++}.` : null,
  }));

  return (
    <div>
      <div className="clickable" style={{ ...s.label, cursor: "pointer" }} onClick={refresh}>TODO{totalCount > blockLines.length ? ` (${totalCount})` : ""}</div>
      <div style={_todoS.list} onClick={() => run("open ~/TODO.txt")}>
        {numbered.map((item, i) => (
          <div key={i} style={{ ..._todoS.row, marginLeft: `${item.depth * 10}px` }}>
            {item.label !== null
              ? <span style={_todoS.idx}>{item.label}</span>
              : <span style={_todoS.childMark}>◦</span>}
            {item.checked !== null && (
              <input type="checkbox" checked={item.checked} readOnly style={_todoS.checkbox} />
            )}
            <span style={{ ..._todoS.text, ...(item.checked ? _todoS.done : null) }}>{renderTodoText(item.text)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

widgets.push({ key: "todo", order: 3.5, ttl: 5, cmd: _todoCmd, Component: Todo });
