const _todoCmd = `cat ~/TODO.txt 2>/dev/null || echo ""`;

const todoFontSize = (text) => {
  const lines = text.split("\n");
  const maxLen = Math.max(...lines.map(l => l.length));
  if (lines.length === 1 && maxLen <= 10) return "22px";
  if (lines.length === 1 && maxLen <= 20) return "18px";
  if (lines.length <= 3 && maxLen <= 25) return "15px";
  return "13px";
};

const Todo = ({ output, refresh }) => {
  const text = (output || "").trim();
  if (!text) return <div style={s.empty}>No TODOs</div>;
  return (
    <div>
      <div className="clickable" style={{ ...s.label, cursor: "pointer" }} onClick={refresh}>TODO</div>
      <pre className="clickable" style={{ ...s.pre, fontSize: todoFontSize(text), cursor: "pointer" }} onClick={() => run("open ~/TODO.txt")}>{text}</pre>
    </div>
  );
};

widgets.push({ key: "todo", order: 5, ttl: 60, cmd: _todoCmd, Component: Todo });
