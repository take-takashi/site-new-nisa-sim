import { useMemo, useState } from "react";

type SimulationPoint = {
  year: number;
  principal: number;
  value: number;
  gain: number;
};

const MAX_NISA_CONTRIBUTION = 18_000_000;
const CURRENCY_FORMATTER = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
  if (value >= 10_000) {
    return `${(value / 10_000).toLocaleString("ja-JP", {
      maximumFractionDigits: 1,
    })}万円`;
  }

  return CURRENCY_FORMATTER.format(value);
}

function simulateNisa(monthlyContribution: number, annualReturnRate: number, years: number) {
  const monthlyRate = annualReturnRate / 100 / 12;
  const points: SimulationPoint[] = [];
  let value = 0;
  let principal = 0;

  points.push({ year: 0, principal, value, gain: 0 });

  for (let month = 1; month <= years * 12; month += 1) {
    const remainingRoom = Math.max(MAX_NISA_CONTRIBUTION - principal, 0);
    const contribution = Math.min(monthlyContribution, remainingRoom);

    principal += contribution;
    value = (value + contribution) * (1 + monthlyRate);

    if (month % 12 === 0) {
      points.push({
        year: month / 12,
        principal,
        value,
        gain: Math.max(value - principal, 0),
      });
    }
  }

  return points;
}

function buildPath(
  points: SimulationPoint[],
  getValue: (point: SimulationPoint) => number,
  maxValue: number,
  width: number,
  height: number,
  padding: number,
) {
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const denominator = Math.max(points.length - 1, 1);

  return points
    .map((point, index) => {
      const x = padding + (index / denominator) * innerWidth;
      const y = padding + innerHeight - (getValue(point) / maxValue) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function App() {
  const [monthlyContribution, setMonthlyContribution] = useState(50_000);
  const [annualReturnRate, setAnnualReturnRate] = useState(5);
  const [years, setYears] = useState(20);

  const points = useMemo(
    () => simulateNisa(monthlyContribution, annualReturnRate, years),
    [monthlyContribution, annualReturnRate, years],
  );
  const finalPoint = points.at(-1) ?? { year: 0, principal: 0, value: 0, gain: 0 };
  const roomUsedRate = Math.min(finalPoint.principal / MAX_NISA_CONTRIBUTION, 1) * 100;
  const chartWidth = 920;
  const chartHeight = 360;
  const chartPadding = 44;
  const chartInnerWidth = chartWidth - chartPadding * 2;
  const chartInnerHeight = chartHeight - chartPadding * 2;
  const chartBottom = chartPadding + chartInnerHeight;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const principalPath = buildPath(
    points,
    (point) => point.principal,
    maxValue,
    chartWidth,
    chartHeight,
    chartPadding,
  );
  const valuePath = buildPath(
    points,
    (point) => point.value,
    maxValue,
    chartWidth,
    chartHeight,
    chartPadding,
  );
  const chartTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    y: chartPadding + (1 - ratio) * (chartHeight - chartPadding * 2),
    value: maxValue * ratio,
  }));
  const yearTickStep = Math.max(1, Math.ceil(years / 5));
  const yearTicks = Array.from(
    new Set([
      0,
      ...points.map((point) => point.year).filter((year) => year % yearTickStep === 0),
      years,
    ]),
  ).map((year) => ({
    year,
    x: chartPadding + (year / years) * chartInnerWidth,
  }));

  return (
    <main className="mx-auto w-[min(1180px,calc(100%-32px))] px-0 py-8 pt-10 max-[620px]:w-[min(100%-20px,1180px)] max-[620px]:pt-6">
      <section className="grid grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] items-end gap-8 px-0 pt-6 pb-8 max-[920px]:grid-cols-1 max-[620px]:gap-5 max-[620px]:pb-6">
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.08em] text-[#42635b] uppercase">
            Tax-free investment projection
          </p>
          <h1 className="mb-4 text-[clamp(2.25rem,6vw,5rem)] leading-none font-bold tracking-normal text-[#0b2f2a]">
            新NISAシミュレーター
          </h1>
          <p className="mb-0 max-w-[720px] text-[1.05rem] leading-[1.8] text-[#52605d]">
            毎月の積立額、想定利回り、運用期間から、非課税枠内での元本と評価額の推移を試算します。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-[#d7d2c4] bg-[#d7d2c4] max-[920px]:grid-cols-1">
          <div className="min-w-0 bg-[#fffdf8] p-[18px]">
            <span className="text-[0.84rem] font-bold text-[#66736f]">最終評価額</span>
            <strong className="mt-2 block text-[clamp(1.15rem,2vw,1.7rem)] leading-[1.15] font-extrabold text-[#0f3d36]">
              {formatCurrency(finalPoint.value)}
            </strong>
          </div>
          <div className="min-w-0 bg-[#fffdf8] p-[18px]">
            <span className="text-[0.84rem] font-bold text-[#66736f]">投資元本</span>
            <strong className="mt-2 block text-[clamp(1.15rem,2vw,1.7rem)] leading-[1.15] font-extrabold text-[#0f3d36]">
              {formatCurrency(finalPoint.principal)}
            </strong>
          </div>
          <div className="min-w-0 bg-[#fffdf8] p-[18px]">
            <span className="text-[0.84rem] font-bold text-[#66736f]">運用益</span>
            <strong className="mt-2 block text-[clamp(1.15rem,2vw,1.7rem)] leading-[1.15] font-extrabold text-[#0f3d36]">
              {formatCurrency(finalPoint.gain)}
            </strong>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-[340px_minmax(0,1fr)] items-stretch gap-6 max-[920px]:grid-cols-1">
        <form
          className="grid content-start gap-6 rounded-lg border border-[#d8d3c6] bg-[#fffdf8] p-6 shadow-[0_18px_40px_rgb(55_63_59_/_8%)] max-[620px]:p-[18px]"
          aria-label="シミュレーション条件"
        >
          <label className="grid gap-2.5">
            <span className="text-[0.84rem] font-bold text-[#66736f]">毎月の積立額</span>
            <output className="text-[1.45rem] font-extrabold text-[#143c36]">
              {formatCurrency(monthlyContribution)}
            </output>
            <input
              className="w-full accent-[#177763]"
              type="range"
              min="10000"
              max="300000"
              step="10000"
              value={monthlyContribution}
              onChange={(event) => setMonthlyContribution(Number(event.target.value))}
            />
          </label>

          <label className="grid gap-2.5">
            <span className="text-[0.84rem] font-bold text-[#66736f]">想定年率</span>
            <output className="text-[1.45rem] font-extrabold text-[#143c36]">
              {annualReturnRate.toFixed(1)}%
            </output>
            <input
              className="w-full accent-[#177763]"
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={annualReturnRate}
              onChange={(event) => setAnnualReturnRate(Number(event.target.value))}
            />
          </label>

          <label className="grid gap-2.5">
            <span className="text-[0.84rem] font-bold text-[#66736f]">運用期間</span>
            <output className="text-[1.45rem] font-extrabold text-[#143c36]">{years}年</output>
            <input
              className="w-full accent-[#177763]"
              type="range"
              min="1"
              max="40"
              step="1"
              value={years}
              onChange={(event) => setYears(Number(event.target.value))}
            />
          </label>

          <div className="grid gap-3 pt-2">
            <div className="flex justify-between gap-3">
              <span className="text-[0.84rem] font-bold text-[#66736f]">生涯投資枠の利用率</span>
              <strong className="text-[#143c36]">{roomUsedRate.toFixed(1)}%</strong>
            </div>
            <progress className="nisa-progress" value={roomUsedRate} max="100" />
          </div>
        </form>

        <section
          className="min-w-0 rounded-lg border border-[#d8d3c6] bg-[#fffdf8] p-6 shadow-[0_18px_40px_rgb(55_63_59_/_8%)] max-[620px]:p-[18px]"
          aria-label="資産推移グラフ"
        >
          <div className="mb-3 flex justify-between gap-5 max-[620px]:grid">
            <div>
              <h2 className="mb-1.5 text-[1.2rem] font-bold text-[#102b27]">資産推移</h2>
              <p className="mb-0 text-[0.84rem] font-bold text-[#66736f]">
                年間末時点の評価額と投資元本
              </p>
            </div>
            <div className="flex content-start justify-end gap-3.5 text-sm font-bold text-[#43504c] max-[620px]:justify-start">
              <span className="inline-flex items-center gap-2">
                <span className="h-[3px] w-6 bg-[#177763]" aria-hidden="true" />
                評価額
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-[3px] w-6 bg-[#d3922d]" aria-hidden="true" />
                投資元本
              </span>
            </div>
          </div>

          <svg
            className="block h-auto w-full"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            role="img"
            aria-label="資産推移"
          >
            <title>新NISAの資産推移</title>
            {chartTicks.map((tick) => (
              <g key={tick.y}>
                <line
                  x1={chartPadding}
                  x2={chartWidth - chartPadding}
                  y1={tick.y}
                  y2={tick.y}
                  className="stroke-[#e4ded0] stroke-1"
                />
                <text
                  className="fill-[#7a837f] text-[13px] font-bold max-[620px]:text-[11px]"
                  x={chartPadding - 10}
                  y={tick.y + 4}
                  textAnchor="end"
                >
                  {formatCurrency(tick.value)}
                </text>
              </g>
            ))}
            <line
              x1={chartPadding}
              x2={chartWidth - chartPadding}
              y1={chartBottom}
              y2={chartBottom}
              className="stroke-[#cfc8b8] stroke-2"
            />
            {yearTicks.map((tick) => (
              <g key={tick.year}>
                <line
                  x1={tick.x}
                  x2={tick.x}
                  y1={chartBottom}
                  y2={chartBottom + 7}
                  className="stroke-[#cfc8b8] stroke-2"
                />
                <text
                  className="fill-[#66736f] text-[13px] font-bold max-[620px]:text-[11px]"
                  x={tick.x}
                  y={chartBottom + 26}
                  textAnchor="middle"
                >
                  {tick.year}年
                </text>
              </g>
            ))}
            <path
              d={principalPath}
              className="fill-none stroke-[#d3922d] stroke-4 [stroke-dasharray:9_9] [stroke-linecap:round] [stroke-linejoin:round]"
            />
            <path
              d={valuePath}
              className="fill-none stroke-[#177763] stroke-5 [stroke-linecap:round] [stroke-linejoin:round]"
            />
            <circle
              cx={chartWidth - chartPadding}
              cy={
                chartPadding +
                (chartHeight - chartPadding * 2) -
                (finalPoint.value / maxValue) * (chartHeight - chartPadding * 2)
              }
              r="6"
              className="fill-[#fffdf8] stroke-[#177763] stroke-4"
            />
          </svg>
        </section>
      </section>

      <p className="mt-[22px] mb-0 text-[0.86rem] leading-[1.7] text-[#66736f]">
        この試算は入力値をもとにした概算です。手数料、税制変更、価格変動、売却タイミングは考慮していません。
      </p>
    </main>
  );
}

export default App;
