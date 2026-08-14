import { describe, expect, it } from "vitest";

import { buildRpsSignPayload, signRpsPayload } from "./nfse-rps";
import { generateTestPfx, loadA1FromPfx } from "./sefaz-sign";

describe("NFS-e SP RPS signature payload (layout v1)", () => {
  it("matches the official manual example without intermediary", () => {
    const payload = buildRpsSignPayload({
      municipalRegistration: "31000000",
      rpsSeries: "OL03",
      rpsNumber: 1,
      issuedOn: "2007-01-03",
      taxation: "T",
      status: "N",
      issWithheld: false,
      serviceCents: 2_050_000,
      deductionCents: 500_000,
      serviceCode: "2658",
      takerDocument: "13167474254",
    });

    expect(payload).toBe(
      "31000000OL03 00000000000120070103TNN00000000205000000000000050000002658100013167474254",
    );
  });

  it("pads the municipal inscription and 5-digit service code", () => {
    const payload = buildRpsSignPayload({
      municipalRegistration: "62105809",
      rpsSeries: "A",
      rpsNumber: 12,
      issuedOn: "2026-08-14",
      taxation: "T",
      status: "N",
      issWithheld: false,
      serviceCents: 150_000,
      deductionCents: 0,
      serviceCode: "01880",
      takerDocument: "25238319000180",
    });

    expect(payload.startsWith("62105809A    00000000001220260814TNN")).toBe(
      true,
    );
    expect(payload).toContain("000000000150000");
    expect(payload).toContain("01880");
    expect(payload.endsWith("225238319000180"));
  });

  it("signs the payload with the A1 private key", () => {
    const { pfxBase64, password } = generateTestPfx("x");
    const a1 = loadA1FromPfx(pfxBase64, password);
    const signature = signRpsPayload("abc", a1);
    expect(signature.length).toBeGreaterThan(80);
    expect(() => Buffer.from(signature, "base64")).not.toThrow();
  });
});
