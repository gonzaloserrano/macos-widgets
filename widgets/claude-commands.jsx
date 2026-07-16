const _claudeCommandsCmd = `CACHE=/tmp/ub_cc_commands_html
if [ ! -f "$CACHE" ] || [ $(($(date +%s) - $(stat -f%m "$CACHE"))) -ge 86400 ]; then
TMP=$(mktemp)
if curl -sfL --max-time 15 "https://code.claude.com/docs/en/commands" -o "$TMP" && [ -s "$TMP" ]; then
mv "$TMP" "$CACHE"
else
rm -f "$TMP"
fi
fi
python3 -c "
import os, re, json, random, sys, html as ihtml
path = '$CACHE'
if not os.path.isfile(path):
    print('{}'); sys.exit()
h = open(path, encoding='utf-8', errors='replace').read()
m = re.search(r'<thead><tr><th[^>]*>Command</th><th[^>]*>Purpose</th></tr></thead><tbody>(.*?)</tbody>', h, re.DOTALL)
if not m:
    print('{}'); sys.exit()
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
print(json.dumps(random.choice(items)) if items else '{}')
"`;

const ClaudeCommands = ({ output, refresh }) => {
  let data;
  try { data = JSON.parse(output); } catch { return <div style={s.empty}>unavailable</div>; }
  if (!data.name) return <div style={s.empty}>Nothing found</div>;

  const [expanded, setExpanded] = React.useState(false);
  React.useEffect(() => { setExpanded(false); }, [data.name]);

  const logo = <img src="claude-code-logo.png" width="12" style={{ imageRendering: "pixelated", marginRight: "4px", verticalAlign: "middle" }} />;
  const truncated = data.desc.length > 60 ? data.desc.slice(0, 57) + "..." : data.desc;

  return (
    <div style={{ position: "relative" }}>
      <div className="clickable" style={{ ...s.label, cursor: "pointer", marginBottom: "4px" }} onClick={refresh}>LEARN CLAUDE</div>
      <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "SF Mono, Menlo, monospace", color: "#c4a5f7", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {logo}{data.name}
        {data.args ? <span style={{ fontWeight: 400, color: "rgba(196,165,247,0.6)" }}> {data.args}</span> : null}
      </div>
      <div onClick={() => setExpanded(e => !e)} style={{ fontSize: "11px", fontFamily: "SF Mono, Menlo, monospace", color: "rgba(255,255,255,0.55)", wordWrap: "break-word", whiteSpace: "pre-wrap", lineHeight: "1.35", cursor: "pointer" }}>{truncated}</div>
      {expanded && (
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
        }}>{data.desc}</div>
      )}
    </div>
  );
};

widgets.push({ key: "claudecommands", order: -2, ttl: 86400, cmd: _claudeCommandsCmd, Component: ClaudeCommands });
