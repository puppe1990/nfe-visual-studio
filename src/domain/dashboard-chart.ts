export type ChartBucket = "day" | "week" | "month";

export type ChartPoint = {
  day: string;
  count: number;
};

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isoDayFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function mondayOf(date: Date): Date {
  const weekday = date.getDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
}

export function chooseChartBucket(fromUnix: number, toUnix: number): ChartBucket {
  const days = Math.round((toUnix - fromUnix) / 86400) + 1;
  if (days <= 45) return "day";
  if (days <= 184) return "week";
  return "month";
}

export function bucketKey(date: Date, bucket: ChartBucket): string {
  if (bucket === "month") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  }
  if (bucket === "week") {
    return isoDayFromDate(mondayOf(date));
  }
  return isoDayFromDate(startOfLocalDay(date));
}

function nextBucket(date: Date, bucket: ChartBucket): Date {
  if (bucket === "month") {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  }
  if (bucket === "week") {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export function buildChartSeries(
  issuedAtSeconds: number[],
  fromUnix: number,
  toUnix: number,
): ChartPoint[] {
  const from = startOfLocalDay(new Date(fromUnix * 1000));
  const to = startOfLocalDay(new Date(toUnix * 1000));
  const bucket = chooseChartBucket(fromUnix, toUnix);
  const counts = new Map<string, number>();
  for (const stamp of issuedAtSeconds) {
    const key = bucketKey(new Date(stamp * 1000), bucket);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let cursor =
    bucket === "month"
      ? new Date(from.getFullYear(), from.getMonth(), 1)
      : bucket === "week"
        ? mondayOf(from)
        : from;

  const series: ChartPoint[] = [];
  while (cursor.getTime() <= to.getTime()) {
    const key = bucketKey(cursor, bucket);
    series.push({ day: key, count: counts.get(key) ?? 0 });
    cursor = nextBucket(cursor, bucket);
  }
  return series;
}

const MONTH_LABELS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function chartAxisLabel(day: string, bucket: ChartBucket): string {
  const [, month, date] = day.split("-");
  if (bucket === "month") {
    return MONTH_LABELS[Number(month) - 1] ?? month;
  }
  return `${date}/${month}`;
}

export function chartUnitLabel(bucket: ChartBucket): string {
  if (bucket === "month") return "por mês";
  if (bucket === "week") return "por semana";
  return "por dia";
}
