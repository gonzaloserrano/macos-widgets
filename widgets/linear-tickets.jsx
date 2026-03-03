const _linearCmd = `python3 -c '
import json, os
from urllib.request import Request, urlopen
try: token = open(os.path.expanduser("~/.linear-api-key")).read().strip()
except: token = ""
if not token:
    print(json.dumps({"error":"~/.linear-api-key not found"}))
else:
    q = """{ viewer { assignedIssues(
        filter: { state: { type: { nin: ["completed","cancelled"] } } }
        first: 20
        orderBy: updatedAt
    ) { nodes {
        identifier title priority priorityLabel
        state { name type }
        url
    }}}}"""
    req = Request("https://api.linear.app/graphql", json.dumps({"query":q}).encode(), {"Authorization":token,"Content-Type":"application/json"})
    try:
        r = urlopen(req)
        data = json.loads(r.read())
        nodes = data["data"]["viewer"]["assignedIssues"]["nodes"]
        nodes.sort(key=lambda n: (n["priority"] if n["priority"] > 0 else 99))
        print(json.dumps(nodes))
    except Exception as e:
        print(json.dumps({"error":str(e)}))
'`;

const stateIcon = {
  backlog: { icon: "◌", color: "#8b8b8b" },
  unstarted: { icon: "○", color: "#8b8b8b" },
  started: { icon: "◐", color: "#f2c94c" },
  completed: { icon: "✓", color: "#5e6ad2" },
  cancelled: { icon: "✕", color: "#8b8b8b" },
};

const priorityIcon = { 1: "🔴", 2: "🟠", 3: "🟡", 4: "🔵" };

const stateFor = (t) => {
  const s = stateIcon[t.state.type] || stateIcon.backlog;
  const name = t.state.name.toLowerCase();
  if (name === "in review") return { icon: "◑", color: "#5bb98b" };
  if (name === "blocked") return { icon: "⊘", color: "#eb5757" };
  return s;
};

const ticketNum = (id) => {
  const i = id.indexOf("-");
  return i >= 0 ? id.slice(i + 1) : id;
};

const LinearTickets = ({ output, refresh }) => {
  const [redacted, setRedacted] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  const label = (
    <div className="clickable" style={{ ...s.label, cursor: "pointer" }} onClick={refresh}>LINEAR</div>
  );

  let tickets;
  try {
    const data = JSON.parse(output);
    if (data.error) return <div>{label}<div style={s.empty}>{data.error}</div></div>;
    tickets = data;
  } catch {
    return <div>{label}<div style={s.empty}>{output || "Linear unavailable"}</div></div>;
  }

  if (!tickets.length) return <div>{label}<div style={s.empty}>No tickets</div></div>;

  const redactTitle = (t, i) => redacted ? "ticket " + (i + 1) : t.title;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div className="clickable" style={{ ...s.label, cursor: "pointer", flex: 1, marginBottom: 0 }} onClick={refresh}>
          LINEAR ({tickets.length})
        </div>
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
      {!collapsed && tickets.map((t, i) => {
        const st = stateFor(t);
        return (
          <a key={i} href={t.url} style={{ ...s.prRow, display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
            <span style={{ fontSize: "11px", color: st.color, width: "12px", textAlign: "center", flexShrink: 0 }}>{st.icon}</span>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{redactTitle(t, i)}</span>
          </a>
        );
      })}
    </div>
  );
};

widgets.push({ key: "linear", order: 6, ttl: 300, cmd: _linearCmd, Component: LinearTickets });
