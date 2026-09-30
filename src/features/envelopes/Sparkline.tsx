const W = 46
const H = 18
const PAD = 2

/**
 * Six months of one envelope, normalised against its own peak so the shape is
 * about that envelope's rhythm rather than its size relative to others.
 */
export default function Sparkline({ values, color }: { values: number[]; color: string }) {
  const peak = Math.max(...values)
  const step = values.length > 1 ? (W - PAD * 2) / (values.length - 1) : 0

  const points = values.map((v, i) => {
    const x = PAD + i * step
    const y = peak > 0 ? H - PAD - (v / peak) * (H - PAD * 2) : H - PAD
    return [x, y] as const
  })

  const last = points[points.length - 1]

  return (
    <svg width={W} height={H} aria-hidden="true" focusable="false">
      <polyline
        points={points.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none"
        stroke={peak > 0 ? color : 'var(--border-strong)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {peak > 0 && <circle cx={last[0]} cy={last[1]} r="2" fill={color} />}
    </svg>
  )
}
