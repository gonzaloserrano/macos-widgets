const _calendarCmd = `/opt/homebrew/bin/gog calendar events --from="$(date -v-5M -u +%Y-%m-%dT%H:%M:%SZ)" --days=2 --max=6 --json --no-input --account work 2>&1`;

const _calS = {
  header: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" },
  month: { fontSize: "11px", fontWeight: 700, color: "#ff453a", letterSpacing: "0.5px", cursor: "pointer", flexShrink: 0 },
  bar: (() => {
    const mask = "linear-gradient(to right, #000 0, #000 calc(25% - 1px), transparent calc(25% - 1px), transparent calc(25% + 1px), #000 calc(25% + 1px), #000 calc(50% - 1px), transparent calc(50% - 1px), transparent calc(50% + 1px), #000 calc(50% + 1px), #000 calc(75% - 1px), transparent calc(75% - 1px), transparent calc(75% + 1px), #000 calc(75% + 1px), #000 100%)";
    return { flex: 1, height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.18)", position: "relative", overflow: "hidden", maskImage: mask, WebkitMaskImage: mask };
  })(),
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
  sep: { borderTop: "1px solid rgba(255,255,255,0.08)", margin: "10px 0" },
  meetingUrgent: { margin: "0 -4px", padding: "6px 4px", border: "2px solid #ff453a", borderRadius: "8px" },
};

const _formatTime = (date) =>
  date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const _timeRemaining = (start) => {
  const diffMs = start - new Date();
  if (diffMs < 0) {
    const elapsed = Math.abs(diffMs);
    const mins = Math.floor(elapsed / 60000);
    const secs = Math.floor((elapsed % 60000) / 1000);
    const text = mins > 0 ? `-${mins}m ${secs}s` : `-${secs}s`;
    return { text, color: "#ff453a" };
  }
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return { text: "now", color: "#ff453a" };
  const color = mins < 5 ? "#ff453a" : mins < 15 ? "#ff9f0a" : mins < 60 ? "#ffd60a" : "#6eb5ff";
  if (mins < 60) return { text: `in ${mins} min`, color };
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (remMins === 0) return { text: `in ${hrs}h`, color };
  return { text: `in ${hrs}h ${remMins}m`, color };
};

const _getMeetingLink = (event) => {
  if (event.hangoutLink) return event.hangoutLink;
  const video = event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === "video");
  if (video?.uri) return video.uri;
  return null;
};

const MeetingLinkIcon = ({ event }) => {
  const link = _getMeetingLink(event);
  if (!link) return null;
  const isZoom = link.includes("zoom.us");
  return (
    <span
      className="clickable"
      onClick={() => run(`open "${link}"`)}
      style={{
        fontSize: "10px", fontWeight: 700, cursor: "pointer",
        color: isZoom ? "#2d8cff" : "#00ac47",
        padding: "1px 4px", borderRadius: "3px",
        border: `1px solid ${isZoom ? "#2d8cff" : "#00ac47"}`,
        lineHeight: "1.2", flexShrink: 0,
      }}
    >
      {isZoom ? "Z" : "M"}
    </span>
  );
};

const NextMeetingBlock = ({ output }) => {
  let data;
  try {
    data = JSON.parse(output);
  } catch {
    return <div style={s.empty}>{output || "Calendar unavailable"}</div>;
  }

  const now = new Date();
  const GRACE_MS = 5 * 60 * 1000;
  const allOthersDeclined = (e) => {
    const others = (e.attendees || []).filter((a) => !a.self && !a.resource);
    return others.length > 0 && others.every((a) => a.responseStatus === "declined");
  };
  const events = (data.events || []).filter((e) => {
    const start = e.start?.dateTime || e.start?.date;
    if (!start || new Date(start) <= new Date(now.getTime() - GRACE_MS)) return false;
    return !allOthersDeclined(e);
  });

  const todayDone = { ...s.title, color: "rgba(255,255,255,0.85)" };

  if (events.length === 0) {
    return (
      <div>
        <div style={todayDone}><span style={{ textDecoration: "line-through" }}>TODAY</span></div>
        <div style={s.empty}>No upcoming</div>
      </div>
    );
  }

  const next = events[0];
  const start = new Date(next.start.dateTime || next.start.date);
  const isToday = start.toDateString() === now.toDateString();
  const tr = _timeRemaining(start);
  const minsToNext = (start - now) / 60000;
  const after = minsToNext < 60 && events.length > 1 ? events[1] : null;
  const urgent = minsToNext < 5;

  return (
    <div style={urgent ? _calS.meetingUrgent : null}>
      {!isToday && <div style={todayDone}><span style={{ textDecoration: "line-through" }}>TODAY</span></div>}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
        <div style={{ ...s.title, marginBottom: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{next.summary}</div>
        <MeetingLinkIcon event={next} />
      </div>
      <div style={s.meta}>
        <span style={{ color: tr.color }}>{_formatTime(start)}</span>
        <span style={s.dot}>&middot;</span>
        <span style={{ ...s.remaining, color: tr.color }}>{tr.text}</span>
      </div>
      {after && (
        <div style={s.meta}>
          <span style={s.afterLabel}>{_formatTime(new Date(after.start.dateTime || after.start.date))}</span>
          <span style={s.dot}>&middot;</span>
          <span style={s.afterTitle}>{after.summary}</span>
        </div>
      )}
    </div>
  );
};

const Calendar = ({ output, refresh }) => {
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
    <div>
      <div style={{ cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
        <div style={_calS.header}>
          <div style={_calS.month} onClick={(e) => { e.stopPropagation(); refresh(); }}>{monthName}</div>
          {!todayIsOffDay && (
            <div style={_calS.bar} title={tooltip}>
              <div style={{ ..._calS.barFill, width: `${remaining * 100}%` }} />
            </div>
          )}
          {!todayIsOffDay && minsLeft > 0 && minsLeft < 60 && (
            <div style={_calS.minsLeft}>{minsLeft}m</div>
          )}
        </div>
        <div style={_calS.row}>
          {labels.map((lab, i) => {
            const isToday = days[i].toDateString() === todayStr;
            return (
              <div key={i} style={_calS.cell}>
                <span style={{
                  ..._calS.label,
                  ...(i >= 5 && !isToday ? _calS.labelDim : null),
                  ...(isToday ? _calS.today : null),
                }}>{lab}</span>
              </div>
            );
          })}
        </div>
        <div>
          <div style={_calS.row}>
            {days.map((d, i) => {
              const isToday = d.toDateString() === todayStr;
              const isWeekend = i >= 5;
              return (
                <div key={i} style={_calS.cell}>
                  <span style={{
                    ..._calS.date,
                    ...(isWeekend && !isToday ? _calS.dateDim : null),
                    ...(isToday ? _calS.today : null),
                  }}>{d.getDate()}</span>
                </div>
              );
            })}
          </div>
          {futureWeeks.map((week, wi) => (
            <div key={wi} style={_calS.row}>
              {week.map((d, i) => {
                const isWeekend = i >= 5;
                return (
                  <div key={i} style={_calS.cell}>
                    <span style={{
                      ..._calS.date,
                      ...(isWeekend ? _calS.dateDim : null),
                    }}>{d.getDate()}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={_calS.sep} />
      <NextMeetingBlock output={output} />
    </div>
  );
};

widgets.push({ key: "calendar", order: 1.5, ttl: 30, cmd: _calendarCmd, Component: Calendar });
