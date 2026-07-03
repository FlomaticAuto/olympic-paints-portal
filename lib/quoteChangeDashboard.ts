// Quote & Price-List Change Tracker — server-side dashboard HTML builder.
// Mirrors 2.Areas/1. Sales/1. Pricing/Quote Change Tracker/build_quote_change_dashboard.py
// but runs inside the portal so the data never leaves the admin-gated boundary.

export type QuoteChangeRow = {
  entry_ref: string;
  rep_code: string | null;
  rep_name: string | null;
  logged_by: string | null;
  event_date: string | null;
  event_type: string | null;
  account: string | null;
  store_dlref: string | null;
  reason_code: string | null;
  revision_no: number | null;
  note: string | null;
};

const REP_NAMES: Record<string, string> = {
  AC: "Aboo Cassim", AP: "Amit Patel", BV: "Bhadresh Vallabh",
  BM: "Byron Minnie", NP: "Nikhil Panchal",
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isoWeek(d: string): string {
  const dt = new Date(d.slice(0, 10) + "T00:00:00Z");
  const day = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((dt.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function buildQuoteChangeDashboard(rows: QuoteChangeRow[]): string {
  const byRep = new Map<string, number>();
  const byReason = new Map<string, number>();
  const byType = new Map<string, number>();
  const byWeek = new Map<string, number>();
  const revisions: [string, string, number][] = [];

  for (const r of rows) {
    const rep = r.rep_code || "?";
    byRep.set(rep, (byRep.get(rep) ?? 0) + 1);
    const reason = r.reason_code || "Unspecified";
    byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
    const type = r.event_type || "Unspecified";
    byType.set(type, (byType.get(type) ?? 0) + 1);
    if (r.event_date) byWeek.set(isoWeek(r.event_date), (byWeek.get(isoWeek(r.event_date)) ?? 0) + 1);
    if (r.revision_no) revisions.push([rep, r.account || "—", r.revision_no]);
  }

  const sortDesc = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  const repArr = sortDesc(byRep);
  const reasonArr = sortDesc(byReason);
  const typeArr = sortDesc(byType);
  const weekArr = [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const worstRep = repArr[0] ?? ["—", 0];
  const topReason = reasonArr[0] ?? ["—", 0];
  const deepest = revisions.length
    ? revisions.reduce((a, b) => (b[2] > a[2] ? b : a))
    : null;
  const deepestTxt = deepest ? `${deepest[2]}× · ${deepest[1]}` : "—";

  const totalReason = reasonArr.reduce((s, [, n]) => s + n, 0) || 1;
  let run = 0;
  const cum = reasonArr.map(([, v]) => { run += v; return Math.round((run / totalReason) * 1000) / 10; });

  const data = {
    rep: { labels: repArr.map(([c]) => `${c} · ${REP_NAMES[c] ?? c}`), values: repArr.map(([, n]) => n) },
    reason: { labels: reasonArr.map(([r]) => r), values: reasonArr.map(([, n]) => n), cum },
    type: { labels: typeArr.map(([t]) => t), values: typeArr.map(([, n]) => n) },
    week: { labels: weekArr.map(([w]) => w), values: weekArr.map(([, n]) => n) },
  };

  const tableRows = rows.length
    ? rows.map((r) =>
        `<tr>` +
        `<td class='mono'>${esc(r.event_date)}</td>` +
        `<td><span class='chip'>${esc(r.rep_code)}</span> ${esc(REP_NAMES[r.rep_code ?? ""] ?? "")}</td>` +
        `<td>${esc(r.event_type)}</td>` +
        `<td>${esc(r.account || "—")}${r.store_dlref ? `<span class='dlref'>${esc(r.store_dlref)}</span>` : ""}</td>` +
        `<td>${esc(r.reason_code)}</td>` +
        `<td class='num'>${esc(r.revision_no ?? "")}</td>` +
        `<td>${esc(r.logged_by || "")}</td>` +
        `<td class='muted'>${esc(r.note || "")}</td>` +
        `</tr>`
      ).join("")
    : "<tr><td colspan='8' class='muted' style='text-align:center;padding:28px'>No entries logged yet.</td></tr>";

  const generated = new Date().toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });

  return TEMPLATE
    .replace("__GENERATED__", generated)
    .replace("__TOTAL__", String(rows.length))
    .replace("__WORST_REP__", esc(REP_NAMES[worstRep[0]] ?? worstRep[0]))
    .replace("__WORST_REP_N__", String(worstRep[1]))
    .replace("__TOP_REASON__", esc(topReason[0]))
    .replace("__TOP_REASON_N__", String(topReason[1]))
    .replace("__DEEPEST__", esc(deepestTxt))
    .replace("__TABLE_ROWS__", tableRows)
    .replace("__DATA_JSON__", JSON.stringify(data));
}

// Self-contained HTML (4-theme, Chart.js from CDN). Rendered inside an
// admin-gated iframe in the portal — never hosted on a public URL.
const TEMPLATE = String.raw`<!doctype html>
<html class="theme-dark" lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Quote &amp; Price Change Tracker — Olympic Paints</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800;900&family=Barlow:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<style>
html.theme-dark{--p:#0D0D0B;--base:#1A1A18;--elev:#2E2E2C;--sunken:#0D0D0B;--gold:#F6C324;--text:#E8E7E2;--muted:#949390;--dim:#5C5B58;--border:rgba(255,255,255,.10);--grid:rgba(255,255,255,.06);}
html.theme-light{--p:#F7F6F3;--base:#FFFFFF;--elev:#FFFFFF;--sunken:#F0EFEA;--gold:#E6A700;--text:#0D0D0B;--muted:#5C5B58;--dim:#949390;--border:#C8C7C0;--grid:#E8E7E2;}
html.theme-brand{--p:#2B1D00;--base:#3A2800;--elev:#4A3400;--sunken:#241800;--gold:#F6C324;--text:#FFF7E0;--muted:#C9B579;--dim:#8A7838;--border:rgba(246,195,36,.20);--grid:rgba(246,195,36,.10);}
html.theme-navy{--p:#071022;--base:#0D2040;--elev:#1A3D6E;--sunken:#071022;--gold:#F6C324;--text:#FFFFFF;--muted:#B8CCE8;--dim:#6B9ED0;--border:rgba(107,158,208,.20);--grid:rgba(107,158,208,.10);}
*{box-sizing:border-box}
body{margin:0;background:var(--p);color:var(--text);font-family:'Barlow',sans-serif;}
.wrap{max-width:1180px;margin:0 auto;padding:22px 20px 60px;}
header{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:6px;}
.disc{width:40px;height:40px;border-radius:50%;background:var(--gold);flex-shrink:0;box-shadow:0 2px 10px rgba(246,195,36,.3);}
.title h1{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:26px;text-transform:uppercase;letter-spacing:.02em;margin:0;line-height:1;}
.title .sub{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:var(--gold);margin-top:4px;}
.themes{display:flex;gap:4px;background:var(--sunken);border-radius:9px;padding:4px;margin-left:auto;}
.themes button{background:transparent;border:0;color:var(--muted);border-radius:6px;padding:8px 13px;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;}
.themes button.on{background:var(--gold);color:#0D0D0B;font-weight:900;}
.gen{font-size:12px;color:var(--dim);margin:4px 0 18px;}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px;}
.kpi{background:var(--base);border:1px solid var(--border);border-radius:14px;padding:16px 18px;}
.kpi .l{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);}
.kpi .v{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:32px;line-height:1.05;margin-top:4px;color:var(--text);}
.kpi .v small{font-size:15px;color:var(--gold);font-weight:800;}
.kpi.hot .v{color:var(--gold);}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.card{background:var(--base);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px;}
.card h2{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:16px;text-transform:uppercase;letter-spacing:.04em;color:var(--gold);margin:0 0 4px;}
.card p.note{font-size:12.5px;color:var(--muted);margin:0 0 14px;}
.chart-box{position:relative;height:290px;}
table{width:100%;border-collapse:collapse;font-size:13.5px;}
th{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--base);}
td{padding:9px 10px;border-bottom:1px solid var(--grid);vertical-align:top;}
td.mono,td.num{font-variant-numeric:tabular-nums;}
td.num{text-align:center;font-weight:700;}
td.muted{color:var(--muted);max-width:280px;}
.chip{display:inline-block;background:var(--gold);color:#0D0D0B;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:11px;padding:2px 7px;border-radius:5px;letter-spacing:.03em;}
.dlref{display:block;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:10.5px;letter-spacing:.04em;color:var(--muted);margin-top:2px;}
.tablewrap{overflow-x:auto;}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;}
.filters input,.filters select{background:var(--sunken);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:9px 12px;font-family:'Barlow',sans-serif;font-size:14px;min-height:42px;}
.filters input{flex:1;min-width:180px;}
@media(max-width:820px){.grid2{grid-template-columns:1fr;}}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="disc"></div>
    <div class="title">
      <h1>Quote &amp; Price Change Tracker</h1>
      <div class="sub">Sales Admin Rework Log · Olympic Paints</div>
    </div>
    <div class="themes" role="group" aria-label="Theme">
      <button data-t="theme-light">Light</button>
      <button data-t="theme-dark" class="on">Dark</button>
      <button data-t="theme-brand">Brand</button>
      <button data-t="theme-navy">Navy</button>
    </div>
  </header>
  <div class="gen">Generated __GENERATED__ · live · admin-only</div>

  <div class="kpis">
    <div class="kpi"><div class="l">Total Change Events</div><div class="v">__TOTAL__</div></div>
    <div class="kpi hot"><div class="l">Most Rework — Rep</div><div class="v">__WORST_REP__ <small>__WORST_REP_N__</small></div></div>
    <div class="kpi hot"><div class="l">Top Reason</div><div class="v" style="font-size:19px;line-height:1.15">__TOP_REASON__ <small>__TOP_REASON_N__×</small></div></div>
    <div class="kpi"><div class="l">Deepest Revision</div><div class="v" style="font-size:19px;line-height:1.15">__DEEPEST__</div></div>
  </div>

  <div class="grid2">
    <div class="card"><h2>Rework Events by Rep</h2><p class="note">Who is generating the most quote &amp; price-list changes.</p><div class="chart-box"><canvas id="repChart"></canvas></div></div>
    <div class="card"><h2>Reason Pareto</h2><p class="note">The 80/20 — a few reasons drive most of the rework.</p><div class="chart-box"><canvas id="reasonChart"></canvas></div></div>
  </div>
  <div class="grid2">
    <div class="card"><h2>Event Type Split</h2><p class="note">New quotes vs revisions vs price-list changes vs errors.</p><div class="chart-box"><canvas id="typeChart"></canvas></div></div>
    <div class="card"><h2>Weekly Trend</h2><p class="note">Is the churn getting better or worse over time?</p><div class="chart-box"><canvas id="weekChart"></canvas></div></div>
  </div>

  <div class="card">
    <h2>All Logged Changes</h2>
    <div class="filters">
      <input id="q" placeholder="Search account, reason, note…"/>
      <select id="repf"><option value="">All reps</option></select>
      <select id="typef"><option value="">All types</option></select>
    </div>
    <div class="tablewrap">
      <table id="tbl">
        <thead><tr><th>Date</th><th>Rep</th><th>Type</th><th>Account</th><th>Reason</th><th>Rev#</th><th>By</th><th>Note</th></tr></thead>
        <tbody>__TABLE_ROWS__</tbody>
      </table>
    </div>
  </div>
</div>
<script>
const DATA = __DATA_JSON__;
const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
document.querySelectorAll('.themes button').forEach(b=>{b.onclick=()=>{document.documentElement.className=b.dataset.t;document.querySelectorAll('.themes button').forEach(x=>x.classList.remove('on'));b.classList.add('on');rebuild();};});
let charts=[];
function palette(n){const base=['#F6C324','#2D8C7A','#6B9ED0','#E86060','#C88F00','#9B59B6','#4A90A4','#E0A458'];return Array.from({length:n},(_,i)=>base[i%base.length]);}
function mk(id,cfg){const c=document.getElementById(id);const ch=new Chart(c,cfg);charts.push(ch);return ch;}
function rebuild(){
  charts.forEach(c=>c.destroy());charts=[];
  const gold=css('--gold'),text=css('--text'),muted=css('--muted'),grid=css('--grid');
  Chart.defaults.color=muted;Chart.defaults.font.family="'Barlow',sans-serif";
  mk('repChart',{type:'bar',data:{labels:DATA.rep.labels,datasets:[{data:DATA.rep.values,backgroundColor:gold,borderRadius:6}]},options:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:grid},ticks:{precision:0}},y:{grid:{display:false},ticks:{color:text,font:{weight:'600'}}}}}});
  mk('reasonChart',{data:{labels:DATA.reason.labels,datasets:[{type:'bar',data:DATA.reason.values,backgroundColor:palette(DATA.reason.labels.length),borderRadius:5,order:2},{type:'line',data:DATA.reason.cum,borderColor:gold,backgroundColor:gold,yAxisID:'y1',tension:.3,pointRadius:3,order:1}]},options:{plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:text,maxRotation:40,minRotation:20,font:{size:10}}},y:{grid:{color:grid},ticks:{precision:0}},y1:{position:'right',min:0,max:100,grid:{display:false},ticks:{callback:v=>v+'%'}}}}});
  mk('typeChart',{type:'doughnut',data:{labels:DATA.type.labels,datasets:[{data:DATA.type.values,backgroundColor:palette(DATA.type.labels.length),borderWidth:0}]},options:{plugins:{legend:{position:'right',labels:{color:text,boxWidth:12,font:{size:12}}}},cutout:'58%'}});
  mk('weekChart',{type:'line',data:{labels:DATA.week.labels,datasets:[{data:DATA.week.values,borderColor:gold,backgroundColor:'rgba(246,195,36,.15)',fill:true,tension:.3,pointRadius:3}]},options:{plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:text,font:{size:10}}},y:{grid:{color:grid},ticks:{precision:0}}}}});
}
rebuild();
const tbl=document.getElementById('tbl'),q=document.getElementById('q'),repf=document.getElementById('repf'),typef=document.getElementById('typef');
const rows=[...tbl.tBodies[0].rows];
const reps=new Set(),types=new Set();
rows.forEach(r=>{if(r.cells.length>=3){reps.add(r.cells[1].textContent.trim().split(' ')[0]);types.add(r.cells[2].textContent.trim());}});
[...reps].filter(Boolean).sort().forEach(v=>repf.add(new Option(v,v)));
[...types].filter(Boolean).sort().forEach(v=>typef.add(new Option(v,v)));
function filter(){const t=q.value.toLowerCase(),rv=repf.value,tv=typef.value;rows.forEach(r=>{if(r.cells.length<3)return;const txt=r.textContent.toLowerCase();const okT=!t||txt.includes(t);const okR=!rv||r.cells[1].textContent.trim().startsWith(rv);const okY=!tv||r.cells[2].textContent.trim()===tv;r.style.display=(okT&&okR&&okY)?'':'none';});}
[q,repf,typef].forEach(el=>el.addEventListener('input',filter));
</script>
</body>
</html>`;
