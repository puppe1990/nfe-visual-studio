import { describe, expect, it } from "vitest";

import {
  buildChartSeries,
  chooseChartBucket,
} from "./dashboard-chart";

describe("chooseChartBucket", () => {
  it("uses days for a month and months for a year", () => {
    const augustStart = Math.floor(new Date(2026, 7, 1).getTime() / 1000);
    const augustMid = Math.floor(new Date(2026, 7, 14).getTime() / 1000);
    const yearStart = Math.floor(new Date(2026, 0, 1).getTime() / 1000);
    expect(chooseChartBucket(augustStart, augustMid)).toBe("day");
    expect(chooseChartBucket(yearStart, augustMid)).toBe("month");
  });
});

describe("buildChartSeries", () => {
  it("fills every month of the year and keeps early notes", () => {
    const march = Math.floor(new Date(2026, 2, 20).getTime() / 1000);
    const august = Math.floor(new Date(2026, 7, 14).getTime() / 1000);
    const from = Math.floor(new Date(2026, 0, 1).getTime() / 1000);
    const to = Math.floor(new Date(2026, 7, 14).getTime() / 1000);
    const series = buildChartSeries([march, august], from, to);
    expect(series.map((point) => point.day)).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
    ]);
    expect(series.find((point) => point.day === "2026-03-01")?.count).toBe(1);
    expect(series.find((point) => point.day === "2026-08-01")?.count).toBe(1);
    expect(series.find((point) => point.day === "2026-06-01")?.count).toBe(0);
  });
});
