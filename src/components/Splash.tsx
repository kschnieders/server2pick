import { useT } from "../i18n";

type Props = {
  visible: boolean;
  /** 0 = checking games and rules, 1 = relay list, 2 = first ping round, 3 = done. */
  phase: 0 | 1 | 2 | 3;
  error: string | null;
};

export function Splash({ visible, phase, error }: Props) {
  const t = useT();
  const progress = [0.12, 0.38, 0.72, 1][phase];
  const step = t(`splash.step.${phase}` as "splash.step.0");

  return (
    <div
      aria-hidden={!visible}
      className={`absolute inset-0 z-50 grid place-items-center bg-ink-950 transition-opacity duration-500 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="w-72 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-glow to-amber-deep text-base font-bold text-ink-950 shadow-lg shadow-amber-deep/20">
          S2P
        </div>

        <h1 className="text-sm font-semibold">{t("app.name")}</h1>

        <div className="relative mt-5 h-1 overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-deep to-amber-glow transition-[width] duration-700 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
          {/* Light running along the filled part, so a slow step still looks alive. */}
          <div
            className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-ink-100/25 to-transparent"
            style={{ animation: "shimmer 1.8s ease-in-out infinite" }}
          />
        </div>

        <p
          className={`mt-3 text-xs ${error ? "text-rose-glow" : "text-ink-400"}`}
        >
          {error ?? step}
        </p>
      </div>
    </div>
  );
}
