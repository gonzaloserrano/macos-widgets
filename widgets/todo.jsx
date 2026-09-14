const _todoCmd = `cat ~/TODO.md 2>/dev/null || echo ""`;

// Clicking opens ~/TODO.md in vi inside a cmux workspace named "TODO". Reuse an existing
// one instead of spawning a duplicate on every click: select it, raise its window, then
// activate the app via `open -b`, since focus-window only reorders windows inside cmux and
// does not switch macOS focus away from Übersicht. Only create a fresh workspace when none
// is found. Match on custom_title, which is the name set via --name and, unlike title, is
// never decorated with activity glyphs.
const _todoOpenCmd = `j=$(/opt/homebrew/bin/cmux workspace list --json); r=$(printf '%s' "$j" | /opt/homebrew/bin/jq -r '[.workspaces[]|select(.custom_title=="TODO")|.ref][0]//empty'); if [ -n "$r" ]; then w=$(printf '%s' "$j" | /opt/homebrew/bin/jq -r .window_ref); CMUX_QUIET=1 /opt/homebrew/bin/cmux workspace select "$r" && CMUX_QUIET=1 /opt/homebrew/bin/cmux focus-window --window "$w" && /usr/bin/open -b com.cmuxterm.app; else CMUX_QUIET=1 /opt/homebrew/bin/cmux workspace create --name TODO --cwd ~ --command "vi ~/TODO.md" --focus true; fi`;

// Rewrite ~/TODO.md wholesale after a reorder. The content goes through base64 so no
// line of the file can be reinterpreted as shell syntax, and it lands via a temp file
// in the same directory + mv, so a concurrent `cat` never sees a half-written file.
const _todoB64 = (str) => {
  let bin = "";
  new TextEncoder().encode(str).forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
};
const _todoWriteCmd = (lines) => {
  const content = lines.join("\n").replace(/\n+$/, "") + "\n";
  return `printf %s '${_todoB64(content)}' | base64 -d > ~/.TODO.md.tmp && mv ~/.TODO.md.tmp ~/TODO.md`;
};

// Move the 1-based line range [from, to] so it lands immediately before line `before`
// (which indexes the *original* array, hence the shift when the range sat above it).
// Used for items: they live inside a block, so no blank line is ever involved.
const _todoMoveLines = (lines, from, to, before) => {
  const chunk = lines.slice(from - 1, to);
  const rest = [...lines.slice(0, from - 1), ...lines.slice(to)];
  const at = before > to ? before - 1 - (to - from + 1) : before - 1;
  rest.splice(at, 0, ...chunk);
  return rest;
};

// Same, for a whole section. Sections are delimited by blank lines, so a bare line
// splice would fuse the moved block into its new neighbour: instead the block leaves
// its trailing blanks behind and gets blanks re-added on whichever side needs one.
const _todoMoveSection = (lines, from, to, before) => {
  let end = to;
  while (end < lines.length && !lines[end].trim()) end++;
  const block = lines.slice(from - 1, to);
  const rest = [...lines.slice(0, from - 1), ...lines.slice(end)];
  const at = before > to ? before - 1 - (end - from + 1) : before - 1;
  const prevBlank = at === 0 || !rest[at - 1].trim();
  const nextBlank = at >= rest.length || !rest[at].trim();
  rest.splice(at, 0, ...(prevBlank ? [] : [""]), ...block, ...(nextBlank ? [] : [""]));
  return rest;
};

const _todoCheckRe = /^(\s*)-\s*\[([ xX])\]\s*(.*)$/;
const _todoBulletRe = /^(\s*)-\s+(.*)$/;
// `bullet` marks real `- ` list lines. Plain text lines (notes in the low-prio block)
// also render as rows, but they are not draggable: a section takes its title from a
// first line that is not a list item, so dropping one at the head of a block would
// silently promote it to that section's title.
const parseTodoLine = (line) => {
  const c = line.match(_todoCheckRe);
  if (c) return { depth: Math.floor(c[1].length / 2), checked: c[2].toLowerCase() === "x", text: c[3], bullet: true };
  const b = line.match(_todoBulletRe);
  if (b) return { depth: Math.floor(b[1].length / 2), checked: null, text: b[2], bullet: true };
  return { depth: 0, checked: null, text: line.trim(), bullet: false };
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

// Matches **bold** (group 1), [text](url) (groups 2, 3), @username (group 4), a bare
// GitHub PR URL (groups 5 repo, 6 number) rendered as a compact repo#num link, or a
// bare Linear issue URL (group 7 issue id) rendered as its CON-123 id.
// The `u` flag makes \p{L} match accented names like @José. The PR and Linear URL
// segments use restricted charsets ([\w.-] for path parts, [A-Z0-9]+-\d+ for the
// Linear id) so the matched URL can never contain a shell metacharacter: it is passed
// to `run('open "..."')`, so this is what keeps that shell string injection-safe.
const _todoInlineRe = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)|@(\p{L}[\p{L}\p{N}_]*)|https?:\/\/github\.com\/[\w.-]+\/([\w.-]+)\/pull\/(\d+)|https?:\/\/linear\.app\/[\w.-]+\/issue\/([A-Z0-9]+-\d+)(?:\/[\w.-]*)?/gu;
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
    } else if (m[5] !== undefined || m[7] !== undefined) {
      const url = m[0];
      const label = m[7] !== undefined ? m[7] : `${m[5]}#${m[6]}`;
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

// Manual sorting. HTML5 drag-and-drop does not initiate reliably inside Übersicht's
// borderless, non-activating window, so the gesture is tracked from raw mouse events:
// a drag only begins once the cursor has travelled _TODO_DRAG_MIN px, which leaves
// plain clicks (open vi, toggle a checkbox) working untouched. Drop targets are
// hit-tested against live bounding rects, so nothing is precomputed at render time.
const _TODO_DRAG_MIN = 4;

// Nearest zone of the same kind (items only drop among items, sections among
// sections); the cursor being past its midpoint means "after", i.e. insert at the
// line following the zone's span.
const _todoHitTest = (zones, kind, y) => {
  let best = null;
  Object.keys(zones).forEach((id) => {
    const z = zones[id];
    if (z.kind !== kind) return;
    const r = z.el.getBoundingClientRect();
    const dist = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
    if (!best || dist < best.dist) best = { dist, id, z, mid: (r.top + r.bottom) / 2 };
  });
  if (!best) return null;
  const after = y > best.mid;
  return { id: best.id, edge: after ? "bottom" : "top", before: after ? best.z.endLine + 1 : best.z.startLine };
};

const _useTodoSort = (onMove) => {
  const zones = React.useRef({});
  const g = React.useRef(null);        // live gesture, mutated without re-rendering
  const draggedAt = React.useRef(0);
  const onMoveRef = React.useRef(onMove);
  onMoveRef.current = onMove;
  const [drag, setDrag] = React.useState(null);

  React.useEffect(() => {
    const move = (e) => {
      const cur = g.current;
      if (!cur) return;
      if (!cur.active) {
        if (Math.abs(e.clientX - cur.x0) + Math.abs(e.clientY - cur.y0) < _TODO_DRAG_MIN) return;
        cur.active = true;
      }
      cur.target = _todoHitTest(zones.current, cur.kind, e.clientY);
      setDrag({ id: cur.id, label: cur.label, x: e.clientX, y: e.clientY, target: cur.target });
    };
    const up = () => {
      const cur = g.current;
      g.current = null;
      setDrag(null);
      if (!cur || !cur.active) return;
      draggedAt.current = performance.now();
      const t = cur.target;
      // Landing anywhere inside its own span is a no-op, not a move.
      if (t && (t.before < cur.startLine || t.before > cur.endLine + 1)) onMoveRef.current(cur, t.before);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return {
    dragging: drag && drag.id,
    register: (id, meta) => (el) => { if (el) zones.current[id] = { el, ...meta }; else delete zones.current[id]; },
    start: (e, meta) => {
      if (e.button !== 0 || e.target.closest("a, input")) return;
      g.current = { ...meta, x0: e.clientX, y0: e.clientY, active: false, target: null };
    },
    mark: (id, edge) => (drag && drag.target && drag.target.id === id && drag.target.edge === edge
      ? <div style={_todoDropMark(edge)} /> : null),
    ghost: drag && <div style={{ ..._todoS.ghost, left: `${drag.x + 10}px`, top: `${drag.y + 10}px` }}>{drag.label}</div>,
    // mouseup fires the list's click too; ignore clicks that are really drag ends. A
    // timestamp rather than a flag, so a mouseup outside the card cannot leave the
    // next genuine click swallowed.
    wasDrag: () => performance.now() - draggedAt.current < 300,
  };
};

// Absolutely positioned so showing it cannot resize the zone it sits in, which would
// otherwise move the midpoint under the cursor and make the indicator flicker.
const _todoDropMark = (edge) => ({
  position: "absolute",
  left: 0,
  right: 0,
  [edge === "top" ? "top" : "bottom"]: "-2px",
  height: "2px",
  borderRadius: "1px",
  background: "#6eb5ff",
  boxShadow: "0 0 4px rgba(110,181,255,0.9)",
});

const _todoS = {
  list: { cursor: "pointer", fontSize: "11px", lineHeight: "1.35", color: "rgba(255,255,255,0.85)", userSelect: "none", WebkitUserSelect: "none" },
  row: { display: "flex", alignItems: "flex-start", gap: "4px", marginBottom: "2px" },
  group: { borderRadius: "5px", padding: "3px 5px", marginBottom: "3px", position: "relative" },
  title: { fontWeight: 700, color: "rgba(255,255,255,0.95)", paddingBottom: "3px", marginBottom: "3px", borderBottom: "2px solid transparent", cursor: "grab" },
  span: { position: "relative" },
  ghost: {
    position: "fixed", zIndex: 9999, pointerEvents: "none",
    background: "rgba(40,40,40,0.95)", border: "1px solid rgba(110,181,255,0.6)",
    borderRadius: "4px", padding: "2px 6px", fontSize: "11px", color: "#fff",
    maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    boxShadow: "0 4px 12px rgba(0,0,0,0.45)",
  },
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
    items: _todoWithSpans(itemLines.map(x => ({ ...parseTodoLine(x.raw), srcLine: x.srcLine }))),
    // The block's own line span, for reordering whole sections in the file. A block
    // never contains blank lines, so its last non-blank line is its last line.
    startLine: nonBlank[0].srcLine,
    endLine: nonBlank[nonBlank.length - 1].srcLine,
  };
};

// A top-level item owns the indented lines under it, and a drag moves that whole span,
// so record where it ends now: hideDone may later hide children from the render, and
// the span must still cover them.
const _todoWithSpans = (items) => items.map((item, i) => {
  let spanEnd = item.srcLine;
  for (let j = i + 1; j < items.length && items[j].depth > item.depth; j++) spanEnd = items[j].srcLine;
  return { ...item, spanEnd };
});

// Each top-level item plus its indented children, so a drag zone can wrap the lot.
const _todoSpanGroups = (items) => {
  const groups = [];
  items.forEach((item) => {
    if (item.depth === 0 || !groups.length) groups.push([item]);
    else groups[groups.length - 1].push(item);
  });
  return groups;
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
// numbered list (numbering restarts per section). Both levels are drag zones: the
// section by its title, each top-level item (with its children) by anywhere in the row.
const _todoRenderSections = (sections, keyPrefix, onToggle, sort) =>
  sections.map((sec, si) => {
    const secId = `${keyPrefix}-s${si}`;
    const secDrag = { kind: "section", id: secId, startLine: sec.startLine, endLine: sec.endLine, label: sec.title };
    return (
      <div
        key={secId}
        ref={sort.register(secId, { kind: "section", startLine: sec.startLine, endLine: sec.endLine })}
        style={{
          ..._todoS.group,
          background: _todoGroupColors[si % _todoGroupColors.length],
          opacity: sort.dragging === secId ? 0.35 : 1,
        }}
      >
        {sort.mark(secId, "top")}
        {sec.title && (
          <div style={_todoS.title} onMouseDown={(e) => sort.start(e, secDrag)}>{renderTodoText(sec.title)}</div>
        )}
        {_todoSpanGroups(_todoNumber(sec.items)).map((group) => {
          const head = group[0];
          const id = `${secId}-i${head.srcLine}`;
          const rows = group.map((item, i) => _todoRow(item, i, onToggle));
          if (!head.bullet) return <div key={id}>{rows}</div>;
          const meta = { kind: "item", startLine: head.srcLine, endLine: head.spanEnd };
          return (
            <div
              key={id}
              ref={sort.register(id, meta)}
              style={{ ..._todoS.span, opacity: sort.dragging === id ? 0.35 : 1 }}
              onMouseDown={(e) => sort.start(e, { ...meta, id, label: head.text })}
            >
              {sort.mark(id, "top")}
              {rows}
              {sort.mark(id, "bottom")}
            </div>
          );
        })}
        {sort.mark(secId, "bottom")}
      </div>
    );
  });

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

  // Apply a drop by rewriting ~/TODO.md. The card renders cached output (up to ~10s
  // stale) and the file may have been edited in vi since, so re-read it first and bail
  // if it moved: reordering a stale snapshot would silently clobber those edits.
  const applyMove = (src, before) => {
    run(_todoCmd).then((cur) => {
      if (cur.trim() !== text) { refresh(); return; }
      const lines = cur.trim().split("\n");
      const next = src.kind === "section"
        ? _todoMoveSection(lines, src.startLine, src.endLine, before)
        : _todoMoveLines(lines, src.startLine, src.endLine, before);
      run(_todoWriteCmd(next)).then(refresh);
    });
  };
  const sort = _useTodoSort(applyMove);

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
    .map(sec => ({ ...sec, items: hideDone ? _todoFilterDone(sec.items) : sec.items, had: sec.items.length }))
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
      <div style={_todoS.list} onClick={() => { if (!sort.wasDrag()) run(_todoOpenCmd); }}>
        {_todoRenderSections(visiblePrepped, "v", toggleItem, sort)}
        {showLow && lowPrepped.length > 0 && (
          <React.Fragment>
            <div style={_todoS.divider} />
            {_todoRenderSections(lowPrepped, "low", toggleItem, sort)}
          </React.Fragment>
        )}
      </div>
      {sort.ghost}
    </div>
  );
};

widgets.push({ key: "todo", order: 3.5, ttl: 5, cmd: _todoCmd, Component: Todo });
