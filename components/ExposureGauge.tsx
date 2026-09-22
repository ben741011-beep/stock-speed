export function ExposureGauge({
  ratio,
  label = "EFFECTIVE EXPOSURE",
}: {
  ratio: number;
  label?: string;
}) {
  const bounded = Math.min(Math.max(ratio, 0), 200);
  const dialAngle = 135 + (bounded / 200) * 270;
  const rotation = dialAngle + 90;
  const ticks = Array.from({ length: 41 }, (_, index) => index * 5);
  const labels = Array.from({ length: 11 }, (_, index) => index * 20);

  return (
    <div className="mx-auto w-full min-w-0 max-w-md">
      <svg viewBox="0 0 320 320" className="block h-auto w-full max-w-full" role="img" aria-label={`曝險比例 ${ratio.toFixed(1)}%`}>
        <defs><filter id="exposure-gauge-shadow"><feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity=".3" /></filter></defs>
        <circle cx="160" cy="160" r="150" fill="#020617" stroke="#334155" strokeWidth="2" />
        <circle cx="160" cy="160" r="137" fill="#050505" stroke="#0f172a" strokeWidth="3" />
        {ticks.map((tick) => <g key={tick} transform={`rotate(${135 + (tick / 200) * 270 + 90} 160 160)`}><line x1="160" y1="26" x2="160" y2={tick % 20 === 0 ? "46" : "37"} stroke={tick % 20 === 0 ? "#f8fafc" : "#94a3b8"} strokeWidth={tick % 20 === 0 ? "2.5" : "1"} strokeLinecap="round" /></g>)}
        {labels.map((tick) => <g key={tick} transform={`rotate(${225 + (tick * 27) / 20} 160 160)`}><text x="160" y="61" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="700">{tick}</text></g>)}
        <g transform={`rotate(${rotation} 160 160)`} filter="url(#exposure-gauge-shadow)"><path d="M153 160 L160 86 L167 160 Z" fill="#a855f7" /><path d="M156 160 L160 105 L164 160 Z" fill="#d8b4fe" /></g>
        <circle cx="160" cy="160" r="18" fill="#18181b" stroke="#27272a" strokeWidth="2" /><circle cx="160" cy="160" r="7" fill="#09090b" />
      </svg>
      <div className="-mt-3 text-center">
        <p className="text-4xl font-extrabold tracking-tight text-white">{ratio.toFixed(1)}%</p>
        <p className="mt-1 text-[10px] font-bold tracking-[0.17em] text-zinc-400">{label}</p>
        {ratio > 200 ? <p className="mt-2 text-xs font-bold text-rose-300">已超過時速表 200% 上限</p> : null}
      </div>
    </div>
  );
}
