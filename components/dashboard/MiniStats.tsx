interface Stat {
  label: string
  value: number | string
}

export default function MiniStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center rounded-2xl border border-border bg-surface p-3 card-shadow">
          <p className="text-lg font-bold tabular-nums text-foreground leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 text-center leading-tight">{label}</p>
        </div>
      ))}
    </div>
  )
}
