import { React, run } from 'uebersicht'
// --- GENERATED FILE — do not edit. Edit widgets-right/*.jsx instead. ---

const widgets = [];

// {{WIDGETS}}

widgets.sort((a, b) => a.order - b.order);

const SEP = "---SEP---";

const wrapCmd = (w) => {
  if (!w.ttl) return w.cmd;
  const f = `/tmp/ub_${w.key}`;
  return `if [ -f "${f}" ] && [ $(($(date +%s) - $(stat -f%m "${f}"))) -lt ${w.ttl} ]; then cat "${f}"; else (${w.cmd}) | tee "${f}"; fi`;
};

export const command = widgets.map(w => wrapCmd(w)).join(`; echo "${SEP}"; `);

export const refreshFrequency = 5 * 1000;

export const className = `
  bottom: 12px;
  right: 9px;
  position: fixed;
  z-index: 1;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
  * { margin: 0; padding: 0; box-sizing: border-box; }
  a:hover, .clickable:hover { color: #6eb5ff !important; }
  a:hover span, .clickable:hover span { color: #6eb5ff !important; }
`;

const WidgetCard = ({ widget, output }) => {
  const [override, setOverride] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const refresh = () => {
    setLoading(true);
    run(`rm -f /tmp/ub_${widget.key}`).then(() =>
      run(widget.cmd).then((out) => { setOverride(out.trim()); setLoading(false); })
    );
  };

  return (
    <div style={{ ...s.card, opacity: loading ? 0.4 : 1, transition: "opacity 0.15s" }}>
      <widget.Component output={override || output} refresh={refresh} />
    </div>
  );
};

export const render = ({ output }) => {
  const parts = (output || "").split(SEP);

  return (
    <div style={s.stack}>
      <div
        className="clickable"
        style={s.refresh}
        onClick={() => run(`osascript -e 'tell application "Übersicht" to refresh'`)}
      >
        ↻
      </div>
      {widgets.map((w, i) => (
        <WidgetCard key={w.key} widget={w} output={(parts[i] || "").trim()} />
      ))}
    </div>
  );
};

const s = {
  stack: { display: "flex", flexDirection: "column", gap: "8px", width: "186px", position: "relative" },
  refresh: { position: "absolute", top: "-18px", right: "0", fontSize: "14px", color: "rgba(255,255,255,0.3)", cursor: "pointer" },
  card: {
    background: "rgba(30, 30, 30, 0.85)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderRadius: "12px",
    padding: "12px 14px",
    color: "#fff",
    boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  label: { fontSize: "10px", fontWeight: 600, letterSpacing: "0.8px", color: "rgba(255,255,255,0.45)", marginBottom: "6px" },
  pre: { fontSize: "12px", lineHeight: "1.4", whiteSpace: "pre-wrap", wordWrap: "break-word", fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif", color: "rgba(255,255,255,0.85)", maxHeight: "200px", overflow: "hidden" },
  empty: { fontSize: "13px", color: "rgba(255,255,255,0.5)", wordBreak: "break-all" },
};
