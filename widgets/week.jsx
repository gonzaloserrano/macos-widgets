const _weekCmd = `date +%s`;

const _weekS = {
  month: { fontSize: "11px", fontWeight: 700, color: "#ff453a", letterSpacing: "0.5px", marginBottom: "6px", cursor: "pointer" },
  row: { display: "flex", marginBottom: "3px" },
  cell: { flex: 1, display: "flex", justifyContent: "center", alignItems: "center", height: "20px" },
  label: { fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.85)", fontVariantNumeric: "tabular-nums" },
  labelDim: { color: "rgba(255,255,255,0.35)" },
  date: {
    display: "inline-block",
    width: "20px",
    height: "20px",
    lineHeight: "20px",
    textAlign: "center",
    fontSize: "11px",
    fontWeight: 600,
    color: "rgba(255,255,255,0.95)",
    borderRadius: "50%",
    fontVariantNumeric: "tabular-nums",
  },
  dateDim: { color: "rgba(255,255,255,0.35)" },
  today: { color: "#ff453a" },
};

const Week = ({ output, refresh }) => {
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const monthName = now.toLocaleString("en-US", { month: "long" }).toUpperCase();
  const todayStr = now.toDateString();

  return (
    <div>
      <div className="clickable" style={_weekS.month} onClick={refresh}>{monthName}</div>
      <div style={_weekS.row}>
        {labels.map((lab, i) => {
          const isToday = days[i].toDateString() === todayStr;
          return (
            <div key={i} style={_weekS.cell}>
              <span style={{
                ..._weekS.label,
                ...(i >= 5 && !isToday ? _weekS.labelDim : null),
                ...(isToday ? _weekS.today : null),
              }}>{lab}</span>
            </div>
          );
        })}
      </div>
      <div style={_weekS.row}>
        {days.map((d, i) => {
          const isToday = d.toDateString() === todayStr;
          const isWeekend = i >= 5;
          return (
            <div key={i} style={_weekS.cell}>
              <span style={{
                ..._weekS.date,
                ...(isWeekend && !isToday ? _weekS.dateDim : null),
                ...(isToday ? _weekS.today : null),
              }}>{d.getDate()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

widgets.push({ key: "week", order: 1.5, ttl: 0, cmd: _weekCmd, Component: Week });
