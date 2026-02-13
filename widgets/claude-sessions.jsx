const claudeSessionsCmd = `osascript -l JavaScript -e '
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
' 2>/dev/null || echo '[]'`;

const ClaudeSessions = ({ output }) => {
  let sessions;
  try {
    sessions = JSON.parse(output);
  } catch {
    return <div style={s.empty}>Ghostty unavailable</div>;
  }
  if (!sessions.length) return <div style={s.empty}>No Claude sessions</div>;
  return (
    <div>
      <div
        style={{ ...s.label, cursor: "pointer" }}
        onClick={() => run(`osascript -e 'tell application "Ghostty" to activate'`)}
      >
        CLAUDE CODE ({sessions.length})
      </div>
      {sessions.map((sess, i) => (
        <div
          key={i}
          className="clickable"
          style={s.ccRow}
          onClick={() => run(`osascript -e 'tell application "Ghostty" to activate' -e 'tell application "System Events" to click radio button ${sess.idx} of tab group 1 of first window of process "ghostty"'`)}
        >
          <span style={s.ccName}>{sess.name}</span>
        </div>
      ))}
    </div>
  );
};
