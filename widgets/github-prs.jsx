const _ghPrCmd = `python3 -c '
import json, subprocess
def run_gql(gql):
    r = subprocess.run(["/opt/homebrew/bin/gh","api","graphql","-f","query=" + gql], capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 else None
def query(q):
    gql = "{search(query:" + chr(34) + q + chr(34) + ",type:ISSUE,first:25){issueCount nodes{...on PullRequest{number title url createdAt repository{name}reviewDecision commits(last:1){nodes{commit{statusCheckRollup{state}}}}}}}}"
    d = run_gql(gql)
    if not d: return {"total":0,"prs":[]}
    s = d["data"]["search"]
    def ci(n):
        try: return n["commits"]["nodes"][0]["commit"]["statusCheckRollup"]["state"]
        except: return None
    return {"total":s["issueCount"],"prs":[{"num":n["number"],"title":n["title"],"repo":n["repository"]["name"],"url":n["url"],"created":n["createdAt"],"review":n.get("reviewDecision"),"ci":ci(n)} for n in s["nodes"]]}
def query_reviews(q):
    gql = "{viewer{login} search(query:" + chr(34) + q + chr(34) + ",type:ISSUE,first:25){issueCount nodes{...on PullRequest{number title url createdAt author{login} repository{name isArchived}reviewDecision commits(last:1){nodes{commit{committedDate statusCheckRollup{state}}}} reviews(last:50){nodes{author{login}submittedAt}} comments(last:50){nodes{author{login}createdAt}}}}}}"
    d = run_gql(gql)
    if not d: return {"total":0,"prs":[]}
    me = d["data"]["viewer"]["login"]
    s = d["data"]["search"]
    def ci(n):
        try: return n["commits"]["nodes"][0]["commit"]["statusCheckRollup"]["state"]
        except: return None
    prs = []
    for n in s["nodes"]:
        if n.get("repository",{}).get("isArchived"): continue
        last_commit = n.get("commits",{}).get("nodes",[{}])[0].get("commit",{}).get("committedDate","")
        my_last_touch = ""
        for rv in n.get("reviews",{}).get("nodes",[]):
            if rv.get("author",{}).get("login") != me: continue
            ts = rv.get("submittedAt","")
            if ts and ts > my_last_touch: my_last_touch = ts
        for cm in n.get("comments",{}).get("nodes",[]):
            if cm.get("author",{}).get("login") != me: continue
            ts = cm.get("createdAt","")
            if ts and ts > my_last_touch: my_last_touch = ts
        if my_last_touch and last_commit and my_last_touch >= last_commit: continue
        prs.append({"num":n["number"],"title":n["title"],"repo":n["repository"]["name"],"url":n["url"],"created":n["createdAt"],"author":n.get("author",{}).get("login",""),"review":n.get("reviewDecision"),"ci":ci(n)})
    return {"total":len(prs),"prs":prs}
mine = query("is:pr is:open author:@me sort:created-desc")
revs = query_reviews("is:pr is:open draft:false review-requested:@me -author:timescale-automation -author:app/github-actions -author:app/dependabot")
print(json.dumps({"mine":mine,"reviews":revs}))
'`;

// Hues are spaced evenly across the repos actually on screen, so no two land close
// enough to confuse. Deliberately not a hash of the repo name: with ~13 repos a hash
// collides often, and two different repos sharing a hue defeats the only thing the color
// does here, which is showing that several chips belong to the same repo. Colors do
// shift as the repo set changes, and that is fine -- 13 of them was never a legend you
// could learn, only a grouping you read in one glance. Sorted so one render is stable.
const repoColorMap = (prs) => {
  const repos = [...new Set(prs.map((p) => p.repo))].sort();
  const map = {};
  repos.forEach((r, i) => {
    const hue = Math.round((i * 360) / repos.length);
    const light = i % 2 ? 66 : 78; // alternating lightness pushes adjacent hues further apart
    map[r] = { fg: `hsl(${hue}, 85%, ${light}%)`, bg: `hsla(${hue}, 70%, 55%, 0.18)` };
  });
  return map;
};

// One derived state per PR instead of raw CI: nearly every PR here is CI-green (and
// several repos run no CI at all), so CI alone paints a wall of green. What varies, and
// what you act on, is whose turn it is.
const _ghState = (pr) =>
  pr.review === "CHANGES_REQUESTED" || pr.ci === "FAILURE" || pr.ci === "ERROR" ? "act"
    : pr.ci === "PENDING" || pr.ci === "EXPECTED" ? "wait"
      : pr.review === "APPROVED" ? "ready"
        : "idle";

const _ghStateColor = { act: "#ff6b6b", wait: "#ffd93d", ready: "#6bcb77", idle: "rgba(255,255,255,0.22)" };

// Same four states, but they mean different things depending on the block. On a PR of
// mine, no review yet means the ball is in someone else's court; on one awaiting my
// review it is the opposite, and "my turn" would be true of every chip in that block.
const _ghMineLabel = { act: "my turn", wait: "ci", ready: "ready", idle: "waiting" };
const _ghReviewLabel = { act: "changes req", wait: "ci", ready: "approved", idle: "pending" };

// Conventional-commit type from a PR title: `feat(scope)!: subject` -> `feat`. Matched by
// shape rather than against a list of known types, so a team's custom types still count;
// titles with no prefix at all are simply left out of the tally.
const _ghPrefixRe = /^([a-z][a-z0-9]*)(?:\([^)]*\))?!?:/;
const _ghPrefix = (title) => {
  const m = _ghPrefixRe.exec(title || "");
  return m ? m[1] : null;
};

const _ghAge = (iso) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days < 1 ? "today" : `${days}d`;
};

const _ghS = {
  // Wider column gap than row gap: side by side the pills need air to read as separate
  // numbers, stacked they do not. 6px is the most that still wraps 19 chips into three
  // rows; at 7px the last row holds a single orphan chip.
  grid: { display: "flex", flexWrap: "wrap", gap: "4px 6px", marginTop: "5px" },
  chip: {
    fontSize: "11px", fontWeight: 600, lineHeight: "1.4", letterSpacing: "0.2px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontVariantNumeric: "tabular-nums",
    padding: "2px 5px", borderRadius: "4px", textDecoration: "none", whiteSpace: "nowrap",
    borderBottomWidth: "2px", borderBottomStyle: "solid",
    transition: "opacity 0.12s, filter 0.12s",
  },
  // Exactly two lines, always: a title wraps onto the second and is cut there, so the card
  // height never moves whichever chip is hovered.
  detail: {
    fontSize: "10px", marginTop: "3px", height: "26px", lineHeight: "13px",
    color: "rgba(255,255,255,0.45)", wordBreak: "break-word", overflow: "hidden",
  },
  clamp2: { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" },
  prefixes: {
    display: "flex", flexWrap: "wrap", gap: "1px 8px", marginTop: "6px",
    fontSize: "10px", lineHeight: "13px", color: "rgba(255,255,255,0.4)",
  },
  counter: { cursor: "pointer" },
  counterOn: { color: "#fff" },
  // A pinned counter keeps filtering after the pointer leaves, so it needs to look
  // different from one that is merely hovered.
  counterPinned: { textDecoration: "underline", textUnderlineOffset: "2px" },
  // Hovering a counter greys out the pills it does not describe, which is cheaper to read
  // than highlighting the ones it does: the matching pills are simply the ones left in color.
  faded: { filter: "grayscale(1)", opacity: 0.25 },
};

const GithubPRs = ({ output, refresh }) => {
  const [redacted, setRedacted] = React.useState(false);
  const [collapsed, setCollapsed] = usePersistedState("collapse:ghpr", false);
  const [hover, setHover] = React.useState(null);
  const [brush, setBrush] = React.useState(null);
  const [pinned, setPinned] = React.useState(null);

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
  const approved = (pr) => pr.review === "APPROVED";

  // Newest first, so the last chip in the grid is always the stalest PR.
  const byNewest = (prs) => prs.slice().sort((a, b) => (b.created || "").localeCompare(a.created || ""));

  // A counter filters the pills either while hovered or, once clicked, until clicked again.
  // Hover wins while it lasts, so you can peek at another counter without losing the pin.
  const sameCounter = (a, b) => !!a && !!b && a.block === b.block && a.kind === b.kind && a.value === b.value;
  const active = brush || pinned;

  // Every pill the active counter's count does not include greys out. Scoped to the
  // counter's own block, since a count of 4 docs under MY PRs is a claim about that
  // block only.
  const faded = (pr, block) => {
    if (!active || active.block !== block) return false;
    return active.kind === "state"
      ? _ghState(pr) !== active.value
      : _ghPrefix(pr.title) !== active.value;
  };

  const counterProps = (block, kind, value) => {
    const me = { block, kind, value };
    const isPinned = sameCounter(pinned, me);
    return {
      style: {
        ..._ghS.counter,
        ...(sameCounter(active, me) ? _ghS.counterOn : null),
        ...(isPinned ? _ghS.counterPinned : null),
      },
      onMouseEnter: () => setBrush(me),
      onMouseLeave: () => setBrush(null),
      onClick: (e) => { e.stopPropagation(); setPinned(isPinned ? null : me); },
    };
  };

  // A chip per PR: the number identifies it, the fill/text color groups it by repo, the
  // underline says whose turn it is. Nineteen fit in three rows of the 262px card.
  const renderChips = (prs, total, moreUrl, block, labels) => (
    <div style={_ghS.grid} onMouseLeave={() => setHover(null)}>
      {byNewest(prs).map((pr) => {
        const c = colors[pr.repo];
        return (
          <a
            key={pr.url}
            href={pr.url}
            title={`${repo(pr)} #${pr.num} · ${labels[_ghState(pr)]} · ${_ghAge(pr.created)}`}
            style={{
              ..._ghS.chip, color: c.fg, background: c.bg,
              borderBottomColor: _ghStateColor[_ghState(pr)],
              ...(faded(pr, block) ? _ghS.faded : null),
            }}
            onMouseEnter={() => setHover({ pr, block })}
          >{approved(pr) ? "✓" : ""}{pr.num}</a>
        );
      })}
      {total > prs.length && (
        <a
          href={moreUrl}
          style={{ ..._ghS.chip, color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.06)", borderBottomColor: "rgba(255,255,255,0.15)" }}
        >+{total - prs.length}</a>
      )}
    </div>
  );

  // One strip per block: it tallies that block's states, and swaps to the full title of a
  // chip only while a chip of the same block is hovered, so hovering my PRs leaves the
  // review tally standing. That title is what buys the right to render no titles at all.
  // The author only shows for review PRs, where whose PR it is matters.
  const strip = (block, prs, labels) => (
    <div style={_ghS.detail}>
      {hover && hover.block === block
        ? <span style={_ghS.clamp2}>
          <span style={{ color: colors[hover.pr.repo].fg }}>{repo(hover.pr)} #{hover.pr.num}</span>
          {hover.pr.author ? ` @${hover.pr.author}` : ""} · {_ghAge(hover.pr.created)}{redacted ? "" : ` · ${hover.pr.title}`}
        </span>
        : ["act", "wait", "ready", "idle"]
          .map(k => ({ k, n: prs.filter(pr => _ghState(pr) === k).length }))
          .filter(x => x.n > 0)
          .map(({ k, n }, i) => (
            <span key={k}>
              {i > 0 ? " · " : ""}
              <span {...counterProps(block, "state", k)}>
                <span style={{ color: _ghStateColor[k] }}>{n}</span> {labels[k]}
              </span>
            </span>
          ))}
    </div>
  );

  // Counters per conventional-commit type, busiest first. Only PRs whose title carries a
  // prefix are counted, so the row is absent when none of them do.
  const prefixLine = (block, prs) => {
    const counts = {};
    prs.forEach((pr) => {
      const p = _ghPrefix(pr.title);
      if (p) counts[p] = (counts[p] || 0) + 1;
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (!entries.length) return null;
    return (
      <div style={_ghS.prefixes}>
        {entries.map(([p, n]) => (
          <span key={p} {...counterProps(block, "prefix", p)}>{p}<span style={{ opacity: 0.55 }}>({n})</span></span>
        ))}
      </div>
    );
  };

  const summary = [mine.total > 0 && `${mine.total} mine`, reviews.total > 0 && `${reviews.total} review`].filter(Boolean).join(", ");

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div className="clickable" style={{ ...s.label, cursor: "pointer", flex: 1, marginBottom: 0 }} onClick={refresh}>GITHUB PRs{collapsed ? ` · ${summary}` : ""}</div>
        <span
          className="clickable"
          style={{ fontSize: "12px", cursor: "pointer", color: redacted ? "#6eb5ff" : "rgba(255,255,255,0.2)", lineHeight: "1" }}
          onClick={() => setRedacted(!redacted)}
        >◉</span>
        <span
          className="clickable"
          style={{ fontSize: "12px", cursor: "pointer", color: "rgba(255,255,255,0.25)", lineHeight: "1" }}
          onClick={() => setCollapsed(!collapsed)}
        >{collapsed ? "▹" : "▿"}</span>
      </div>
      {!collapsed && (
        <>
          {mine.total > 0 && (
            <div>
              <div className="clickable" style={{ ...s.label, marginTop: "2px", fontSize: "9px", cursor: "pointer" }} onClick={() => run('open https://github.com/pulls')}>MY PRs ({mine.total})</div>
              {renderChips(mine.prs, mine.total, "https://github.com/pulls", "mine", _ghMineLabel)}
              {prefixLine("mine", mine.prs)}
              {strip("mine", mine.prs, _ghMineLabel)}
            </div>
          )}
          {reviews.total > 0 && (
            <div>
              <div className="clickable" style={{ ...s.label, marginTop: mine.total > 0 ? "10px" : "2px", fontSize: "9px", cursor: "pointer" }} onClick={() => run('open https://github.com/pulls/review-requested')}>TO REVIEW ({reviews.total})</div>
              {renderChips(reviews.prs, reviews.total, "https://github.com/pulls/review-requested", "review", _ghReviewLabel)}
              {prefixLine("review", reviews.prs)}
              {strip("review", reviews.prs, _ghReviewLabel)}
            </div>
          )}
        </>
      )}
    </div>
  );
};

widgets.push({ key: "ghpr", order: 4, ttl: 60, cmd: _ghPrCmd, Component: GithubPRs });
