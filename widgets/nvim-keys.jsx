const _nvimKeysCmd = `python3 -c "
import random, json

maps = []
with open('$HOME/.config/nvim/init.lua') as f:
    for line in f:
        line = line.strip()
        if line.startswith('--') or not line.startswith('map('):
            continue
        p = line.split(chr(39))
        if len(p) >= 6:
            key, cmd = p[3], p[5]
            if cmd.startswith(':'): cmd = cmd[1:]
            if cmd.lower().endswith('<cr>'): cmd = cmd[:-4]
            if cmd.startswith('lua '): cmd = cmd[4:]
            maps.append({'key': key, 'cmd': cmd})

if maps:
    print(json.dumps(random.choice(maps)))
else:
    print('{}')
"`;

const NvimKeys = ({ output }) => {
  let data;
  try { data = JSON.parse(output); } catch { return <div style={s.empty}>nvim keys unavailable</div>; }
  if (!data.key) return <div style={s.empty}>No keymaps found</div>;

  return (
    <div>
      <div style={s.label}>NVIM KEY</div>
      <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "SF Mono, Menlo, monospace", color: "#a8e6a3", marginBottom: "4px" }}>{data.key}</div>
      <div style={{ fontSize: "11px", fontFamily: "SF Mono, Menlo, monospace", color: "rgba(255,255,255,0.6)", wordWrap: "break-word", whiteSpace: "pre-wrap" }}>{data.cmd}</div>
    </div>
  );
};

widgets.push({ key: "nvimkeys", order: -1, ttl: 60, cmd: _nvimKeysCmd, Component: NvimKeys });
