const ghPrCmd = `/opt/homebrew/bin/gh search prs --review-requested=@me --state=open --json title,repository,url 2>&1 | python3 -c "
import json, sys
prs = json.load(sys.stdin)
print(json.dumps({'count': len(prs), 'prs': [{'title': p['title'], 'repo': p['repository']['name'], 'url': p['url']} for p in prs[:7]]}))"`;

const repoColors = ["#c97a7a", "#c9b57a", "#7abf8e", "#7a9ec9", "#c9a07a", "#a87abf", "#7abfb3"];

const repoColorMap = (prs) => {
  const repos = [...new Set(prs.map((p) => p.repo))];
  const map = {};
  repos.forEach((r, i) => { map[r] = repoColors[i % repoColors.length]; });
  return map;
};

const GithubPRs = ({ output }) => {
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

  return (
    <div>
      <a href="https://github.com/pulls/review-requested" style={{ ...s.label, display: "block", textDecoration: "none", cursor: "pointer" }}>PR REVIEWS ({data.count})</a>
      {data.prs.map((pr, i) => (
        <a key={i} href={pr.url} style={s.prRow}>
          <span style={{ ...s.prRepo, color: colors[pr.repo] }}>{pr.repo}</span>
          <span style={s.prTitle}>{pr.title}</span>
        </a>
      ))}
      {data.count > 7 && (
        <div style={s.prMore}>+{data.count - 7} more</div>
      )}
    </div>
  );
};
