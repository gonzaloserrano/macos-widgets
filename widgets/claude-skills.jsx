const _claudeSkillsCmd = `python3 -c "
import os, random, json, re, glob

items = []
home = os.path.expanduser('~')
skills_dir = os.path.join(home, '.claude/skills')

def parse_frontmatter(path):
    try:
        with open(path) as f:
            text = f.read()
        m = re.match(r'^---\\n(.*?)\\n---', text, re.DOTALL)
        if not m: return None
        fm = {}
        for line in m.group(1).split('\\n'):
            if ':' in line:
                k, v = line.split(':', 1)
                fm[k.strip()] = v.strip()
        return fm
    except: return None

for p in glob.glob(os.path.join(skills_dir, '*/SKILL.md')):
    fm = parse_frontmatter(p)
    if fm and 'name' in fm:
        parent = os.path.dirname(p)
        official = not os.path.islink(parent) and 'author' not in fm
        items.append({'name': fm['name'], 'desc': fm.get('description',''), 'official': official})

plugins_dir = os.path.join(home, '.claude/plugins/marketplaces')
seen = set()
if os.path.isdir(plugins_dir):
    for entry in os.listdir(plugins_dir):
        if entry.startswith('temp_') or re.search(r' \\d+$', entry):
            continue
        edir = os.path.join(plugins_dir, entry)
        if not os.path.isdir(edir):
            continue
        for root, dirs, files in os.walk(edir):
          for p in [os.path.join(root, f) for f in files if f == 'SKILL.md']:
            fm = parse_frontmatter(p)
            if fm and 'name' in fm:
                key = entry + ':' + fm['name']
                if key in seen:
                    continue
                seen.add(key)
                items.append({'name': key, 'desc': fm.get('description',''), 'official': True})

if items:
    print(json.dumps(random.choice(items)))
else:
    print('{}')
"`;

const ClaudeSkills = ({ output, refresh }) => {
  let data;
  try { data = JSON.parse(output); } catch { return <div style={s.empty}>unavailable</div>; }
  if (!data.name) return <div style={s.empty}>Nothing found</div>;

  const [expanded, setExpanded] = React.useState(false);
  React.useEffect(() => { setExpanded(false); }, [data.name]);

  const logo = data.official
    ? <img src="claude-code-logo.png" width="12" style={{ imageRendering: "pixelated", marginRight: "4px", verticalAlign: "middle" }} />
    : null;

  const truncated = data.desc.length > 60 ? data.desc.slice(0, 57) + "..." : data.desc;

  return (
    <div style={{ position: "relative" }}>
      <div className="clickable" style={{ ...s.label, cursor: "pointer", marginBottom: "4px" }} onClick={refresh}>LEARN CLAUDE</div>
      {data.name.includes(':') ? (
        <div style={{ marginBottom: "4px" }}>
          <div style={{ fontSize: "10px", fontFamily: "SF Mono, Menlo, monospace", color: "rgba(196,165,247,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{logo}{data.name.split(':')[0]}</div>
          <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "SF Mono, Menlo, monospace", color: "#c4a5f7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>/{data.name.split(':')[1]}</div>
        </div>
      ) : (
        <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "SF Mono, Menlo, monospace", color: "#c4a5f7", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{logo}/{data.name}</div>
      )}
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

widgets.push({ key: "claudeskills", order: -2, ttl: 60, cmd: _claudeSkillsCmd, Component: ClaudeSkills });
