const _pingCmd = `python3 -c "
import subprocess, json, re

def get_gateway():
    try:
        out = subprocess.check_output(['route', '-n', 'get', 'default'], text=True, timeout=2)
        m = re.search(r'gateway:\\s+(\\S+)', out)
        return m.group(1) if m else None
    except Exception:
        return None

def ping(host):
    try:
        out = subprocess.check_output(['ping', '-c1', '-t2', host], text=True, timeout=5)
        m = re.search(r'time=(\\S+)', out)
        return float(m.group(1)) if m else None
    except Exception:
        return None

gw = get_gateway()
result = {'gateway': gw, 'gateway_ms': ping(gw) if gw else None, 'dns_ms': ping('1.1.1.1')}
print(json.dumps(result))
"`;

const _pingHistory = [];
const _PING_MAX_POINTS = 20;

const Ping = ({ output, refresh }) => {
  const [graphMode, setGraphMode] = React.useState(true);

  let data;
  try {
    data = JSON.parse(output);
  } catch {
    return <div style={s.empty}>{output || "Ping unavailable"}</div>;
  }

  // Accumulate history (avoid duplicate consecutive entries from re-renders)
  const last = _pingHistory[_pingHistory.length - 1];
  if (!last || last.gw !== data.gateway_ms || last.dns !== data.dns_ms) {
    _pingHistory.push({ gw: data.gateway_ms, dns: data.dns_ms });
    if (_pingHistory.length > _PING_MAX_POINTS) _pingHistory.shift();
  }

  const fmt = (ms) => (ms != null ? `${Math.round(ms)}` : "—");
  const color = (ms) => {
    if (ms == null) return "#ff5f57";
    if (ms < 20) return "#a8e6a3";
    if (ms < 100) return "#ffd580";
    return "#ff5f57";
  };

  const toggleIcon = graphMode
    ? { title: "Show numbers", children: "123" }
    : { title: "Show graph", children: "▁▃▅" };

  const gwColor = "#a8e6a3";
  const dnsColor = "#6eb5ff";

  const header = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
      <div className="clickable" style={{ ...s.label, cursor: "pointer", lineHeight: 1 }} onClick={refresh}>PING</div>
      <span style={{ fontSize: "11px", fontWeight: 500, lineHeight: 1, letterSpacing: "0.3px" }}>
        <span style={{ color: gwColor }}>{fmt(data.gateway_ms)}ms</span>
        <span style={{ color: "rgba(255,255,255,0.35)", margin: "0 4px" }}>/</span>
        <span style={{ color: dnsColor }}>{fmt(data.dns_ms)}ms</span>
      </span>
      <span
        className="clickable"
        style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", cursor: "pointer", lineHeight: 1 }}
        title={toggleIcon.title}
        onClick={() => setGraphMode(!graphMode)}
      >
        {toggleIcon.children}
      </span>
    </div>
  );

  if (graphMode) {
    return (
      <div>
        {header}
        <PingGraph history={_pingHistory} gateway={data.gateway} />
      </div>
    );
  }

  const col = { display: "flex", flexDirection: "column", alignItems: "center", flex: 1 };
  const num = (ms) => ({ fontSize: "22px", fontWeight: 700, color: color(ms), lineHeight: 1 });
  const unit = { fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "2px" };

  return (
    <div>
      {header}
      <div style={{ display: "flex", gap: "8px" }}>
        <div style={col}>
          <span style={num(data.gateway_ms)}>{fmt(data.gateway_ms)}<span style={{ fontSize: "11px", fontWeight: 400 }}>ms</span></span>
          <span style={unit}>{data.gateway || "gw"}</span>
        </div>
        <div style={col}>
          <span style={num(data.dns_ms)}>{fmt(data.dns_ms)}<span style={{ fontSize: "11px", fontWeight: 400 }}>ms</span></span>
          <span style={unit}>1.1.1.1</span>
        </div>
      </div>
    </div>
  );
};

const PingGraph = ({ history, gateway }) => {
  const AXIS_W = 22;
  const W = 141;
  const CHART_W = W - AXIS_W;
  const H = 46;
  const PAD = { top: 6, bottom: 6 };
  const gw = "#a8e6a3";
  const dns = "#6eb5ff";
  const axisColor = "rgba(255,255,255,0.25)";

  const allVals = history.flatMap(h => [h.gw, h.dns]).filter(v => v != null);
  const maxMs = allVals.length ? Math.max(...allVals, 10) : 100;

  const ticks = [0, Math.round(maxMs / 2), Math.round(maxMs)];

  const toPath = (key) => {
    const pts = history.map((h, i) => {
      const x = AXIS_W + (i / Math.max(history.length - 1, 1)) * CHART_W;
      const v = h[key];
      const y = v != null
        ? PAD.top + (1 - v / maxMs) * (H - PAD.top - PAD.bottom)
        : null;
      return { x, y };
    }).filter(p => p.y != null);
    if (pts.length < 2) return null;
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  };

  const gwPath = toPath("gw");
  const dnsPath = toPath("dns");

  return (
    <div>
      <svg width={W} height={H} style={{ display: "block" }}>
        {ticks.map(t => {
          const y = PAD.top + (1 - t / maxMs) * (H - PAD.top - PAD.bottom);
          return (
            <g key={t}>
              <line x1={AXIS_W} y1={y} x2={W} y2={y} stroke={axisColor} strokeWidth="0.5" strokeDasharray="2,2" />
              <text x={AXIS_W - 3} y={y + 3} textAnchor="end" fill={axisColor} fontSize="9">{t}</text>
            </g>
          );
        })}
        {gwPath && <path d={gwPath} fill="none" stroke={gw} strokeWidth="1.5" strokeLinejoin="round" />}
        {dnsPath && <path d={dnsPath} fill="none" stroke={dns} strokeWidth="1.5" strokeLinejoin="round" />}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
        <span style={{ fontSize: "9px", color: gw }}>{gateway || "gw"}</span>
        <span style={{ fontSize: "9px", color: dns }}>1.1.1.1</span>
      </div>
    </div>
  );
};

widgets.push({ key: "ping", order: 0, ttl: 0, cmd: _pingCmd, Component: Ping });
