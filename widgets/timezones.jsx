const _tzCmd = `date -u +%s`;

const zones = [
  { label: "PST", tz: "America/Los_Angeles" },

  { label: "EST", tz: "America/New_York" },
  { label: "UTC", tz: "UTC" },
  { label: "CET", tz: "Europe/Berlin", local: true },
  { label: "IST", tz: "Asia/Kolkata" },
];

const Timezones = ({ output, refresh }) => {
  const now = new Date();

  return (
    <div>
      <div className="clickable" style={{ ...s.label, cursor: "pointer" }} onClick={refresh}>TEAM TIMEZONES</div>
      {zones.map((z) => {
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
          <div key={z.label} style={z.local ? { ...s.row, ...s.localRow } : s.row}>
            <span style={s.tzLabel}>{z.label}</span>
            <span style={s.tzTime}>{time}</span>
            <span style={s.tzDay}>{day}</span>
          </div>
        );
      })}
    </div>
  );
};

widgets.push({ key: "tz", order: 2, ttl: 0, cmd: _tzCmd, Component: Timezones });
