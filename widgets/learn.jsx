// Combined "LEARN" flashcard: a random Claude Code slash command (scraped daily
// from the docs) stacked above a random neovim keymap. One widget entry means one
// shell command and one ttl, so both datasets are emitted as a single JSON blob
// ({claude, nvim}) and both re-pick every ttl seconds. The Claude docs HTML is
// still fetched at most once a day via its own /tmp cache, independent of the ttl.
const _learnCmd = `CACHE=/tmp/ub_cc_commands_html
if [ ! -f "$CACHE" ] || [ $(($(date +%s) - $(stat -f%m "$CACHE"))) -ge 86400 ]; then
TMP=$(mktemp)
if curl -sfL --max-time 15 "https://code.claude.com/docs/en/commands" -o "$TMP" && [ -s "$TMP" ]; then
mv "$TMP" "$CACHE"
else
rm -f "$TMP"
fi
fi
python3 -c "
import os, re, json, random, html as ihtml

# --- Claude slash command ---
claude = {}
path = '$CACHE'
if os.path.isfile(path):
    h = open(path, encoding='utf-8', errors='replace').read()
    m = re.search(r'<thead><tr><th[^>]*>Command</th><th[^>]*>Purpose</th></tr></thead><tbody>(.*?)</tbody>', h, re.DOTALL)
    if m:
        def strip(s):
            return ihtml.unescape(re.sub(r'<[^>]+>', '', s)).strip()
        items = []
        for tr in re.findall(r'<tr>(.*?)</tr>', m.group(1), re.DOTALL):
            tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL)
            if len(tds) < 2:
                continue
            cmd, purpose = strip(tds[0]), strip(tds[1])
            if not cmd.startswith('/'):
                continue
            if re.search(r'deprecat|removed in|has been removed|no longer available', purpose, re.I):
                continue
            parts = cmd.split(None, 1)
            items.append({'name': parts[0], 'args': parts[1] if len(parts) > 1 else '', 'desc': purpose})
        if items:
            claude = random.choice(items)

# --- neovim keymap ---
nvim = {}
try:
    maps = []
    with open('$HOME/.config/nvim/init.lua') as f:
        for line in f:
            line = line.strip()
            if line.startswith('--') or not line.startswith('map('):
                continue
            p = line.split(chr(39))
            if len(p) >= 6:
                key, cmd = p[3], p[5]
                if cmd.startswith(':'): cmd = cmd[1:]
                if cmd.lower().endswith('<cr>'): cmd = cmd[:-4]
                if cmd.startswith('lua '): cmd = cmd[4:]
                maps.append({'key': key, 'cmd': cmd})
    if maps:
        nvim = random.choice(maps)
except OSError:
    pass

print(json.dumps({'claude': claude, 'nvim': nvim}))
"`;

const Learn = ({ output, refresh }) => {
  const [expanded, setExpanded] = React.useState(false);

  let data = null;
  try { data = JSON.parse(output); } catch {}
  const cc = (data && data.claude) || {};
  const nv = (data && data.nvim) || {};

  // Collapse the Claude description whenever a new command rotates in.
  React.useEffect(() => { setExpanded(false); }, [cc.name]);

  if (!data) return <div style={s.empty}>unavailable</div>;
  if (!cc.name && !nv.key) return <div style={s.empty}>Nothing found</div>;

  const logo = <img src="claude-code-logo.png" width="12" style={{ imageRendering: "pixelated", marginRight: "4px", verticalAlign: "middle" }} />;
  const truncated = cc.desc && cc.desc.length > 60 ? cc.desc.slice(0, 57) + "..." : (cc.desc || "");

  return (
    <div style={{ position: "relative" }}>
      <div className="clickable" style={{ ...s.label, cursor: "pointer", marginBottom: "6px" }} onClick={refresh}>LEARN</div>

      {cc.name && (
        <div style={{ marginBottom: nv.key ? "8px" : 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "SF Mono, Menlo, monospace", color: "#c4a5f7", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {logo}{cc.name}
            {cc.args ? <span style={{ fontWeight: 400, color: "rgba(196,165,247,0.6)" }}> {cc.args}</span> : null}
          </div>
          <div onClick={() => setExpanded(e => !e)} style={{ fontSize: "11px", fontFamily: "SF Mono, Menlo, monospace", color: "rgba(255,255,255,0.55)", wordWrap: "break-word", whiteSpace: "pre-wrap", lineHeight: "1.35", cursor: "pointer" }}>{truncated}</div>
        </div>
      )}

      {cc.name && nv.key && <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "8px 0" }} />}

      {nv.key && (
        <div>
          <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "SF Mono, Menlo, monospace", color: "#a8e6a3", marginBottom: "4px" }}>{nv.key}</div>
          <div style={{ fontSize: "11px", fontFamily: "SF Mono, Menlo, monospace", color: "rgba(255,255,255,0.6)", wordWrap: "break-word", whiteSpace: "pre-wrap" }}>{nv.cmd}</div>
        </div>
      )}

      {expanded && cc.desc && (
        <div onClick={() => setExpanded(false)} style={{
          position: "absolute",
          top: "100%",
          left: "-14px",
          right: "-14px",
          marginTop: "6px",
          padding: "10px 14px",
          background: "rgba(40, 40, 40, 0.97)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          fontSize: "11px",
          fontFamily: "SF Mono, Menlo, monospace",
          color: "rgba(255,255,255,0.85)",
          lineHeight: "1.45",
          zIndex: 10,
          cursor: "pointer",
          wordWrap: "break-word",
          whiteSpace: "pre-wrap",
        }}>{cc.desc}</div>
      )}
    </div>
  );
};

widgets.push({ key: "learn", order: -2, ttl: 60, cmd: _learnCmd, Component: Learn });
