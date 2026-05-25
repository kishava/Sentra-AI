import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const cells = [
  ["Pricing", 88],
  ["Hiring", 64],
  ["Sentiment", 91],
  ["Launches", 76],
  ["Regulatory", 47],
  ["Supply", 59],
  ["Search", 72],
  ["Funding", 53],
  ["Security", 68],
];

export function RiskHeatmap() {
  return (
    <Card className="p-6" glow>
      <p className="text-sm uppercase tracking-[0.24em] text-white/35">Risk heatmap</p>
      <h3 className="mt-2 text-2xl font-semibold text-white">Surface pressure</h3>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {cells.map(([label, value]) => (
          <div
            key={label}
            className={cn(
              "rounded-2xl border p-4",
              Number(value) > 80
                ? "border-rose-300/25 bg-rose-400/15"
                : Number(value) > 65
                  ? "border-amber-300/25 bg-amber-400/12"
                  : "border-cyan-300/20 bg-cyan-400/10",
            )}
          >
            <p className="text-sm text-white/60">{label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
