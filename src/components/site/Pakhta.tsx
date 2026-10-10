/** Cobalt "pakhta" cotton pattern from Central Asian teapots — used only as a band divider. */
export function Pakhta({ id, height = 40 }: { id: string; height?: number }) {
  const s = height;
  const r = s * 0.105;
  return (
    <svg width="100%" height={s} aria-hidden="true" className="block">
      <defs>
        <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse">
          <rect width={s} height={s} fill="#1D3A8F" />
          <path d={`M0 ${s / 2} L${s / 2} 0 L${s} ${s / 2} L${s / 2} ${s} Z`} fill="none" stroke="#E3B03C" strokeWidth={s / 27} />
          <g fill="#FFFFFF" stroke="#E3B03C" strokeWidth={s / 40}>
            <circle cx={s / 2} cy={s * 0.375} r={r} />
            <circle cx={s / 2} cy={s * 0.625} r={r} />
            <circle cx={s * 0.375} cy={s / 2} r={r} />
            <circle cx={s * 0.625} cy={s / 2} r={r} />
          </g>
          <circle cx={s / 2} cy={s / 2} r={s / 20} fill="#E3B03C" />
        </pattern>
      </defs>
      <rect width="100%" height={s} fill={`url(#${id})`} />
    </svg>
  );
}
