const _meetingCmd = `/opt/homebrew/bin/gog calendar events --from=now --days=2 --max=5 --json --no-input --account work 2>&1`;

const formatTime = (date) =>
  date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const timeRemaining = (start) => {
  const diffMs = start - new Date();
  if (diffMs < 0) return { text: "now", color: "#ff453a" };
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return { text: "now", color: "#ff453a" };
  const color = mins < 5 ? "#ff453a" : mins < 15 ? "#ff9f0a" : mins < 60 ? "#ffd60a" : "#6eb5ff";
  if (mins < 60) return { text: `in ${mins} min`, color };
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (remMins === 0) return { text: `in ${hrs}h`, color };
  return { text: `in ${hrs}h ${remMins}m`, color };
};

const NextMeeting = ({ output }) => {
  let data;
  try {
    data = JSON.parse(output);
  } catch {
    return <div style={s.empty}>{output || "Calendar unavailable"}</div>;
  }

  const now = new Date();
  const events = (data.events || []).filter((e) => {
    const start = e.start?.dateTime || e.start?.date;
    return start && new Date(start) > now;
  });

  if (events.length === 0) {
    return <div style={s.empty}>No upcoming meetings</div>;
  }

  const next = events[0];
  const start = new Date(next.start.dateTime || next.start.date);
  const isToday = start.toDateString() === now.toDateString();
  const tr = timeRemaining(start);
  const minsToNext = (start - now) / 60000;
  const after = minsToNext < 60 && events.length > 1 ? events[1] : null;

  const todayDone = { ...s.title, color: "rgba(255,255,255,0.85)" };

  return (
    <div>
      <div style={s.label}>NEXT MEETING</div>
      {!isToday && <div style={todayDone}><span style={{ textDecoration: "line-through" }}>TODAY</span></div>}
      <div style={s.title}>{next.summary}</div>
      <div style={s.meta}>
        <span>{formatTime(start)}</span>
        <span style={s.dot}>&middot;</span>
        <span style={{ ...s.remaining, color: tr.color }}>{tr.text}</span>
      </div>
      {after && (
        <div style={s.meta}>
          <span style={s.afterLabel}>Then:</span>
          <span style={s.afterTitle}>{after.summary}</span>
        </div>
      )}
    </div>
  );
};

widgets.push({ key: "meeting", order: 6, ttl: 60, cmd: _meetingCmd, Component: NextMeeting });
