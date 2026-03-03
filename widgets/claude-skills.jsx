const _claudeSkillsCmd = `python3 -c "
import os, random, json, re, glob

skills = []
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
        skills.append({'name': fm['name'], 'desc': fm.get('description',''), 'official': official})

if skills:
    s = random.choice(skills)
    if len(s['desc']) > 60: s['desc'] = s['desc'][:57] + '...'
    print(json.dumps(s))
else:
    print('{}')
"`;

const ClaudeSkills = ({ output, refresh }) => {
  let data;
  try { data = JSON.parse(output); } catch { return <div style={s.empty}>skills unavailable</div>; }
  if (!data.name) return <div style={s.empty}>No skills found</div>;

  const logo = data.official
    ? <img src="claude-code-logo.png" width="12" style={{ imageRendering: "pixelated", marginRight: "4px", verticalAlign: "middle" }} />
    : null;

  return (
    <div>
      <div className="clickable" style={{ ...s.label, cursor: "pointer", marginBottom: "4px" }} onClick={refresh}>CLAUDE SKILL</div>
      <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "SF Mono, Menlo, monospace", color: "#c4a5f7", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{logo}/{data.name}</div>
      <div style={{ fontSize: "11px", fontFamily: "SF Mono, Menlo, monospace", color: "rgba(255,255,255,0.55)", wordWrap: "break-word", whiteSpace: "pre-wrap", lineHeight: "1.35" }}>{data.desc}</div>
    </div>
  );
};

widgets.push({ key: "claudeskills", order: -2, ttl: 60, cmd: _claudeSkillsCmd, Component: ClaudeSkills });
