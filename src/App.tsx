import { useMemo, useState } from "react";

type SimulationPoint = {
  year: number;
  principal: number;
  value: number;
  gain: number;
};

type HouseholdType = "single" | "couple";

type MemberInput = {
  monthlyContribution: number;
  annualReturnRate: number;
};

const MAX_NISA_CONTRIBUTION = 18_000_000;
const CURRENCY_FORMATTER = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});
const DEFAULT_AXIS_MAX_MAN_YEN = 2_500;
const Y_AXIS_TICK_COUNT = 5;

function formatCurrency(value: number): string {
  if (value >= 10_000) {
    return `${Math.round(value / 10_000).toLocaleString("ja-JP")}万円`;
  }

  return CURRENCY_FORMATTER.format(value);
}

function formatAxisCurrency(value: number): string {
  if (value >= 10_000) {
    return `${Math.round(value / 10_000).toLocaleString("ja-JP")}万円`;
  }

  return CURRENCY_FORMATTER.format(value);
}

function simulateMember(input: MemberInput, totalYears: number) {
  const monthlyRate = input.annualReturnRate / 100 / 12;
  const points: SimulationPoint[] = [];
  let value = 0;
  let principal = 0;

  points.push({ year: 0, principal, value, gain: 0 });

  for (let month = 1; month <= totalYears * 12; month += 1) {
    const remainingRoom = Math.max(MAX_NISA_CONTRIBUTION - principal, 0);
    const contribution = Math.min(input.monthlyContribution, remainingRoom);

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

function combinePoints(pointGroups: SimulationPoint[][]) {
  const pointCount = Math.max(...pointGroups.map((points) => points.length));

  return Array.from({ length: pointCount }, (_, index) => {
    const points = pointGroups.map((group) => group[index] ?? group.at(-1));
    const principal = points.reduce((sum, point) => sum + (point?.principal ?? 0), 0);
    const value = points.reduce((sum, point) => sum + (point?.value ?? 0), 0);

    return {
      year: points[0]?.year ?? index,
      principal,
      value,
      gain: Math.max(value - principal, 0),
    };
  });
}

function buildPath(
  points: SimulationPoint[],
  getValue: (point: SimulationPoint) => number,
  maxValue: number,
  width: number,
  height: number,
  paddingX: number,
  paddingY: number,
) {
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const denominator = Math.max(points.length - 1, 1);

  return points
    .map((point, index) => {
      const x = paddingX + (index / denominator) * innerWidth;
      const y = paddingY + innerHeight - (getValue(point) / maxValue) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function getPointPosition(
  point: SimulationPoint,
  years: number,
  maxValue: number,
  innerWidth: number,
  innerHeight: number,
  paddingX: number,
  paddingY: number,
) {
  return {
    x: paddingX + (point.year / years) * innerWidth,
    y: paddingY + innerHeight - (point.value / maxValue) * innerHeight,
  };
}

function App() {
  const [householdType, setHouseholdType] = useState<HouseholdType>("single");
  const [monthlyContribution, setMonthlyContribution] = useState(50_000);
  const [annualReturnRate, setAnnualReturnRate] = useState(5);
  const [years, setYears] = useState(20);
  const [partnerMonthlyContribution, setPartnerMonthlyContribution] = useState(50_000);
  const [partnerAnnualReturnRate, setPartnerAnnualReturnRate] = useState(5);
  const [axisMaxManYen, setAxisMaxManYen] = useState(DEFAULT_AXIS_MAX_MAN_YEN);
  const [showPrimaryInputs, setShowPrimaryInputs] = useState(true);
  const [activeYear, setActiveYear] = useState<number | null>(null);

  const totalYears = years;
  const points = useMemo(() => {
    const primaryPoints = simulateMember({ monthlyContribution, annualReturnRate }, totalYears);

    if (householdType === "single") {
      return primaryPoints;
    }

    const partnerPoints = simulateMember(
      {
        monthlyContribution: partnerMonthlyContribution,
        annualReturnRate: partnerAnnualReturnRate,
      },
      totalYears,
    );

    return combinePoints([primaryPoints, partnerPoints]);
  }, [
    householdType,
    monthlyContribution,
    annualReturnRate,
    partnerMonthlyContribution,
    partnerAnnualReturnRate,
    totalYears,
  ]);
  const finalPoint = points.at(-1) ?? { year: 0, principal: 0, value: 0, gain: 0 };
  const chartWidth = 920;
  const chartHeight = 360;
  const chartPaddingX = 96;
  const chartPaddingY = 44;
  const chartInnerWidth = chartWidth - chartPaddingX * 2;
  const chartInnerHeight = chartHeight - chartPaddingY * 2;
  const chartBottom = chartPaddingY + chartInnerHeight;
  const maxValue = axisMaxManYen * 10_000;
  const tickStep = maxValue / Y_AXIS_TICK_COUNT;
  const principalPath = buildPath(
    points,
    (point) => point.principal,
    maxValue,
    chartWidth,
    chartHeight,
    chartPaddingX,
    chartPaddingY,
  );
  const valuePath = buildPath(
    points,
    (point) => point.value,
    maxValue,
    chartWidth,
    chartHeight,
    chartPaddingX,
    chartPaddingY,
  );
  const chartTicks = Array.from({ length: Y_AXIS_TICK_COUNT + 1 }, (_, index) => ({
    y: chartPaddingY + (1 - index / Y_AXIS_TICK_COUNT) * chartInnerHeight,
    value: tickStep * index,
  }));
  const yearTickStep = Math.max(1, Math.ceil(totalYears / 5));
  const yearTicks = Array.from(
    new Set([
      0,
      ...points.map((point) => point.year).filter((year) => year % yearTickStep === 0),
      totalYears,
    ]),
  ).map((year) => ({
    year,
    x: chartPaddingX + (year / totalYears) * chartInnerWidth,
  }));
  const activePoint = points.find((point) => point.year === activeYear) ?? finalPoint;
  const activePosition = getPointPosition(
    activePoint,
    totalYears,
    maxValue,
    chartInnerWidth,
    chartInnerHeight,
    chartPaddingX,
    chartPaddingY,
  );
  const tooltipWidth = 190;
  const tooltipHeight = 122;
  const tooltipX = Math.min(
    Math.max(activePosition.x + 16, chartPaddingX),
    chartWidth - chartPaddingX - tooltipWidth,
  );
  const tooltipY = Math.max(activePosition.y - tooltipHeight - 14, chartPaddingY);

  const selectNearestPoint = (clientX: number, svgElement: SVGSVGElement) => {
    const { left, width } = svgElement.getBoundingClientRect();
    const svgX = ((clientX - left) / width) * chartWidth;
    const year = Math.round(((svgX - chartPaddingX) / chartInnerWidth) * totalYears);
    setActiveYear(Math.min(Math.max(year, 0), totalYears));
  };

  return (
    <main className="mx-auto w-[min(1180px,calc(100%-32px))] px-0 py-8 pt-10 max-[620px]:w-[min(100%-20px,1180px)] max-[620px]:pt-6">
      <section className="grid grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] items-end gap-8 px-0 pt-6 pb-8 max-[920px]:grid-cols-1 max-[620px]:gap-5 max-[620px]:pb-6">
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.08em] text-[#42635b] uppercase">
            Tax-free investment projection
          </p>
          <h1 className="mb-4 text-[clamp(1.75rem,4vw,3.75rem)] leading-none font-bold tracking-normal text-[#0b2f2a] [word-break:keep-all]">
            新NISAシミュレーター
          </h1>
          <p className="mb-0 max-w-[720px] text-[1.05rem] leading-[1.8] text-[#52605d]">
            毎月の積立額、想定利回り、運用期間から、非課税枠内での元本と評価額の推移を試算します。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-[#d7d2c4] bg-[#d7d2c4] max-[920px]:grid-cols-1">
          <div className="min-w-0 bg-[#fffdf8] p-[18px]">
            <span className="text-[0.84rem] font-bold text-[#66736f]">最終評価額</span>
            <strong className="mt-2 block text-[clamp(1rem,1.45vw,1.35rem)] leading-[1.15] font-extrabold whitespace-nowrap text-[#0f3d36]">
              {formatCurrency(finalPoint.value)}
            </strong>
          </div>
          <div className="min-w-0 bg-[#fffdf8] p-[18px]">
            <span className="text-[0.84rem] font-bold text-[#66736f]">
              {householdType === "couple" ? "世帯元本" : "投資元本"}
            </span>
            <strong className="mt-2 block text-[clamp(1rem,1.45vw,1.35rem)] leading-[1.15] font-extrabold whitespace-nowrap text-[#0f3d36]">
              {formatCurrency(finalPoint.principal)}
            </strong>
          </div>
          <div className="min-w-0 bg-[#fffdf8] p-[18px]">
            <span className="text-[0.84rem] font-bold text-[#66736f]">運用益</span>
            <strong className="mt-2 block text-[clamp(1rem,1.45vw,1.35rem)] leading-[1.15] font-extrabold whitespace-nowrap text-[#0f3d36]">
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
          <div className="grid gap-2.5">
            <span className="text-[0.84rem] font-bold text-[#66736f]">世帯タイプ</span>
            <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-[#d8d3c6] bg-[#f5f3ed] p-1">
              <button
                className={`rounded-md px-3 py-2 text-sm font-bold transition ${
                  householdType === "single"
                    ? "bg-[#177763] text-white shadow-sm"
                    : "text-[#52605d]"
                }`}
                type="button"
                onClick={() => setHouseholdType("single")}
              >
                一人
              </button>
              <button
                className={`rounded-md px-3 py-2 text-sm font-bold transition ${
                  householdType === "couple"
                    ? "bg-[#177763] text-white shadow-sm"
                    : "text-[#52605d]"
                }`}
                type="button"
                onClick={() => setHouseholdType("couple")}
              >
                二人
              </button>
            </div>
          </div>

          {householdType === "couple" ? (
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold text-[#143c36]">1人目</h3>
              <label className="inline-flex items-center gap-2 text-xs font-bold text-[#66736f]">
                <input
                  className="size-4 accent-[#177763]"
                  type="checkbox"
                  checked={showPrimaryInputs}
                  onChange={(event) => setShowPrimaryInputs(event.target.checked)}
                />
                条件を表示
              </label>
            </div>
          ) : null}

          {householdType === "single" || showPrimaryInputs ? (
            <>
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
            </>
          ) : null}

          {householdType === "couple" ? (
            <div className="grid gap-6 border-t border-[#e4ded0] pt-5">
              <h3 className="mb-[-10px] text-sm font-extrabold text-[#143c36]">2人目</h3>

              <label className="grid gap-2.5">
                <span className="text-[0.84rem] font-bold text-[#66736f]">毎月の積立額</span>
                <output className="text-[1.45rem] font-extrabold text-[#143c36]">
                  {formatCurrency(partnerMonthlyContribution)}
                </output>
                <input
                  className="w-full accent-[#177763]"
                  type="range"
                  min="10000"
                  max="300000"
                  step="10000"
                  value={partnerMonthlyContribution}
                  onChange={(event) => setPartnerMonthlyContribution(Number(event.target.value))}
                />
              </label>

              <label className="grid gap-2.5">
                <span className="text-[0.84rem] font-bold text-[#66736f]">想定年率</span>
                <output className="text-[1.45rem] font-extrabold text-[#143c36]">
                  {partnerAnnualReturnRate.toFixed(1)}%
                </output>
                <input
                  className="w-full accent-[#177763]"
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={partnerAnnualReturnRate}
                  onChange={(event) => setPartnerAnnualReturnRate(Number(event.target.value))}
                />
              </label>
            </div>
          ) : null}

          <div className="grid gap-6 border-t border-[#e4ded0] pt-5">
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

            <label className="grid gap-2.5">
              <span className="text-[0.84rem] font-bold text-[#66736f]">縦軸の上限</span>
              <output className="text-[1.45rem] font-extrabold text-[#143c36]">
                {axisMaxManYen.toLocaleString("ja-JP")}万円
              </output>
              <input
                className="w-full accent-[#177763]"
                type="range"
                min="500"
                max="50000"
                step="500"
                value={axisMaxManYen}
                onChange={(event) => setAxisMaxManYen(Number(event.target.value))}
              />
            </label>
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
                {householdType === "couple"
                  ? "世帯合算の年間末時点の評価額と投資元本"
                  : "年間末時点の評価額と投資元本"}
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
            onPointerMove={(event) => selectNearestPoint(event.clientX, event.currentTarget)}
            onPointerLeave={() => setActiveYear(null)}
          >
            <title>新NISAの資産推移</title>
            {chartTicks.map((tick) => (
              <g key={tick.y}>
                <line
                  x1={chartPaddingX}
                  x2={chartWidth - chartPaddingX}
                  y1={tick.y}
                  y2={tick.y}
                  className="stroke-[#e4ded0] stroke-1"
                />
                <text
                  className="fill-[#7a837f] text-[13px] font-bold max-[620px]:text-[11px]"
                  x={chartPaddingX - 12}
                  y={tick.y + 4}
                  textAnchor="end"
                >
                  {formatAxisCurrency(tick.value)}
                </text>
              </g>
            ))}
            <line
              x1={chartPaddingX}
              x2={chartWidth - chartPaddingX}
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
            <g className={activeYear === null ? "opacity-0" : "opacity-100"}>
              <line
                x1={activePosition.x}
                x2={activePosition.x}
                y1={chartPaddingY}
                y2={chartBottom}
                className="stroke-[#177763] stroke-2 opacity-50"
                strokeDasharray="5 6"
              />
              <circle
                cx={activePosition.x}
                cy={activePosition.y}
                r="7"
                className="fill-[#fffdf8] stroke-[#177763] stroke-4"
              />
              <rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipWidth}
                height={tooltipHeight}
                rx="8"
                className="fill-[#102b27] drop-shadow-md"
              />
              <text
                x={tooltipX + 16}
                y={tooltipY + 28}
                className="fill-[#fffdf8] text-sm font-bold"
              >
                {activePoint.year}年末時点
              </text>
              <text
                x={tooltipX + 16}
                y={tooltipY + 54}
                className="fill-[#b8ded5] text-xs font-bold"
              >
                評価額
              </text>
              <text
                x={tooltipX + tooltipWidth - 16}
                y={tooltipY + 54}
                textAnchor="end"
                className="fill-[#fffdf8] text-xs font-bold"
              >
                {formatCurrency(activePoint.value)}
              </text>
              <text
                x={tooltipX + 16}
                y={tooltipY + 78}
                className="fill-[#f0c77d] text-xs font-bold"
              >
                投資元本
              </text>
              <text
                x={tooltipX + tooltipWidth - 16}
                y={tooltipY + 78}
                textAnchor="end"
                className="fill-[#fffdf8] text-xs font-bold"
              >
                {formatCurrency(activePoint.principal)}
              </text>
              <text
                x={tooltipX + 16}
                y={tooltipY + 102}
                className="fill-[#b8ded5] text-xs font-bold"
              >
                運用益
              </text>
              <text
                x={tooltipX + tooltipWidth - 16}
                y={tooltipY + 102}
                textAnchor="end"
                className="fill-[#fffdf8] text-xs font-bold"
              >
                {formatCurrency(activePoint.gain)}
              </text>
            </g>
            <circle
              cx={chartWidth - chartPaddingX}
              cy={
                chartPaddingY + chartInnerHeight - (finalPoint.value / maxValue) * chartInnerHeight
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
