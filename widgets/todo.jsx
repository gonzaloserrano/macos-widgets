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
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" },
  toggle: { fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px", color: "rgba(255,255,255,0.45)", cursor: "pointer", padding: "0 2px" },
  divider: { height: "1px", background: "rgba(255,255,255,0.08)", margin: "4px 0" },
};

const _todoSplitParts = (lines) => {
  const parts = [[]];
  for (const l of lines) {
    if (l.trim() === "---") { parts.push([]); continue; }
    parts[parts.length - 1].push(l);
  }
  return parts.map(p => p.filter(l => l.trim()));
};

const _todoNumber = (items) => {
  let topIdx = 0;
  return items.map(item => ({
    ...item,
    label: item.depth === 0 ? `${topIdx++}.` : null,
  }));
};

const _todoRow = (item, key) => (
  <div key={key} style={{ ..._todoS.row, marginLeft: `${item.depth * 10}px` }}>
    {item.label !== null
      ? <span style={_todoS.idx}>{item.label}</span>
      : <span style={_todoS.childMark}>◦</span>}
    {item.checked !== null && (
      <input type="checkbox" checked={item.checked} readOnly style={_todoS.checkbox} />
    )}
    <span style={{ ..._todoS.text, ...(item.checked ? _todoS.done : null) }}>{renderTodoText(item.text)}</span>
  </div>
);

const Todo = ({ output, refresh }) => {
  const [showLow, setShowLow] = React.useState(false);
  const text = (output || "").trim();
  if (!text) return <div style={s.empty}>No TODOs</div>;

  const [visibleLines = [], lowLines = []] = _todoSplitParts(text.split("\n"));
  const visibleItems = _todoNumber(visibleLines.map(parseTodoLine));
  const lowItems = _todoNumber(lowLines.map(parseTodoLine));
  const lowCount = lowItems.filter(i => i.label !== null).length;

  return (
    <div>
      <div style={_todoS.header}>
        <div className="clickable" style={{ ...s.label, cursor: "pointer", marginBottom: 0 }} onClick={refresh}>TODO</div>
        {lowCount > 0 && (
          <div
            className="clickable"
            style={_todoS.toggle}
            onClick={(e) => { e.stopPropagation(); setShowLow(v => !v); }}
          >{showLow ? `− ${lowCount}` : `+ ${lowCount}`}</div>
        )}
      </div>
      <div style={_todoS.list} onClick={() => run("open ~/TODO.txt")}>
        {visibleItems.map((item, i) => _todoRow(item, i))}
        {showLow && lowItems.length > 0 && (
          <React.Fragment>
            <div style={_todoS.divider} />
            {lowItems.map((item, i) => _todoRow(item, `low-${i}`))}
          </React.Fragment>
        )}
      </div>
    </div>
  );
};

widgets.push({ key: "todo", order: 3.5, ttl: 5, cmd: _todoCmd, Component: Todo });
