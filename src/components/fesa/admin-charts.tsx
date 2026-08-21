import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name?: string; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lift">
      {label && <p className="font-medium text-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          {p.name ? `${p.name}: ` : ""}
          <span className="font-semibold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function TrendSparkline({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={72}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
        <Area
          type="monotone"
          dataKey="value"
          name="Inscriptions"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#trendFill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ProfileBarTick(props: {
  x?: number;
  y?: number;
  payload?: { value: string };
  data: { label: string; value: number; color: string }[];
}) {
  const { x = 0, y = 0, payload, data } = props;
  const value = data.find((d) => d.label === payload?.value)?.value ?? 0;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="var(--muted-foreground)" fontSize={11}>
        {payload?.value}
      </text>
      <text x={0} y={0} dy={28} textAnchor="middle" fill="var(--foreground)" fontSize={13} fontWeight={700}>
        {value}
      </text>
    </g>
  );
}

export function ProfileBarChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 8 }} barCategoryGap="28%">
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          height={44}
          tick={(props) => <ProfileBarTick {...props} data={data} />}
        />
        <YAxis hide />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--secondary)" }} />
        <Bar dataKey="value" name="Inscriptions" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PaymentsDonut({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative w-[120px] shrink-0">
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={40}
              outerRadius={56}
              strokeWidth={2}
              stroke="var(--card)"
            >
              {data.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-bold text-foreground">{total}</span>
          <span className="text-[10px] text-muted-foreground">total</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {data.map((d) => (
          <li key={d.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="truncate">{d.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-foreground">{d.value}</span>
          </li>
        ))}
        {data.length === 0 && <li className="text-sm text-muted-foreground">Aucune transaction</li>}
      </ul>
    </div>
  );
}

export function EventHealthRadar({ data }: { data: { metric: string; value: number }[] }) {
  const score = data.length ? Math.round(data.reduce((s, d) => s + d.value, 0) / data.length) : 0;
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl font-bold text-foreground">{score}</span>
        <span className="text-sm text-muted-foreground">/ 100</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <Radar
            dataKey="value"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="var(--chart-1)"
            fillOpacity={0.28}
          />
          <Tooltip content={<ChartTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
