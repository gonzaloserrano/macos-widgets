const _tzCmd = `date -u +%s`;

const zones = [
  { label: "PST", tz: "America/Los_Angeles" },
  { label: "CST", tz: "America/Chicago" },
  { label: "EST", tz: "America/New_York" },
  { label: "UTC", tz: "UTC" },
  { label: "CET", tz: "Europe/Berlin", local: true },
  { label: "IST", tz: "Asia/Kolkata" },
];

const Timezones = ({ output, refresh }) => {
  const now = new Date();
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? zones : zones.slice(-2);

  // Spread label / time / day across the full card width so the row scales with the
  // column instead of the time cell stretching and stranding the day at the far edge.
  const rowStyle = { ...s.row, justifyContent: "space-between" };

  return (
    <div>
      <div className="clickable" style={{ ...s.label, cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>TEAM TIMEZONES</div>
      {visible.map((z) => {
        const time = now.toLocaleTimeString("en-GB", {
          timeZone: z.tz,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const day = now.toLocaleDateString("en-US", {
          timeZone: z.tz,
          weekday: "short",
        });
        return (
          <div key={z.label} style={z.local ? { ...rowStyle, ...s.localRow } : rowStyle}>
            <span style={s.tzLabel}>{z.label}</span>
            <span style={s.tzTime}>{time}</span>
            <span style={s.tzDay}>{day}</span>
          </div>
        );
      })}
    </div>
  );
};

widgets.push({ key: "tz", order: 1, ttl: 0, cmd: _tzCmd, Component: Timezones });
