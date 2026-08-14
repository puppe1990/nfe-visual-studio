import { describe, expect, it } from "vitest";

import { buildNfsePrintUrl } from "./nfse-public-url";

describe("NFS-e official print URL", () => {
  it("builds the Prefeitura notaprint link", () => {
    const url = buildNfsePrintUrl({
      municipalRegistration: "6.210.580-9",
      nfseNumber: 72,
      verificationCode: "NBIK-9INN",
    });
    expect(url).toBe(
      "https://nfe.prefeitura.sp.gov.br/contribuinte/notaprint.aspx?ccm=62105809&nf=72&cod=NBIK9INN",
    );
  });

  it("returns null without verification code", () => {
    expect(
      buildNfsePrintUrl({
        municipalRegistration: "62105809",
        nfseNumber: 72,
        verificationCode: "",
      }),
    ).toBeNull();
  });
});
