const todoCmd = `cat ~/TODO.txt 2>/dev/null || echo ""`;

const Todo = ({ output }) => {
  const text = (output || "").trim();
  if (!text) return <div style={s.empty}>No TODOs</div>;
  return (
    <div>
      <div style={s.label}>TODO</div>
      <pre style={s.pre}>{text}</pre>
    </div>
  );
};
