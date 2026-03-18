const _todoCmd = `cat ~/TODO.txt 2>/dev/null || echo ""`;

const todoFontSize = (text) => {
  const len = text.length;
  if (len <= 10) return "22px";
  if (len <= 20) return "18px";
  if (len <= 40) return "16px";
  if (len <= 80) return "14px";
  return "13px";
};

const Todo = ({ output, refresh }) => {
  const text = (output || "").trim();
  if (!text) return <div style={s.empty}>No TODOs</div>;
  const allLines = text.split("\n");
  const sepIdx = allLines.findIndex(l => l.trim() === "---");
  const block = (sepIdx >= 0 ? allLines.slice(0, sepIdx) : allLines.slice(0, 1))
    .filter(l => l.trim());
  const totalCount = allLines.filter(l => l.trim() && l.trim() !== "---").length;
  const blockText = block.join("\n");
  return (
    <div>
      <div className="clickable" style={{ ...s.label, cursor: "pointer" }} onClick={refresh}>TODO{totalCount > block.length ? ` (${totalCount})` : ""}</div>
      <pre className="clickable" style={{ ...s.pre, fontSize: todoFontSize(blockText), cursor: "pointer" }} onClick={() => run("open ~/TODO.txt")}>{blockText}</pre>
    </div>
  );
};

widgets.push({ key: "todo", order: 3.5, ttl: 5, cmd: _todoCmd, Component: Todo });
