const _englishCmd = `python3 -c "
import os, random, json

path = os.path.expanduser('~/english.txt')
entries = []
try:
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            parts = [p.strip() for p in line.split('|')]
            entries.append({
                'phrase': parts[0],
                'meaning': parts[1] if len(parts) > 1 else '',
                'example': parts[2] if len(parts) > 2 else '',
            })
except FileNotFoundError:
    pass

if entries:
    print(json.dumps({'entry': random.choice(entries), 'count': len(entries)}))
else:
    print('{}')
"`;

const LearnEnglish = ({ output, refresh }) => {
  let data;
  try { data = JSON.parse(output); } catch { return <div style={s.empty}>english unavailable</div>; }
  const e = data.entry;
  if (!e || !e.phrase) return <div style={s.empty}>No phrases in ~/english.txt</div>;

  return (
    <div>
      <div className="clickable" style={{ ...s.label, cursor: "pointer", marginBottom: "4px" }} onClick={refresh}>LEARN ENGLISH</div>
      <div className="clickable" style={{ fontSize: "13px", fontWeight: 600, fontFamily: "SF Mono, Menlo, monospace", color: "#7fd4e8", wordWrap: "break-word", whiteSpace: "pre-wrap", lineHeight: "1.4", cursor: "pointer" }} onClick={() => run("open ~/english.txt")}>{e.phrase}</div>
      {e.meaning && <div style={{ fontSize: "11px", color: "#e8c07d", wordWrap: "break-word", lineHeight: "1.35", marginTop: "5px" }}>{e.meaning}</div>}
      {e.example && <div style={{ fontSize: "11px", fontStyle: "italic", color: "#9ece6a", wordWrap: "break-word", lineHeight: "1.35", marginTop: "3px" }}>“{e.example}”</div>}
    </div>
  );
};

widgets.push({ key: "english", order: 0, ttl: 60, cmd: _englishCmd, Component: LearnEnglish });
