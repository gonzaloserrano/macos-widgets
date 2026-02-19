const _ghPrCmd = `python3 -c '
import json, subprocess
def query(q):
    gql = "{search(query:" + chr(34) + q + chr(34) + ",type:ISSUE,first:5){issueCount nodes{...on PullRequest{title url repository{name}reviewDecision}}}}"
    r = subprocess.run(["/opt/homebrew/bin/gh","api","graphql","-f","query=" + gql], capture_output=True, text=True)
    if r.returncode != 0: return {"total":0,"prs":[]}
    s = json.loads(r.stdout)["data"]["search"]
    return {"total":s["issueCount"],"prs":[{"title":n["title"],"repo":n["repository"]["name"],"url":n["url"],"approved":n.get("reviewDecision")=="APPROVED"} for n in s["nodes"]]}
mine = query("is:pr is:open author:@me sort:created-desc")
revs = query("is:pr is:open review-requested:@me")
print(json.dumps({"mine":mine,"reviews":revs}))
'`;

const repoColors = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff922b", "#cc5de8", "#20c997"];

const repoColorMap = (prs) => {
  const repos = [...new Set(prs.map((p) => p.repo))];
  const map = {};
  repos.forEach((r, i) => { map[r] = repoColors[i % repoColors.length]; });
  return map;
};

const GithubPRs = ({ output, refresh }) => {
  const [redacted, setRedacted] = React.useState(false);

  let mine = { total: 0, prs: [] }, reviews = { total: 0, prs: [] };
  try {
    const data = JSON.parse(output);
    mine = data.mine || mine;
    reviews = data.reviews || reviews;
  } catch {
    return <div style={s.empty}>{output || "GitHub unavailable"}</div>;
  }

  if (mine.total === 0 && reviews.total === 0) {
    return <div style={s.empty}>No PRs</div>;
  }

  const allPrs = [...mine.prs, ...reviews.prs];
  const colors = repoColorMap(allPrs);
  const repos = [...new Set(allPrs.map((p) => p.repo))];
  const redactMap = {};
  repos.forEach((r, i) => { redactMap[r] = "repository " + (i + 1); });

  const repo = (pr) => redacted ? redactMap[pr.repo] : pr.repo;

  const renderPrs = (prs) => prs.map((pr, i) => (
    <a key={i} href={pr.url} style={s.prRow}>
      <span style={s.prRepo}><span style={{ color: colors[pr.repo] }}>⦿</span> {repo(pr)}</span>
      <span style={s.prTitle}>{pr.approved ? "✓ " : ""}{pr.title}</span>
    </a>
  ));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div className="clickable" style={{ ...s.label, cursor: "pointer", flex: 1 }} onClick={refresh}>GITHUB PRs</div>
        <span
          className="clickable"
          style={{ fontSize: "14px", cursor: "pointer", color: redacted ? "#6eb5ff" : "rgba(255,255,255,0.25)" }}
          onClick={() => setRedacted(!redacted)}
        >
          ◉
        </span>
      </div>
      {mine.total > 0 && (
        <div>
          <div className="clickable" style={{ ...s.label, marginTop: "2px", fontSize: "9px", cursor: "pointer" }} onClick={() => run('open https://github.com/pulls')}>MY PRs ({mine.total})</div>
          {renderPrs(mine.prs)}
        </div>
      )}
      {reviews.total > 0 && (
        <div>
          <div className="clickable" style={{ ...s.label, marginTop: mine.total > 0 ? "15px" : "2px", fontSize: "9px", cursor: "pointer" }} onClick={() => run('open https://github.com/pulls/review-requested')}>TO REVIEW ({reviews.total})</div>
          {renderPrs(reviews.prs)}
        </div>
      )}
    </div>
  );
};

widgets.push({ key: "ghpr", order: 4, ttl: 300, cmd: _ghPrCmd, Component: GithubPRs });
