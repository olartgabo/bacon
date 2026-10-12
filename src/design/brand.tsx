import { LOCKUP_BOX, MARK, MARK_BOX, WORDMARK } from "./brand-paths.generated";

const box = (b: { x: number; y: number; w: number; h: number }) =>
  `${b.x} ${b.y} ${b.w} ${b.h}`;

/** The mark's two dark arcs follow `--ink`, so they turn cream in dark
 * mode the way the inverted tiles on the brand sheet do. Strips and dot
 * stay brand red in both themes. */
function MarkPaths({ arcs = "var(--ink)" }: { arcs?: string }) {
  return (
    <>
      <path d={MARK.dot} fill="var(--brand)" />
      <path d={MARK.arcTop} fill={arcs} />
      <path d={MARK.stripTop} fill="var(--brand)" />
      <path d={MARK.stripBottom} fill="var(--brand)" />
      <path d={MARK.arcBottom} fill={arcs} />
    </>
  );
}

export function BaconMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox={box(MARK_BOX)}
      height={size}
      width={(size * MARK_BOX.w) / MARK_BOX.h}
      className={className}
      aria-hidden
      focusable="false"
    >
      <MarkPaths />
    </svg>
  );
}

export function BaconLockup({ height = 28, className }: { height?: number; className?: string }) {
  return (
    <svg
      viewBox={box(LOCKUP_BOX)}
      height={height}
      width={(height * LOCKUP_BOX.w) / LOCKUP_BOX.h}
      className={className}
      role="img"
      aria-label="bacon"
    >
      <MarkPaths />
      {WORDMARK.map((d) => (
        <path key={d.slice(0, 16)} d={d} fill="var(--ink)" />
      ))}
    </svg>
  );
}

/** Mark on a solid tile: ink in light mode, cream in dark mode, matching
 * the two tile treatments on the brand sheet. `shape="circle"` is the avatar
 * variant from the brand sheet, used for agent identities. */
export function BaconAppIcon({
  size = 40,
  shape = "square",
  className,
}: {
  size?: number;
  shape?: "square" | "circle";
  className?: string;
}) {
  const s = 100;
  const pad = shape === "circle" ? 24 : 20;
  const scale = (s - 2 * pad) / MARK_BOX.h;
  const tx = (s - MARK_BOX.w * scale) / 2 - MARK_BOX.x * scale;
  const ty = (s - MARK_BOX.h * scale) / 2 - MARK_BOX.y * scale;
  return (
    <svg
      viewBox={`0 0 ${s} ${s}`}
      width={size}
      height={size}
      className={className}
      aria-hidden
      focusable="false"
    >
      {shape === "circle" ? (
        <circle cx={s / 2} cy={s / 2} r={s / 2} fill="var(--solid)" />
      ) : (
        <rect width={s} height={s} rx={22} fill="var(--solid)" />
      )}
      <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
        <MarkPaths arcs="var(--on-solid)" />
      </g>
    </svg>
  );
}
