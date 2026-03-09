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
        desc = fm.get('description','')
        if len(desc) > 60: desc = desc[:57] + '...'
        items.append({'type': 'skill', 'name': fm['name'], 'desc': desc, 'official': official})

shortcuts = [
    ('Ctrl+S', 'Stash current prompt'),
    ('Ctrl+G', 'Open prompt in external editor'),
    ('Shift+Tab', 'Cycle permission modes'),
    ('Ctrl+R', 'Reverse search history'),
    ('Esc Esc', 'Rewind/summarize conversation'),
    ('Option+P', 'Switch model'),
    ('Option+T', 'Toggle extended thinking'),
    ('Ctrl+B', 'Background running tasks'),
    ('Ctrl+L', 'Clear terminal screen'),
    ('Ctrl+O', 'Toggle verbose output'),
    ('Ctrl+V', 'Paste image from clipboard'),
    ('Ctrl+T', 'Toggle task list'),
    ('Backslash+Enter', 'Multiline input'),
]
for key, desc in shortcuts:
    items.append({'type': 'shortcut', 'key': key, 'desc': desc})

tips = [
    ('/compact', 'Compact conversation to free context'),
    ('/clear', 'Clear history and start fresh'),
    ('/context', 'Visualize context usage as grid'),
    ('/cost', 'Show token usage stats'),
    ('/diff', 'Interactive diff viewer (git + per-turn)'),
    ('/fork', 'Branch conversation to explore alternatives'),
    ('/rewind', 'Rewind to a previous checkpoint'),
    ('/resume', 'Resume a previous session by ID/name'),
    ('/model', 'Select or change AI model'),
    ('/plan', 'Enter plan mode'),
    ('/fast', 'Toggle fast mode (same model, faster)'),
    ('/tasks', 'List and manage background tasks'),
    ('/memory', 'Edit CLAUDE.md and auto-memory'),
    ('/hooks', 'Manage hook configurations'),
    ('/mcp', 'Manage MCP server connections'),
    ('/permissions', 'View and update tool permissions'),
    ('/init', 'Initialize project CLAUDE.md'),
    ('/review', 'Review a PR for quality and security'),
    ('/copy', 'Copy last response or pick code block'),
    ('/export', 'Export conversation as plain text'),
    ('/stats', 'Daily usage, streaks, model prefs'),
    ('/desktop', 'Continue session in Desktop app'),
    ('/loop', 'Run a command on a recurring interval'),
    ('! command', 'Run shell command directly'),
    ('@ path', 'File path autocomplete'),
    ('Tab', 'Accept suggested follow-up prompt'),
    ('claude -p', 'Print mode: non-interactive, exits'),
    ('claude -c', 'Continue most recent conversation'),
    ('claude -w', 'Start in isolated git worktree'),
    ('cat f | claude -p', 'Pipe content to Claude'),
    ('--max-turns N', 'Limit agentic turns in print mode'),
    ('--teleport', 'Pull a web session into terminal'),
]
for key, desc in tips:
    items.append({'type': 'tip', 'key': key, 'desc': desc})

if items:
    print(json.dumps(random.choice(items)))
else:
    print('{}')
"`;

const ClaudeSkills = ({ output, refresh }) => {
  let data;
  try { data = JSON.parse(output); } catch { return <div style={s.empty}>unavailable</div>; }
  if (!data.type) return <div style={s.empty}>Nothing found</div>;

  if (data.type === 'shortcut' || data.type === 'tip') {
    return (
      <div>
        <div className="clickable" style={{ ...s.label, cursor: "pointer", marginBottom: "4px" }} onClick={refresh}>LEARN CLAUDE</div>
        <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "SF Mono, Menlo, monospace", color: "#c4a5f7", marginBottom: "4px" }}>{data.key}</div>
        <div style={{ fontSize: "11px", fontFamily: "SF Mono, Menlo, monospace", color: "rgba(255,255,255,0.55)", wordWrap: "break-word", whiteSpace: "pre-wrap", lineHeight: "1.35" }}>{data.desc}</div>
      </div>
    );
  }

  const logo = data.official
    ? <img src="claude-code-logo.png" width="12" style={{ imageRendering: "pixelated", marginRight: "4px", verticalAlign: "middle" }} />
    : null;

  return (
    <div>
      <div className="clickable" style={{ ...s.label, cursor: "pointer", marginBottom: "4px" }} onClick={refresh}>LEARN CLAUDE</div>
      <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "SF Mono, Menlo, monospace", color: "#c4a5f7", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{logo}/{data.name}</div>
      <div style={{ fontSize: "11px", fontFamily: "SF Mono, Menlo, monospace", color: "rgba(255,255,255,0.55)", wordWrap: "break-word", whiteSpace: "pre-wrap", lineHeight: "1.35" }}>{data.desc}</div>
    </div>
  );
};

widgets.push({ key: "claudeskills", order: -2, ttl: 60, cmd: _claudeSkillsCmd, Component: ClaudeSkills });
