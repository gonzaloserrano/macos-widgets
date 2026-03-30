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

plugins_dir = os.path.join(home, '.claude/plugins/marketplaces')
seen_skills = set()
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
                if key in seen_skills:
                    continue
                seen_skills.add(key)
                desc = fm.get('description','')
                if len(desc) > 60: desc = desc[:57] + '...'
                items.append({'type': 'skill', 'name': key, 'desc': desc, 'official': True})

builtins = [
    ('loop', 'Run a prompt or slash command on a recurring interval'),
    ('schedule', 'Create, update, list, or run scheduled remote agents'),
    ('simplify', 'Review changed code for reuse, quality, and efficiency'),
    ('update-config', 'Configure Claude Code harness via settings.json'),
    ('keybindings-help', 'Customize keyboard shortcuts and keybindings'),
]
for name, desc in builtins:
    items.append({'type': 'skill', 'name': name, 'desc': desc, 'official': True})

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

envvars = [
    ('CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=false', 'Disable ghost-text follow-up suggestions'),
    ('CLAUDE_CODE_EFFORT_LEVEL=low|med|high', 'Set reasoning effort level'),
    ('CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000', 'Max output tokens (default 32k)'),
    ('ANTHROPIC_MODEL=...', 'Override default model for session'),
    ('CLAUDE_CODE_SUBAGENT_MODEL=...', 'Override model for subagents'),
    ('CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=80', 'Context % to trigger compaction'),
    ('CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1', 'Fixed thinking budget'),
    ('CLAUDE_CODE_DISABLE_AUTO_MEMORY=1', 'Disable auto memory (MEMORY.md)'),
    ('CLAUDE_CODE_DISABLE_1M_CONTEXT=1', 'Disable 1M context window'),
    ('CLAUDE_CODE_DISABLE_FAST_MODE=1', 'Disable fast mode toggle'),
    ('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1', 'Multi-agent collaboration'),
    ('ENABLE_LSP_TOOL=1', 'Code intelligence via LSP'),
    ('CLAUDE_CODE_SIMPLE=1', 'Minimal prompt, only Bash/file tools'),
    ('CLAUDE_CODE_SHELL_PREFIX=...', 'Wrap all bash cmds (audit/log)'),
    ('CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1', 'Reset cwd after each Bash cmd'),
    ('CLAUDE_CODE_TASK_LIST_ID=...', 'Share task list across sessions'),
    ('CLAUDE_CODE_EXTRA_BODY=\\'{...}\\'', 'Merge JSON into API requests'),
    ('CLAUDE_ENV_FILE=path', 'Source shell script before each Bash'),
    ('CLAUDE_CODE_ENABLE_TELEMETRY=1', 'Enable OpenTelemetry tracing'),
    ('CLAUDECODE=1', 'Auto-set in child shells (detect Claude)'),
    ('CLAUDE_CODE_ACCESSIBILITY=1', 'No animations, screen-reader friendly'),
    ('CLAUDE_CODE_FORCE_FULL_LOGO=1', 'Show full ASCII art on startup'),
]
for key, desc in envvars:
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
        <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "SF Mono, Menlo, monospace", color: "#c4a5f7", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.key}</div>
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
      {data.name.includes(':') ? (
        <div style={{ marginBottom: "4px" }}>
          <div style={{ fontSize: "10px", fontFamily: "SF Mono, Menlo, monospace", color: "rgba(196,165,247,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{logo}{data.name.split(':')[0]}</div>
          <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "SF Mono, Menlo, monospace", color: "#c4a5f7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>/{data.name.split(':')[1]}</div>
        </div>
      ) : (
        <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "SF Mono, Menlo, monospace", color: "#c4a5f7", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{logo}/{data.name}</div>
      )}
      <div style={{ fontSize: "11px", fontFamily: "SF Mono, Menlo, monospace", color: "rgba(255,255,255,0.55)", wordWrap: "break-word", whiteSpace: "pre-wrap", lineHeight: "1.35" }}>{data.desc}</div>
    </div>
  );
};

widgets.push({ key: "claudeskills", order: -2, ttl: 60, cmd: _claudeSkillsCmd, Component: ClaudeSkills });
