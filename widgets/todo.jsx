const _todoCmd = `cat ~/TODO.txt 2>/dev/null || echo ""`;

const todoFontSize = (line) => {
  const len = line.length;
  if (len <= 10) return "22px";
  if (len <= 20) return "18px";
  if (len <= 30) return "16px";
  return "15px";
};

const Todo = ({ output, refresh }) => {
  const text = (output || "").trim();
  if (!text) return <div style={s.empty}>No TODOs</div>;
  const lines = text.split("\n").filter(l => l.trim());
  const firstLine = lines[0];
  const count = lines.length;
  return (
    <div>
      <div className="clickable" style={{ ...s.label, cursor: "pointer" }} onClick={refresh}>TODO{count > 1 ? ` (${count})` : ""}</div>
      <pre className="clickable" style={{ ...s.pre, fontSize: todoFontSize(firstLine), cursor: "pointer" }} onClick={() => run("open ~/TODO.txt")}>{firstLine}</pre>
    </div>
  );
};

widgets.push({ key: "todo", order: 3.5, ttl: 60, cmd: _todoCmd, Component: Todo });
