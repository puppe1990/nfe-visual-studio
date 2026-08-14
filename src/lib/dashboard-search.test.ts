import { describe, expect, it } from "vitest";

import { parseDashboardSearch } from "./dashboard-search";

describe("parseDashboardSearch", () => {
  it("drops default all/1 values so the URL stays clean", () => {
    expect(
      parseDashboardSearch({
        kind: "all",
        status: "all",
        page: "1",
      }),
    ).toEqual({
      kind: undefined,
      status: undefined,
      customerId: undefined,
      from: undefined,
      to: undefined,
      page: undefined,
    });
  });

  it("keeps nfe kind, authorized status and page > 1", () => {
    expect(
      parseDashboardSearch({
        kind: "nfe",
        status: "authorized",
        customerId: "12",
        from: "2026-01-01",
        to: "2026-01-31",
        page: "3",
      }),
    ).toEqual({
      kind: "nfe",
      status: "authorized",
      customerId: 12,
      from: "2026-01-01",
      to: "2026-01-31",
      page: 3,
    });
  });
});
