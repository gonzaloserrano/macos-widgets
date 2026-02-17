const _claudeSessionsCmd = `osascript -l JavaScript -e '
  try {
    var se = Application("System Events");
    var ghostty = se.processes.whose({name: "ghostty"})[0];
    var w = ghostty.windows[0];
    var tabs = w.tabGroups[0].radioButtons();
    var results = [];
    for (var i = 0; i < tabs.length; i++) {
      var title = tabs[i].title();
      var first = title.charAt(0);
      var code = first.charCodeAt(0);
      if (first === "✳" || (code >= 0x2800 && code <= 0x28FF)) {
        var name = title.replace(/^.\\s*/, "");
        results.push({idx: i + 1, name: name});
      }
    }
    JSON.stringify(results);
  } catch(e) {
    JSON.stringify([]);
  }
' 2>/dev/null | python3 -c "
import json, sys, subprocess, os
data = json.load(sys.stdin)
if data:
    print(json.dumps(data))
elif subprocess.run(['pgrep', '-qx', 'ghostty']).returncode == 0:
    r = subprocess.run(['pgrep', '-x', 'claude'], capture_output=True, text=True)
    pids = [p for p in r.stdout.strip().split(chr(10)) if p]
    sessions, seen = [], set()
    for pid in pids:
        lr = subprocess.run(['lsof', '-a', '-d', 'cwd', '-Fn', '-p', pid], capture_output=True, text=True)
        for line in lr.stdout.split(chr(10)):
            if line.startswith('n/'):
                name = os.path.basename(line[1:])
                if name not in seen:
                    seen.add(name)
                    sessions.append({'idx': 0, 'name': name})
    print(json.dumps(sessions))
else:
    print('[]')
"`;

const ClaudeSessions = ({ output }) => {
  let sessions;
  try {
    sessions = JSON.parse(output);
  } catch {
    return <div style={s.empty}>Ghostty unavailable</div>;
  }
  if (!sessions.length) return <div style={s.empty}>No Claude sessions</div>;
  const logo = (
    <img src="claude-code-logo.png" width="18" style={{ display: "block", imageRendering: "pixelated" }} />
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <div
          style={{ ...s.label, cursor: "pointer", marginBottom: 0 }}
          onClick={() => run(`osascript -e 'tell application "Ghostty" to activate'`)}
        >
          CLAUDE CODE ({sessions.length})
        </div>
        {logo}
      </div>
      {sessions.map((sess, i) => (
        <div
          key={i}
          className="clickable"
          style={s.ccRow}
          onClick={() => run(sess.idx > 0
            ? `osascript -e 'tell application "Ghostty" to activate' -e 'tell application "System Events" to click radio button ${sess.idx} of tab group 1 of first window of process "ghostty"'`
            : `osascript -e 'tell application "Ghostty" to activate'`
          )}
        >
          <span style={s.ccName}>{sess.name}</span>
        </div>
      ))}
    </div>
  );
};

widgets.push({ key: "claude", order: 3, ttl: 10, cmd: _claudeSessionsCmd, Component: ClaudeSessions });
