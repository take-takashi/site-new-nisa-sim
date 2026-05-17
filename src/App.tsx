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

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Tax-free investment projection</p>
          <h1>新NISAシミュレーター</h1>
          <p className="lead">
            毎月の積立額、想定利回り、運用期間から、非課税枠内での元本と評価額の推移を試算します。
          </p>
        </div>
        <div className="summary-grid">
          <div>
            <span>最終評価額</span>
            <strong>{formatCurrency(finalPoint.value)}</strong>
          </div>
          <div>
            <span>投資元本</span>
            <strong>{formatCurrency(finalPoint.principal)}</strong>
          </div>
          <div>
            <span>運用益</span>
            <strong>{formatCurrency(finalPoint.gain)}</strong>
          </div>
        </div>
      </section>

      <section className="simulator-layout">
        <form className="controls" aria-label="シミュレーション条件">
          <label>
            <span>毎月の積立額</span>
            <output>{formatCurrency(monthlyContribution)}</output>
            <input
              type="range"
              min="10000"
              max="300000"
              step="10000"
              value={monthlyContribution}
              onChange={(event) => setMonthlyContribution(Number(event.target.value))}
            />
          </label>

          <label>
            <span>想定年率</span>
            <output>{annualReturnRate.toFixed(1)}%</output>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={annualReturnRate}
              onChange={(event) => setAnnualReturnRate(Number(event.target.value))}
            />
          </label>

          <label>
            <span>運用期間</span>
            <output>{years}年</output>
            <input
              type="range"
              min="1"
              max="40"
              step="1"
              value={years}
              onChange={(event) => setYears(Number(event.target.value))}
            />
          </label>

          <div className="nisa-room">
            <div>
              <span>生涯投資枠の利用率</span>
              <strong>{roomUsedRate.toFixed(1)}%</strong>
            </div>
            <progress value={roomUsedRate} max="100" />
          </div>
        </form>

        <section className="chart-panel" aria-label="資産推移グラフ">
          <div className="chart-header">
            <div>
              <h2>資産推移</h2>
              <p>年間末時点の評価額と投資元本</p>
            </div>
            <div className="legend">
              <span className="value-line">評価額</span>
              <span className="principal-line">投資元本</span>
            </div>
          </div>

          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="資産推移">
            <title>新NISAの資産推移</title>
            {chartTicks.map((tick) => (
              <g key={tick.y}>
                <line
                  x1={chartPadding}
                  x2={chartWidth - chartPadding}
                  y1={tick.y}
                  y2={tick.y}
                  className="grid-line"
                />
                <text x={chartPadding - 10} y={tick.y + 4} textAnchor="end">
                  {formatCurrency(tick.value)}
                </text>
              </g>
            ))}
            <path d={principalPath} className="principal-path" />
            <path d={valuePath} className="value-path" />
            <circle
              cx={chartWidth - chartPadding}
              cy={
                chartPadding +
                (chartHeight - chartPadding * 2) -
                (finalPoint.value / maxValue) * (chartHeight - chartPadding * 2)
              }
              r="6"
              className="endpoint"
            />
          </svg>
        </section>
      </section>

      <p className="disclaimer">
        この試算は入力値をもとにした概算です。手数料、税制変更、価格変動、売却タイミングは考慮していません。
      </p>
    </main>
  );
}

export default App;
