const _batteryCmd = `python3 -c "
import subprocess, json, re

def mac():
    try:
        out = subprocess.check_output(['pmset', '-g', 'batt'], text=True, timeout=2)
        m = re.search(r'(\\d+)%', out)
        if not m: return None
        return {'level': int(m.group(1)), 'charging': 'AC Power' in out or 'charging' in out.lower() and 'discharging' not in out.lower()}
    except Exception:
        return None

def bluetooth():
    devs = []
    try:
        out = subprocess.check_output(['system_profiler', 'SPBluetoothDataType', '-json'], text=True, timeout=5)
        data = json.loads(out)
        for c in data.get('SPBluetoothDataType', []):
            for d in c.get('device_connected', []):
                for name, props in d.items():
                    if not isinstance(props, dict): continue
                    def pct(k):
                        v = props.get(k, '')
                        if isinstance(v, str) and v.endswith('%'):
                            try: return int(v.rstrip('%'))
                            except ValueError: return None
                        return None
                    main, left, right, case = pct('device_batteryLevelMain'), pct('device_batteryLevelLeft'), pct('device_batteryLevelRight'), pct('device_batteryLevelCase')
                    levels = [v for v in (main, left, right) if v is not None]
                    if not levels and case is None: continue
                    devs.append({'name': name, 'minor': props.get('device_minorType', '').lower(), 'level': min(levels) if levels else None, 'case': case})
    except Exception:
        pass
    return devs

def hid():
    devs = []
    try:
        out = subprocess.check_output(['ioreg', '-r', '-c', 'AppleDeviceManagementHIDEventService', '-l'], text=True, timeout=3)
        for b in re.split(r'^\\+-o ', out, flags=re.MULTILINE):
            bm = re.search(r'\\\"BatteryPercent\\\"\\s*=\\s*(\\d+)', b)
            if not bm: continue
            pm = re.search(r'\\\"Product\\\" = \\\"([^\\\"]+)\\\"', b)
            pname = pm.group(1) if pm else ''
            cls = ''
            if 'KBTransportSwitch' in b or 'KBOff' in b or 'Keyboard' in pname:
                cls = 'keyboard'
            elif 'Trackpad' in pname or 'TrackpadHID' in b:
                cls = 'trackpad'
            elif 'Mouse' in pname:
                cls = 'mouse'
            devs.append({'name': pname or cls.title() or 'HID', 'class': cls, 'level': int(bm.group(1))})
    except Exception:
        pass
    return devs

print(json.dumps({'mac': mac(), 'bt': bluetooth(), 'hid': hid()}))
"`;

const _batS = {
  row: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  ring: { position: "relative" },
  iconBox: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.92)" },
  bolt: { position: "absolute", top: "-3px", left: "50%", transform: "translateX(-50%)", fontSize: "10px", color: "#ffd60a", lineHeight: 1 },
};

const _batIconImg = (src, w) => (
  <img src={src} width={w} height={w} style={{ display: "block", opacity: 0.92 }} />
);
const _batIconSrc = {
  laptop: "battery-laptop.png",
  airpods: "battery-airpods.png",
  case: "battery-case.png",
  keyboard: "battery-keyboard.png",
  mouse: "battery-mouse.png",
};

const _BatRing = ({ level, charging, iconSrc, iconPx, label, size, stroke = 2 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const lvl = level == null ? 0 : Math.max(0, Math.min(100, level));
  const dash = c * (lvl / 100);
  const fg = level == null ? "rgba(255,255,255,0.18)" : lvl < 25 ? "#ff453a" : lvl < 50 ? "#ffd580" : "rgba(255,255,255,0.92)";

  return (
    <div style={{ ..._batS.ring, width: size, height: size }} title={`${label}: ${level != null ? lvl + "%" : "—"}${charging ? " (charging)" : ""}`}>
      <svg width={size} height={size} style={{ display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={stroke} />
        {level != null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={fg}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <div style={_batS.iconBox}>{_batIconImg(iconSrc, iconPx)}</div>
      {charging && <div style={_batS.bolt}>⚡</div>}
    </div>
  );
};

const Battery = ({ output, refresh }) => {
  let data;
  try {
    data = JSON.parse(output);
  } catch {
    return <div style={s.empty}>{output || "Battery unavailable"}</div>;
  }

  const items = [];
  if (data.mac) {
    items.push({ key: "mac", iconSrc: _batIconSrc.laptop, level: data.mac.level, charging: !!data.mac.charging, label: "Mac" });
  }

  const airpods = (data.bt || []).find((d) => /airpod/i.test(d.name));
  if (airpods && airpods.level != null) {
    items.push({ key: "airpods", iconSrc: _batIconSrc.airpods, level: airpods.level, charging: false, label: airpods.name });
  }
  if (airpods && airpods.case != null) {
    items.push({ key: "case", iconSrc: _batIconSrc.case, level: airpods.case, charging: false, label: `${airpods.name} case` });
  }

  const kb = (data.hid || []).find((d) => d.class === "keyboard") || (data.bt || []).find((d) => /keyboard/i.test(d.name) || d.minor === "keyboard");
  if (kb && kb.level != null) {
    items.push({ key: "kb", iconSrc: _batIconSrc.keyboard, level: kb.level, charging: false, label: kb.name || "Keyboard" });
  }

  const mouse = (data.bt || []).find((d) => d.minor === "mouse") || (data.hid || []).find((d) => d.class === "mouse");
  if (mouse && mouse.level != null) {
    items.push({ key: "mouse", iconSrc: _batIconSrc.mouse, level: mouse.level, charging: false, label: mouse.name || "Mouse" });
  }

  if (items.length === 0) return <div style={s.empty}>No battery data</div>;

  items.sort((a, b) => (b.level ?? -1) - (a.level ?? -1));

  // Pack rings to fit the 158px inner card width with small gaps.
  const n = items.length;
  const size = n >= 5 ? 28 : n === 4 ? 32 : n === 3 ? 38 : 42;
  const iconPx = Math.round(size * 0.56);

  return (
    <div className="clickable" style={{ ..._batS.row, cursor: "pointer" }} onClick={refresh}>
      {items.map((it) => (
        <_BatRing key={it.key} size={size} iconPx={iconPx} {...it} />
      ))}
    </div>
  );
};

widgets.push({ key: "battery", order: -3, ttl: 30, cmd: _batteryCmd, Component: Battery });
