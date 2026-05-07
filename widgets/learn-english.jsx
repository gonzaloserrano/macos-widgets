const _englishCmd = `python3 -c "
import os, random, json

path = os.path.expanduser('~/english.txt')
phrases = []
try:
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                phrases.append(line)
except FileNotFoundError:
    pass

if phrases:
    print(json.dumps({'phrase': random.choice(phrases), 'count': len(phrases)}))
else:
    print('{}')
"`;

const LearnEnglish = ({ output, refresh }) => {
  let data;
  try { data = JSON.parse(output); } catch { return <div style={s.empty}>english unavailable</div>; }
  if (!data.phrase) return <div style={s.empty}>No phrases in ~/english.txt</div>;

  return (
    <div>
      <div className="clickable" style={{ ...s.label, cursor: "pointer", marginBottom: "4px" }} onClick={refresh}>LEARN ENGLISH</div>
      <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: "SF Mono, Menlo, monospace", color: "#7fd4e8", wordWrap: "break-word", whiteSpace: "pre-wrap", lineHeight: "1.4" }}>{data.phrase}</div>
    </div>
  );
};

widgets.push({ key: "english", order: -0.5, ttl: 60, cmd: _englishCmd, Component: LearnEnglish });
