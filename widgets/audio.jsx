const audioCmd = `system_profiler SPAudioDataType -json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('SPAudioDataType', [{}])[0].get('_items', [])
inp = out = None
for d in items:
    name = d.get('_name', '')
    if d.get('coreaudio_default_audio_input_device') == 'spaudio_yes':
        inp = name
    if d.get('coreaudio_default_audio_output_device') == 'spaudio_yes':
        out = name
print(json.dumps({'input': inp or 'None', 'output': out or 'None'}))
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
      <div style={s.label}>AUDIO</div>
      <div style={s.row}>
        <span style={s.icon}>🔈</span>
        <span style={s.device}>{data.output}</span>
      </div>
      <div style={s.row}>
        <span style={s.icon}>🎙</span>
        <span style={s.device}>{data.input}</span>
      </div>
    </div>
  );
};
