import { describe, expect, it } from "vitest";

import {
  findNfseServiceCode,
  NFSE_SERVICE_CODES,
} from "./nfse-service-codes";

describe("NFS-e SP service codes", () => {
  it("includes the official assistência técnica code used by the emitente", () => {
    const item = findNfseServiceCode("1880");
    expect(item?.code).toBe("01880");
    expect(item?.label).toMatch(/Assistência técnica/i);
  });

  it("lists the Prefeitura table", () => {
    expect(NFSE_SERVICE_CODES.length).toBeGreaterThan(300);
    expect(new Set(NFSE_SERVICE_CODES.map((i) => i.code)).size).toBe(
      NFSE_SERVICE_CODES.length,
    );
  });
});
