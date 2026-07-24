const _todoCmd = `cat ~/TODO.md 2>/dev/null || echo ""`;

// Clicking opens ~/TODO.md in vi inside a cmux workspace named "TODO". Reuse an existing
// one (select it, then raise its window) instead of spawning a duplicate on every click;
// only create a fresh workspace when none is found. Match on custom_title, which is the
// name set via --name and, unlike title, is never decorated with activity glyphs.
const _todoOpenCmd = `j=$(/opt/homebrew/bin/cmux workspace list --json); r=$(printf '%s' "$j" | /opt/homebrew/bin/jq -r '[.workspaces[]|select(.custom_title=="TODO")|.ref][0]//empty'); if [ -n "$r" ]; then w=$(printf '%s' "$j" | /opt/homebrew/bin/jq -r .window_ref); CMUX_QUIET=1 /opt/homebrew/bin/cmux workspace select "$r" && CMUX_QUIET=1 /opt/homebrew/bin/cmux focus-window --window "$w"; else CMUX_QUIET=1 /opt/homebrew/bin/cmux workspace create --name TODO --cwd ~ --command "vi ~/TODO.md" --focus true; fi`;

const _todoCheckRe = /^(\s*)-\s*\[([ xX])\]\s*(.*)$/;
const _todoBulletRe = /^(\s*)-\s+(.*)$/;
const parseTodoLine = (line) => {
  const c = line.match(_todoCheckRe);
  if (c) return { depth: Math.floor(c[1].length / 2), checked: c[2].toLowerCase() === "x", text: c[3] };
  const b = line.match(_todoBulletRe);
  if (b) return { depth: Math.floor(b[1].length / 2), checked: null, text: b[2] };
  return { depth: 0, checked: null, text: line.trim() };
};

// Per-user chip colors. Every distinct @user gets its own hue: we collect all
// usernames in the file up front (_todoBuildUserMap), then hand out hues spaced by
// the golden angle so no two users collide and adjacent list mentions stay far apart.
const _todoMentionRe = /@(\p{L}[\p{L}\p{N}_]*)/gu;
const _todoHueColor = (hue) => ({
  bg: `hsla(${hue}, 70%, 60%, 0.28)`,
  fg: `hsl(${hue}, 85%, 82%)`,
});
let _todoUserMap = {};
const _todoBuildUserMap = (text) => {
  const keys = [];
  let m;
  while ((m = _todoMentionRe.exec(text)) !== null) {
    const k = m[1].toLowerCase();
    if (!keys.includes(k)) keys.push(k);
  }
  const map = {};
  keys.forEach((k, i) => { map[k] = _todoHueColor(Math.round(i * 137.508) % 360); });
  return map;
};
const _todoUserColor = (name) => {
  const k = name.toLowerCase();
  if (_todoUserMap[k]) return _todoUserMap[k];
  let h = 0; // fallback: hash to a hue (a mention absent from the prebuilt map)
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return _todoHueColor(h % 360);
};

// Matches **bold** (group 1), [text](url) (groups 2, 3), @username (group 4), or a
// bare GitHub PR URL (groups 5 repo, 6 number) rendered as a compact repo#num link.
// The `u` flag makes \p{L} match accented names like @José. The PR-URL segments use
// [\w.-] (GitHub's own owner/repo charset) so the matched URL can never contain a
// shell metacharacter — it is passed to `run('open "..."')`, so this is what keeps
// that shell string injection-safe by construction.
const _todoInlineRe = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)|@(\p{L}[\p{L}\p{N}_]*)|https?:\/\/github\.com\/[\w.-]+\/([\w.-]+)\/pull\/(\d+)/gu;
const renderTodoText = (text) => {
  const parts = [];
  let last = 0;
  let m;
  while ((m = _todoInlineRe.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      parts.push(<strong key={parts.length} style={{ fontWeight: 700 }}>{m[1]}</strong>);
    } else if (m[4] !== undefined) {
      const c = _todoUserColor(m[4]);
      parts.push(
        <span
          key={parts.length}
          style={{ background: c.bg, color: c.fg, fontWeight: 600, borderRadius: "4px", padding: "0 4px", whiteSpace: "nowrap" }}
        >{m[4]}</span>
      );
    } else if (m[5] !== undefined) {
      const url = m[0];
      const label = `${m[5]}#${m[6]}`;
      parts.push(
        <a
          key={parts.length}
          style={{ color: "#6eb5ff", textDecoration: "underline", cursor: "pointer", whiteSpace: "nowrap" }}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); run('open "' + url + '"'); }}
        >{label}</a>
      );
    } else {
      const url = m[3];
      parts.push(
        <a
          key={parts.length}
          style={{ color: "#6eb5ff", textDecoration: "underline", cursor: "pointer" }}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); run('open "' + url + '"'); }}
        >{m[2]}</a>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
};

// One translucent tint per section, cycled by section index.
const _todoGroupColors = [
  "rgba(110,181,255,0.10)", // blue
  "rgba(126,231,135,0.10)", // green
  "rgba(255,196,110,0.10)", // orange
  "rgba(214,142,255,0.10)", // purple
  "rgba(255,138,138,0.10)", // red
  "rgba(110,231,231,0.10)", // teal
];

const _todoS = {
  list: { cursor: "pointer", fontSize: "11px", lineHeight: "1.35", color: "rgba(255,255,255,0.85)" },
  row: { display: "flex", alignItems: "flex-start", gap: "4px", marginBottom: "2px" },
  group: { borderRadius: "5px", padding: "3px 5px", marginBottom: "3px" },
  title: { fontWeight: 700, color: "rgba(255,255,255,0.95)", paddingBottom: "3px", marginBottom: "3px", borderBottom: "2px solid transparent" },
  idx: { color: "rgba(255,255,255,0.4)", flexShrink: 0, fontVariantNumeric: "tabular-nums" },
  childMark: { color: "rgba(255,255,255,0.35)", flexShrink: 0 },
  checkbox: { margin: "2px 0 0", flexShrink: 0, accentColor: "#6eb5ff", width: "11px", height: "11px", cursor: "pointer" },
  text: { wordBreak: "break-word", minWidth: 0 },
  done: { textDecoration: "line-through", color: "rgba(255,255,255,0.4)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" },
  toggle: { fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px", color: "rgba(255,255,255,0.45)", cursor: "pointer", padding: "0 2px" },
  divider: { height: "1px", background: "rgba(255,255,255,0.08)", margin: "4px 0" },
};

// Split raw lines into `---`-delimited parts, preserving blank lines (they delimit
// sections within a part). srcLine is the 1-based file line for checkbox toggling.
const _todoSplitParts = (lines) => {
  const parts = [[]];
  lines.forEach((raw, i) => {
    if (raw.trim() === "---") { parts.push([]); return; }
    parts[parts.length - 1].push({ raw, srcLine: i + 1 });
  });
  return parts;
};

const _todoIsItem = (raw) => _todoBulletRe.test(raw);

// A section is a blank-line-delimited block. Its first line is the title only when it
// is not itself a list item; otherwise the section is title-less (e.g. the low-prio block).
const _todoToSection = (lineObjs) => {
  const nonBlank = lineObjs.filter(x => x.raw.trim());
  if (!nonBlank.length) return null;
  const hasTitle = !_todoIsItem(nonBlank[0].raw);
  const itemLines = hasTitle ? nonBlank.slice(1) : nonBlank;
  return {
    title: hasTitle ? nonBlank[0].raw.trim() : null,
    items: itemLines.map(x => ({ ...parseTodoLine(x.raw), srcLine: x.srcLine })),
  };
};

const _todoSections = (lineObjs) => {
  const blocks = [[]];
  lineObjs.forEach((x) => {
    if (!x.raw.trim()) { if (blocks[blocks.length - 1].length) blocks.push([]); return; }
    blocks[blocks.length - 1].push(x);
  });
  return blocks.map(_todoToSection).filter(Boolean);
};

const _todoNumber = (items) => {
  let topIdx = 0;
  return items.map(item => ({
    ...item,
    label: item.depth === 0 ? `${topIdx++}.` : null,
  }));
};

const _todoRow = (item, key, onToggle) => (
  <div key={key} style={{ ..._todoS.row, marginLeft: `${item.depth * 10}px` }}>
    {item.label !== null
      ? <span style={_todoS.idx}>{item.label}</span>
      : <span style={_todoS.childMark}>◦</span>}
    {item.checked !== null && (
      <input
        type="checkbox"
        checked={item.checked}
        onChange={() => onToggle(item)}
        onClick={(e) => e.stopPropagation()}
        style={_todoS.checkbox}
      />
    )}
    <span style={{ ..._todoS.text, ...(item.checked ? _todoS.done : null) }}>{renderTodoText(item.text)}</span>
  </div>
);

// Render one tinted block per section: an optional title header followed by its
// numbered list (numbering restarts per section).
const _todoRenderSections = (sections, keyPrefix, onToggle) =>
  sections.map((sec, si) => (
    <div
      key={`${keyPrefix}-s${si}`}
      style={{ ..._todoS.group, background: _todoGroupColors[si % _todoGroupColors.length] }}
    >
      {sec.title && <div style={_todoS.title}>{renderTodoText(sec.title)}</div>}
      {_todoNumber(sec.items).map((item, i) => _todoRow(item, i, onToggle))}
    </div>
  ));

const _todoFilterDone = (items) => {
  const out = [];
  let skipDepth = -1;
  for (const item of items) {
    if (skipDepth >= 0 && item.depth > skipDepth) continue;
    skipDepth = -1;
    if (item.checked === true) { skipDepth = item.depth; continue; }
    out.push(item);
  }
  return out;
};

const Todo = ({ output, refresh }) => {
  const [showLow, setShowLow] = React.useState(false);
  const [hideDone, setHideDone] = React.useState(false);
  const text = (output || "").trim();
  if (!text) return <div style={s.empty}>No TODOs</div>;

  _todoUserMap = _todoBuildUserMap(text); // one distinct color per @user, whole file

  const [visiblePart = [], lowPart = []] = _todoSplitParts(text.split("\n"));
  const visibleSections = _todoSections(visiblePart);
  const lowSections = _todoSections(lowPart);

  const doneCount = [...visibleSections, ...lowSections]
    .flatMap(sec => sec.items).filter(i => i.checked === true).length;

  // Drop done items (and their descendants) when hideDone is on; keep a section if it
  // still has items, or was only ever a title.
  const prep = (sections) => sections
    .map(sec => ({ title: sec.title, items: hideDone ? _todoFilterDone(sec.items) : sec.items, had: sec.items.length }))
    .filter(sec => sec.items.length || sec.had === 0);

  const visiblePrepped = prep(visibleSections);
  const lowPrepped = prep(lowSections);
  const lowCount = lowPrepped.flatMap(sec => sec.items).filter(i => i.depth === 0).length;

  const toggleItem = (item) => {
    const newChar = item.checked ? " " : "x";
    run(`sed -i '' '${item.srcLine}s/\\[[xX ]\\]/[${newChar}]/' ~/TODO.md`).then(refresh);
  };

  return (
    <div>
      <div style={_todoS.header}>
        <div className="clickable" style={{ ...s.label, cursor: "pointer", marginBottom: 0 }} onClick={refresh}>TODO</div>
        <div style={{ display: "flex", gap: "6px" }}>
          {doneCount > 0 && (
            <div
              className="clickable"
              style={{ ..._todoS.toggle, ...(hideDone && { color: "#6eb5ff" }) }}
              onClick={(e) => { e.stopPropagation(); setHideDone(v => !v); }}
            >✓ {doneCount}</div>
          )}
          {lowCount > 0 && (
            <div
              className="clickable"
              style={_todoS.toggle}
              onClick={(e) => { e.stopPropagation(); setShowLow(v => !v); }}
            >{showLow ? `− ${lowCount}` : `+ ${lowCount}`}</div>
          )}
        </div>
      </div>
      <div style={_todoS.list} onClick={() => run(_todoOpenCmd)}>
        {_todoRenderSections(visiblePrepped, "v", toggleItem)}
        {showLow && lowPrepped.length > 0 && (
          <React.Fragment>
            <div style={_todoS.divider} />
            {_todoRenderSections(lowPrepped, "low", toggleItem)}
          </React.Fragment>
        )}
      </div>
    </div>
  );
};

widgets.push({ key: "todo", order: 3.5, ttl: 5, cmd: _todoCmd, Component: Todo });
