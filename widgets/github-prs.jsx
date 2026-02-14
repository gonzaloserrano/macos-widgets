const ghPrCmd = `/opt/homebrew/bin/gh search prs --review-requested=@me --state=open --json title,repository,url 2>&1 | python3 -c "
import json, sys
prs = json.load(sys.stdin)
print(json.dumps({'count': len(prs), 'prs': [{'title': p['title'], 'repo': p['repository']['name'], 'url': p['url']} for p in prs[:5]]}))"`;

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

  return (
    <div>
      <a href="https://github.com/pulls/review-requested" style={{ ...s.label, display: "block", textDecoration: "none", cursor: "pointer" }}>PR REVIEWS ({data.count})</a>
      {data.prs.map((pr, i) => (
        <a key={i} href={pr.url} style={s.prRow}>
          <span style={s.prRepo}>{pr.repo}</span>
          <span style={s.prTitle}>{pr.title}</span>
        </a>
      ))}
      {data.count > 5 && (
        <div style={s.prMore}>+{data.count - 5} more</div>
      )}
    </div>
  );
};
