import { describe, expect, it } from "vitest";

import { parseNfseSearch } from "./nfse-search";

describe("parseNfseSearch", () => {
  it("drops default all status and page 1", () => {
    expect(parseNfseSearch({ status: "all", page: 1 })).toEqual({
      status: undefined,
      customerId: undefined,
      from: undefined,
      to: undefined,
      page: undefined,
      sort: undefined,
      dir: undefined,
    });
  });

  it("keeps sort, dir and page when they are valid", () => {
    expect(
      parseNfseSearch({
        status: "authorized",
        sort: "total",
        dir: "asc",
        page: "2",
        customerId: 4,
      }),
    ).toEqual({
      status: "authorized",
      customerId: 4,
      from: undefined,
      to: undefined,
      page: 2,
      sort: "total",
      dir: "asc",
    });
  });
});
