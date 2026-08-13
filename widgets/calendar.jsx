// The grid is centred on today (3 days back, 3 ahead), so the fetch window has
// to match it. --days=N is not usable here: it means "next N days from now" and
// silently overrides --from. --to is exclusive at midnight, hence +4d for +3 days.
const _calendarCmd = `/opt/homebrew/bin/gog calendar events --from=$(/bin/date -v-3d +%F) --to=$(/bin/date -v+4d +%F) --max=100 --json --no-input --account work 2>&1`;

const _calS = {
  // The month sits in a rotated column beside the grid instead of owning a header
  // row of its own. Short name so it never outgrows the grid it labels.
  grid: { display: "flex", alignItems: "center", gap: "5px" },
  month: {
    writingMode: "vertical-rl",
    WebkitWritingMode: "vertical-rl",
    transform: "rotate(180deg)",
    fontSize: "10px",
    fontWeight: 700,
    color: "#ff453a",
    letterSpacing: "1px",
    cursor: "pointer",
    flexShrink: 0,
  },
  // The workday bar doubles as the separator, so it costs no vertical space of its own.
  barRow: { display: "flex", alignItems: "center", gap: "6px", margin: "8px 0" },
  bar: (() => {
    const mask = "linear-gradient(to right, #000 0, #000 calc(25% - 1px), transparent calc(25% - 1px), transparent calc(25% + 1px), #000 calc(25% + 1px), #000 calc(50% - 1px), transparent calc(50% - 1px), transparent calc(50% + 1px), #000 calc(50% + 1px), #000 calc(75% - 1px), transparent calc(75% - 1px), transparent calc(75% + 1px), #000 calc(75% + 1px), #000 100%)";
    return { flex: 1, height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.18)", position: "relative", overflow: "hidden", maskImage: mask, WebkitMaskImage: mask };
  })(),
  barFill: { position: "absolute", right: 0, top: 0, bottom: 0, background: "#ff453a", borderRadius: "2px", transition: "width 0.3s ease-out" },
  // Painted after the fill so a meeting stays visible over the red remainder.
  // minWidth keeps a 15-minute call from collapsing to nothing on a ~130px bar.
  barMeeting: { position: "absolute", top: 0, bottom: 0, minWidth: "2px", background: "#40e0d0", borderRadius: "1px" },
  barMeetingPast: { background: "#156e66" },
  minsLeft: { fontSize: "10px", fontWeight: 600, color: "#ff453a", fontVariantNumeric: "tabular-nums", flexShrink: 0 },
  row: { display: "flex", marginBottom: "1px" },
  labelCell: { flex: 1, display: "flex", justifyContent: "center", alignItems: "center", height: "12px" },
  dayCell: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "28px" },
  dayCellPlain: { flex: 1, display: "flex", justifyContent: "center", alignItems: "center", height: "18px" },
  count: { fontSize: "9px", fontWeight: 600, lineHeight: "10px", color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" },
  countFree: { color: "rgba(255,255,255,0.18)" },
  label: { fontSize: "10px", fontWeight: 600, lineHeight: "12px", color: "rgba(255,255,255,0.85)", fontVariantNumeric: "tabular-nums" },
  labelDim: { color: "rgba(255,255,255,0.35)" },
  date: {
    display: "inline-block",
    width: "18px",
    height: "18px",
    lineHeight: "18px",
    textAlign: "center",
    fontSize: "11px",
    fontWeight: 600,
    color: "rgba(255,255,255,0.95)",
    borderRadius: "50%",
    fontVariantNumeric: "tabular-nums",
  },
  dateDim: { color: "rgba(255,255,255,0.35)" },
  today: { color: "#ff453a" },
  sep: { borderTop: "1px solid rgba(255,255,255,0.08)", margin: "8px 0" },
  // Greyed title is the only cue that the next meeting is not today.
  laterTitle: { color: "rgba(255,255,255,0.5)" },
  meetingSoon: { margin: "0 -4px", padding: "6px 4px", border: "2px solid #ff9f0a", borderRadius: "8px" },
  meetingUrgent: { margin: "0 -4px", padding: "6px 4px", border: "2px solid #ff453a", borderRadius: "8px" },
  meetingImminent: { margin: "0 -4px", padding: "6px 4px", border: "2px solid #ff453a", borderRadius: "8px", animation: "urgentPulse 1.4s ease-out infinite" },
};

const _formatTime = (date) =>
  date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// All-day events carry start.date ("2026-07-27"), which new Date() would read as
// UTC midnight and land on the previous day west of Greenwich. Build those locally.
const _startDate = (event) => {
  const dt = event.start?.dateTime;
  if (dt) return new Date(dt);
  const d = event.start?.date;
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
};

// Recurring self-blockers rather than meetings: they show up almost every weekday,
// so they inflate the per-day counts and would hijack the next-meeting slot. OOO is
// matched as a whole word so it can't hit a title that merely contains those letters.
const _NOISE = [/please ask before scheduling/i, /\booo\b/i, /lunch/i];
const _isNoise = (event) => _NOISE.some((re) => re.test(event.summary || ""));

// Keyed by toDateString() so lookups work off the same Date objects the grid builds.
const _countByDay = (events) => {
  const counts = {};
  for (const e of events) {
    const start = _startDate(e);
    if (start) counts[start.toDateString()] = (counts[start.toDateString()] || 0) + 1;
  }
  return counts;
};

// Where today's timed meetings sit on the workday bar, as left/width percentages.
// All-day events are skipped: they carry no dateTime and would paint the whole bar.
// Meetings outside 9-18h are dropped, ones that straddle an edge are clipped to it.
const _meetingMarks = (events, todayStr, startMin, endMin, nowMin) => {
  if (!events) return [];
  const span = endMin - startMin;
  const marks = [];
  for (const e of events) {
    if (!e.start?.dateTime) continue;
    const start = new Date(e.start.dateTime);
    if (start.toDateString() !== todayStr) continue;
    const from = start.getHours() * 60 + start.getMinutes();
    const end = e.end?.dateTime ? new Date(e.end.dateTime) : null;
    // No end time means an unbounded event; assume the usual half hour.
    const to = end && end.toDateString() === todayStr
      ? end.getHours() * 60 + end.getMinutes()
      : from + 30;
    const left = Math.max(0, Math.min(1, (from - startMin) / span));
    const right = Math.max(0, Math.min(1, (to - startMin) / span));
    if (right <= 0 || left >= 1 || right <= left) continue;
    marks.push({
      left: left * 100,
      width: (right - left) * 100,
      past: to <= nowMin,
      title: `${_formatTime(start)} ${e.summary || ""}`.trim(),
    });
  }
  return marks;
};

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

const NextMeetingBlock = ({ allEvents, output }) => {
  if (!allEvents) return <div style={s.empty}>{output || "Calendar unavailable"}</div>;

  const now = new Date();
  const GRACE_MS = 5 * 60 * 1000;
  const allOthersDeclined = (e) => {
    const others = (e.attendees || []).filter((a) => !a.self && !a.resource);
    return others.length > 0 && others.every((a) => a.responseStatus === "declined");
  };
  // The window now starts 3 days in the past, so drop what already happened and
  // sort rather than trusting the API order to put the next meeting first.
  const events = allEvents
    .filter((e) => {
      const start = _startDate(e);
      if (!start || start <= new Date(now.getTime() - GRACE_MS)) return false;
      return !allOthersDeclined(e);
    })
    .sort((a, b) => _startDate(a) - _startDate(b));

  if (events.length === 0) return <div style={s.empty}>No upcoming</div>;

  const next = events[0];
  const start = _startDate(next);
  const isToday = start.toDateString() === now.toDateString();
  const tr = _timeRemaining(start);
  const minsToNext = (start - now) / 60000;
  const after = minsToNext < 60 && events.length > 1 ? events[1] : null;
  const imminent = minsToNext < 2;
  const urgent = minsToNext < 5;
  const soon = minsToNext < 15;
  const wrapStyle = imminent ? _calS.meetingImminent : urgent ? _calS.meetingUrgent : soon ? _calS.meetingSoon : null;

  return (
    <div style={wrapStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
        <div style={{
          ...s.title, marginBottom: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          ...(isToday ? null : _calS.laterTitle),
        }}>{next.summary}</div>
        <MeetingLinkIcon event={next} />
      </div>
      <div style={s.meta}>
        <span style={{ color: tr.color }}>{_formatTime(start)}</span>
        <span style={s.dot}>&middot;</span>
        <span style={{ ...s.remaining, color: tr.color }}>{tr.text}</span>
      </div>
      {after && (
        <div style={s.meta}>
          <span style={s.afterLabel}>{_formatTime(_startDate(after))}</span>
          <span style={s.dot}>&middot;</span>
          <span style={s.afterTitle}>{after.summary}</span>
        </div>
      )}
    </div>
  );
};

// count === null means "outside the fetched window", so no number is shown at all;
// 0 renders as a faint dot so a free day still reads as data, not as missing data.
const DayCell = ({ date, count, isToday }) => {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  return (
    <div style={count === null ? _calS.dayCellPlain : _calS.dayCell}>
      <span style={{
        ..._calS.date,
        ...(isWeekend && !isToday ? _calS.dateDim : null),
        ...(isToday ? _calS.today : null),
      }}>{date.getDate()}</span>
      {count !== null && (
        <span style={{
          ..._calS.count,
          ...(count === 0 ? _calS.countFree : null),
          ...(isToday ? _calS.today : null),
        }}>{count === 0 ? "·" : count}</span>
      )}
    </div>
  );
};

const Calendar = ({ output, refresh }) => {
  const [expanded, setExpanded] = React.useState(false);

  const now = new Date();

  // Rolling window instead of a Mon-Sun week: today sits in the middle column,
  // with 3 days of context on each side. Rows below step by 7 so every column
  // keeps the same weekday as the header letters.
  const weekFrom = (offsetDays) => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + offsetDays + i);
    return d;
  });
  const days = weekFrom(-3);
  const futureWeeks = expanded ? [4, 11, 18].map(weekFrom) : [];

  let data = null;
  try {
    data = JSON.parse(output);
  } catch {}
  // One filter point, so the counts and the next-meeting block never disagree.
  const events = data ? (data.events || []).filter((e) => !_isNoise(e)) : null;
  // Only the centred row gets counts; the expanded rows fall outside the fetch window.
  const counts = events ? _countByDay(events) : null;

  const dayLetters = ["S", "M", "T", "W", "T", "F", "S"];
  const monthName = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
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
  const marks = _meetingMarks(events, todayStr, WORK_START, WORK_END, mins);

  return (
    <div>
      <div style={_calS.grid} onClick={() => setExpanded(e => !e)}>
        <div style={_calS.month} onClick={(e) => { e.stopPropagation(); refresh(); }}>{monthName}</div>
        <div style={{ flex: 1, cursor: "pointer" }}>
          <div style={_calS.row}>
            {days.map((d, i) => {
              const isToday = d.toDateString() === todayStr;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div key={i} style={_calS.labelCell}>
                  <span style={{
                    ..._calS.label,
                    ...(isWeekend && !isToday ? _calS.labelDim : null),
                    ...(isToday ? _calS.today : null),
                  }}>{dayLetters[d.getDay()]}</span>
                </div>
              );
            })}
          </div>
          <div style={_calS.row}>
            {days.map((d, i) => (
              <DayCell
                key={i}
                date={d}
                isToday={d.toDateString() === todayStr}
                count={counts ? counts[d.toDateString()] || 0 : null}
              />
            ))}
          </div>
          {futureWeeks.map((week, wi) => (
            <div key={wi} style={_calS.row}>
              {week.map((d, i) => (
                <DayCell key={i} date={d} isToday={false} count={null} />
              ))}
            </div>
          ))}
        </div>
      </div>
      {todayIsOffDay ? (
        <div style={_calS.sep} />
      ) : (
        <div style={_calS.barRow}>
          <div style={_calS.bar} title={tooltip}>
            <div style={{ ..._calS.barFill, width: `${remaining * 100}%` }} />
            {marks.map((m, i) => (
              <div key={i} title={m.title} style={{ ..._calS.barMeeting, ...(m.past ? _calS.barMeetingPast : null), left: `${m.left}%`, width: `${m.width}%` }} />
            ))}
          </div>
          {minsLeft > 0 && minsLeft < 60 && <div style={_calS.minsLeft}>{minsLeft}m</div>}
        </div>
      )}
      <NextMeetingBlock allEvents={events} output={output} />
    </div>
  );
};

widgets.push({ key: "calendar", order: 1.5, ttl: 30, cmd: _calendarCmd, Component: Calendar });
