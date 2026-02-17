const _audioCmd = `python3 -c "
import json, subprocess, sys

audio = json.loads(subprocess.check_output(['system_profiler', 'SPAudioDataType', '-json'], stderr=subprocess.DEVNULL))
items = audio.get('SPAudioDataType', [{}])[0].get('_items', [])
inp = out = None
for d in items:
    name = d.get('_name', '')
    if d.get('coreaudio_default_audio_input_device') == 'spaudio_yes':
        inp = name
    if d.get('coreaudio_default_audio_output_device') == 'spaudio_yes':
        out = name

result = {'input': inp or 'None', 'output': out or 'None'}

if any('airpod' in (x or '').lower() for x in [inp, out]):
    bt = json.loads(subprocess.check_output(['system_profiler', 'SPBluetoothDataType', '-json'], stderr=subprocess.DEVNULL))
    for dev in bt.get('SPBluetoothDataType', [{}])[0].get('device_connected', []):
        for name, info in dev.items():
            if 'airpod' in name.lower() and 'device_batteryLevelLeft' in info:
                result['airpods'] = {
                    'left': info.get('device_batteryLevelLeft', '?'),
                    'right': info.get('device_batteryLevelRight', '?'),
                    'case': info.get('device_batteryLevelCase', '?'),
                }
                break

print(json.dumps(result))
"`;

const Audio = ({ output }) => {
  let data;
  try {
    data = JSON.parse(output);
  } catch {
    return <div style={s.empty}>{output || "Audio unavailable"}</div>;
  }

  return (
    <div>
      <div
        className="clickable"
        style={{ ...s.label, cursor: "pointer" }}
        onClick={() => run(`open "x-apple.systempreferences:com.apple.Sound-Settings.extension"`)}
      >
        AUDIO I/O
      </div>
      <div style={s.row}>
        <span style={s.icon}>🔈</span>
        <span style={s.device}>{data.output}</span>
      </div>
      <div style={s.row}>
        <span style={s.icon}>🎙</span>
        <span style={s.device}>{data.input}</span>
      </div>
      {data.airpods && (() => {
        const low = (v) => parseInt(v) < 25 ? { color: "#ff453a" } : {};
        return (
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
            <span style={low(data.airpods.left)}>🔋 L:{data.airpods.left}</span>
            <span style={low(data.airpods.right)}>R:{data.airpods.right}</span>
            <span style={low(data.airpods.case)}>C:{data.airpods.case}</span>
          </div>
        );
      })()}
    </div>
  );
};

widgets.push({ key: "audio", order: 1, ttl: 10, cmd: _audioCmd, Component: Audio });
