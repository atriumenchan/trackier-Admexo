type Point = { day: string; clicks: number; conversions: number; revenue: number; payout: number };

function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const scaled = value / power;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * power;
}

function labelEvery(count: number) {
  return count <= 8 ? 1 : count <= 16 ? 2 : Math.ceil(count / 8);
}

export function TrafficChart({ points, height = 220 }: { points: Point[]; height?: number }) {
  const width = 720;
  const pad = { top: 12, right: 40, bottom: 26, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxClicks = niceMax(Math.max(...points.map((p) => p.clicks), 0));
  const maxConv = niceMax(Math.max(...points.map((p) => p.conversions), 0));
  const slot = innerW / Math.max(points.length, 1);
  const barW = Math.max(4, Math.min(28, slot * 0.56));
  const x = (index: number) => pad.left + slot * index + slot / 2;
  const yClicks = (value: number) => pad.top + innerH - (value / maxClicks) * innerH;
  const yConv = (value: number) => pad.top + innerH - (value / maxConv) * innerH;
  const line = points.map((p, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${yConv(p.conversions).toFixed(1)}`).join(" ");
  const every = labelEvery(points.length);
  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Clicks and conversions by day">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH * (1 - tick)} y2={pad.top + innerH * (1 - tick)} stroke="var(--border)" strokeDasharray={tick ? "3 4" : undefined} />
            <text x={pad.left - 8} y={pad.top + innerH * (1 - tick) + 4} textAnchor="end" fontSize="10.5" fill="var(--text-faint)">{Math.round(maxClicks * tick)}</text>
            <text x={width - pad.right + 8} y={pad.top + innerH * (1 - tick) + 4} fontSize="10.5" fill="var(--text-faint)">{Math.round(maxConv * tick)}</text>
          </g>
        ))}
        {points.map((p, index) => (
          <g key={p.day}>
            <rect x={x(index) - barW / 2} y={yClicks(p.clicks)} width={barW} height={Math.max(0, pad.top + innerH - yClicks(p.clicks))} rx={3} fill="var(--brand)" opacity={0.85}>
              <title>{`${p.day}: ${p.clicks} clicks, ${p.conversions} conversions`}</title>
            </rect>
            {index % every === 0 || index === points.length - 1 ? (
              <text x={x(index)} y={height - 8} textAnchor="middle" fontSize="10.5" fill="var(--text-faint)">{p.day}</text>
            ) : null}
          </g>
        ))}
        <path d={line} fill="none" stroke="var(--success)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, index) => (
          <circle key={`c-${p.day}`} cx={x(index)} cy={yConv(p.conversions)} r={2.6} fill="var(--surface)" stroke="var(--success)" strokeWidth={1.6} />
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-brand" />Clicks (left axis)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-success" />Conversions (right axis)</span>
      </figcaption>
    </figure>
  );
}

export function MoneyChart({ points, height = 250, currency }: { points: Point[]; height?: number; currency: string }) {
  const width = 380;
  const pad = { top: 10, right: 14, bottom: 24, left: 44 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...points.map((p) => p.revenue), 0));
  const x = (index: number) => pad.left + (points.length > 1 ? (innerW * index) / (points.length - 1) : innerW / 2);
  const y = (value: number) => pad.top + innerH - (value / max) * innerH;
  const path = (key: "revenue" | "payout") => points.map((p, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const area = `${path("revenue")} L${x(points.length - 1).toFixed(1)},${pad.top + innerH} L${x(0).toFixed(1)},${pad.top + innerH} Z`;
  const every = Math.max(1, Math.ceil(points.length / 4));
  const symbol = currency === "USD" ? "$" : currency === "INR" ? "₹" : currency === "EUR" ? "€" : "";
  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Revenue and payout by day">
        <defs>
          <linearGradient id="rev-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--brand)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(max * tick)} y2={y(max * tick)} stroke="var(--border)" strokeDasharray={tick ? "3 4" : undefined} />
            <text x={pad.left - 8} y={y(max * tick) + 4} textAnchor="end" fontSize="10.5" fill="var(--text-faint)">{symbol}{Math.round(max * tick)}</text>
          </g>
        ))}
        <path d={area} fill="url(#rev-fill)" />
        <path d={path("revenue")} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" />
        <path d={path("payout")} fill="none" stroke="var(--warning)" strokeWidth={1.8} strokeDasharray="5 4" strokeLinejoin="round" />
        {points.map((p, index) => (
          <g key={p.day}>
            <circle cx={x(index)} cy={y(p.revenue)} r={7} fill="transparent"><title>{`${p.day}: revenue ${symbol}${p.revenue.toFixed(2)}, payout ${symbol}${p.payout.toFixed(2)}`}</title></circle>
            {index % every === 0 || index === points.length - 1 ? <text x={x(index)} y={height - 7} textAnchor="middle" fontSize="10.5" fill="var(--text-faint)">{p.day}</text> : null}
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-brand" />Revenue</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full border-t-2 border-dashed border-warning" />Payout</span>
      </figcaption>
    </figure>
  );
}

export function ShareBar({ value, max, tone = "brand" }: { value: number; max: number; tone?: "brand" | "success" }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <span className={`block h-full rounded-full ${tone === "brand" ? "bg-brand" : "bg-success"}`} style={{ width: `${pct}%` }} />
    </span>
  );
}
