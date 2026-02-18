const _ghPrCmd = `/opt/homebrew/bin/gh search prs --review-requested=@me --state=open --json title,repository,url 2>&1 | python3 -c "
import json, sys
prs = json.load(sys.stdin)
print(json.dumps({'count': len(prs), 'prs': [{'title': p['title'], 'repo': p['repository']['name'], 'url': p['url']} for p in prs[:7]]}))"`;

const repoColors = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff922b", "#cc5de8", "#20c997"];

const repoColorMap = (prs) => {
  const repos = [...new Set(prs.map((p) => p.repo))];
  const map = {};
  repos.forEach((r, i) => { map[r] = repoColors[i % repoColors.length]; });
  return map;
};

const GithubPRs = ({ output }) => {
  const [redacted, setRedacted] = React.useState(false);

  let data;
  try {
    data = JSON.parse(output);
  } catch {
    return <div style={s.empty}>{output || "GitHub unavailable"}</div>;
  }

  if (data.count === 0) {
    return <div style={s.empty}>No PRs to review</div>;
  }

  const colors = repoColorMap(data.prs);
  const repos = [...new Set(data.prs.map((p) => p.repo))];
  const redactMap = {};
  repos.forEach((r, i) => { redactMap[r] = "repository " + (i + 1); });

  const repo = (pr) => redacted ? redactMap[pr.repo] : pr.repo;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <a href="https://github.com/pulls/review-requested" style={{ ...s.label, display: "block", textDecoration: "none", cursor: "pointer", flex: 1 }}>PR REVIEWS ({data.count})</a>
        <span
          className="clickable"
          style={{ fontSize: "14px", cursor: "pointer", color: redacted ? "#6eb5ff" : "rgba(255,255,255,0.25)" }}
          onClick={() => setRedacted(!redacted)}
        >
          ◉
        </span>
      </div>
      {data.prs.map((pr, i) => (
        <a key={i} href={pr.url} style={s.prRow}>
          <span style={s.prRepo}><span style={{ color: colors[pr.repo] }}>⦿</span> {repo(pr)}</span>
          <span style={s.prTitle}>{pr.title}</span>
        </a>
      ))}
      {data.count > 7 && (
        <div style={s.prMore}>+{data.count - 7} more</div>
      )}
    </div>
  );
};

widgets.push({ key: "ghpr", order: 4, ttl: 300, cmd: _ghPrCmd, Component: GithubPRs });
