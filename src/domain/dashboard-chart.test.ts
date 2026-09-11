import { describe, expect, it } from "vitest";

import { buildChartSeries, chartAxisLabel, chooseChartBucket } from "./dashboard-chart";

describe("chooseChartBucket", () => {
  it("uses days for a month and months for a year", () => {
    const augustStart = Math.floor(new Date(2026, 7, 1).getTime() / 1000);
    const augustMid = Math.floor(new Date(2026, 7, 14).getTime() / 1000);
    const yearStart = Math.floor(new Date(2026, 0, 1).getTime() / 1000);
    expect(chooseChartBucket(augustStart, augustMid)).toBe("day");
    expect(chooseChartBucket(yearStart, augustMid)).toBe("month");
  });

  it("uses years when the range spans more than 18 months", () => {
    const from = Math.floor(new Date(2016, 2, 1).getTime() / 1000);
    const to = Math.floor(new Date(2026, 8, 11).getTime() / 1000);
    expect(chooseChartBucket(from, to)).toBe("year");
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

  it("fills each year of a long period instead of every empty month", () => {
    const early = Math.floor(new Date(2017, 2, 10).getTime() / 1000);
    const late = Math.floor(new Date(2026, 8, 11).getTime() / 1000);
    const from = Math.floor(new Date(2016, 2, 1).getTime() / 1000);
    const to = Math.floor(new Date(2026, 8, 11).getTime() / 1000);
    const series = buildChartSeries([early, late, late], from, to);
    expect(series.map((point) => point.day)).toEqual([
      "2016-01-01",
      "2017-01-01",
      "2018-01-01",
      "2019-01-01",
      "2020-01-01",
      "2021-01-01",
      "2022-01-01",
      "2023-01-01",
      "2024-01-01",
      "2025-01-01",
      "2026-01-01",
    ]);
    expect(series.find((point) => point.day === "2017-01-01")?.count).toBe(1);
    expect(series.find((point) => point.day === "2026-01-01")?.count).toBe(2);
    expect(series.find((point) => point.day === "2020-01-01")?.count).toBe(0);
  });
});

describe("chartAxisLabel", () => {
  it("shows month with year so 2017 and 2026 do not both read as mar", () => {
    expect(chartAxisLabel("2017-03-01", "month")).toBe("mar/17");
    expect(chartAxisLabel("2026-03-01", "month")).toBe("mar/26");
    expect(chartAxisLabel("2017-01-01", "year")).toBe("2017");
  });
});
