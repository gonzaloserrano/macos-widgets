const _meetingCmd = `/opt/homebrew/bin/gog calendar events --from="$(date -v-5M -u +%Y-%m-%dT%H:%M:%SZ)" --days=2 --max=6 --json --no-input --account work 2>&1`;

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

const getMeetingLink = (event) => {
  if (event.hangoutLink) return event.hangoutLink;
  const video = event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === "video");
  if (video?.uri) return video.uri;
  return null;
};

const MeetingLinkIcon = ({ event }) => {
  const link = getMeetingLink(event);
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

const NextMeeting = ({ output, refresh }) => {
  let data;
  try {
    data = JSON.parse(output);
  } catch {
    return <div style={s.empty}>{output || "Calendar unavailable"}</div>;
  }

  const now = new Date();
  const GRACE_MS = 5 * 60 * 1000;
  const events = (data.events || []).filter((e) => {
    const start = e.start?.dateTime || e.start?.date;
    return start && new Date(start) > new Date(now.getTime() - GRACE_MS);
  });

  const todayDone = { ...s.title, color: "rgba(255,255,255,0.85)" };

  if (events.length === 0) {
    return (
      <div>
        <div className="clickable" style={{ ...s.label, cursor: "pointer" }} onClick={refresh}>NEXT MEETING</div>
        <div style={todayDone}><span style={{ textDecoration: "line-through" }}>TODAY</span></div>
        <div style={s.empty}>No upcoming</div>
      </div>
    );
  }

  const next = events[0];
  const start = new Date(next.start.dateTime || next.start.date);
  const isToday = start.toDateString() === now.toDateString();
  const tr = timeRemaining(start);
  const minsToNext = (start - now) / 60000;
  const after = minsToNext < 60 && events.length > 1 ? events[1] : null;

  const urgent = minsToNext < 5;
  const wrapStyle = urgent
    ? { margin: "-12px -14px", padding: "12px 14px", border: "2px solid #ff453a", borderRadius: "12px" }
    : {};

  return (
    <div style={wrapStyle}>
      <div className="clickable" style={{ ...s.label, cursor: "pointer" }} onClick={refresh}>NEXT MEETING</div>
      {!isToday && <div style={todayDone}><span style={{ textDecoration: "line-through" }}>TODAY</span></div>}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
        <div style={{ ...s.title, marginBottom: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{next.summary}</div>
        <MeetingLinkIcon event={next} />
      </div>
      <div style={s.meta}>
        <span style={{ color: tr.color }}>{formatTime(start)}</span>
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

widgets.push({ key: "meeting", order: 3, ttl: 60, cmd: _meetingCmd, Component: NextMeeting });
