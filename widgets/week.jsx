const _weekCmd = `date +%s`;

const _weekS = {
  header: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" },
  month: { fontSize: "11px", fontWeight: 700, color: "#ff453a", letterSpacing: "0.5px", cursor: "pointer", flexShrink: 0 },
  bar: { flex: 1, height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.08)", position: "relative", overflow: "hidden" },
  barFill: { position: "absolute", right: 0, top: 0, bottom: 0, background: "#ff453a", borderRadius: "2px", transition: "width 0.3s ease-out" },
  minsLeft: { fontSize: "10px", fontWeight: 600, color: "#ff453a", fontVariantNumeric: "tabular-nums", flexShrink: 0 },
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
  const [expanded, setExpanded] = React.useState(false);

  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);

  const weekDays = (offsetWeeks) => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offsetWeeks * 7 + i);
    return d;
  });
  const days = weekDays(0);
  const futureWeeks = expanded ? [1, 2, 3].map(weekDays) : [];

  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const monthName = now.toLocaleString("en-US", { month: "long" }).toUpperCase();
  const todayStr = now.toDateString();

  const WORK_START = 9 * 60;
  const WORK_END = now.getDay() === 3 ? 16 * 60 : 18 * 60;
  const mins = now.getHours() * 60 + now.getMinutes();
  const todayIsOffDay = now.getDay() === 0 || now.getDay() === 6;
  const remaining = Math.max(0, Math.min(1, (WORK_END - mins) / (WORK_END - WORK_START)));
  const minsLeft = Math.max(0, WORK_END - mins);
  const tooltip = todayIsOffDay
    ? "weekend"
    : mins < WORK_START
    ? `starts in ${Math.floor((WORK_START - mins) / 60)}h ${(WORK_START - mins) % 60}m`
    : mins >= WORK_END
    ? "done"
    : `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m left`;

  return (
    <div style={{ cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
      <div style={_weekS.header}>
        <div style={_weekS.month} onClick={(e) => { e.stopPropagation(); refresh(); }}>{monthName}</div>
        {!todayIsOffDay && (
          <div style={_weekS.bar} title={tooltip}>
            <div style={{ ..._weekS.barFill, width: `${remaining * 100}%` }} />
          </div>
        )}
        {!todayIsOffDay && minsLeft > 0 && minsLeft < 60 && (
          <div style={_weekS.minsLeft}>{minsLeft}m</div>
        )}
      </div>
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
      <div>
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
        {futureWeeks.map((week, wi) => (
          <div key={wi} style={_weekS.row}>
            {week.map((d, i) => {
              const isWeekend = i >= 5;
              return (
                <div key={i} style={_weekS.cell}>
                  <span style={{
                    ..._weekS.date,
                    ...(isWeekend ? _weekS.dateDim : null),
                  }}>{d.getDate()}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

widgets.push({ key: "week", order: 1.5, ttl: 0, cmd: _weekCmd, Component: Week });
