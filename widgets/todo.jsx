const _todoCmd = `cat ~/TODO.txt 2>/dev/null || echo ""`;

const Todo = ({ output, refresh }) => {
  const text = (output || "").trim();
  if (!text) return <div style={s.empty}>No TODOs</div>;
  return (
    <div>
      <div className="clickable" style={{ ...s.label, cursor: "pointer" }} onClick={refresh}>TODO</div>
      <pre style={s.pre}>{text}</pre>
    </div>
  );
};

widgets.push({ key: "todo", order: 5, ttl: 60, cmd: _todoCmd, Component: Todo });
