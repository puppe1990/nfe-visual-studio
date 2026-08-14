import { describe, expect, it } from "vitest";

import { LANDING_FAQ, LANDING_PROOF } from "./landing-copy";

describe("LANDING_FAQ", () => {
  it("is exactly the four spec questions", () => {
    expect(LANDING_FAQ.map((item) => item.q)).toEqual([
      "Preciso de certificado A1?",
      "Emite NFS-e fora de São Paulo?",
      "Vocês passam por Focus ou TecnoSpeed?",
      "Tem mensalidade?",
    ]);
  });
});

describe("LANDING_PROOF", () => {
  it("lists four official facts and no quotes", () => {
    expect(LANDING_PROOF).toHaveLength(4);
    expect(LANDING_PROOF.join(" ")).not.toMatch(/[“”"]/);
    expect(LANDING_PROOF).toEqual([
      "Prefeitura de São Paulo",
      "SEFAZ direta",
      "Certificado A1",
      "Sem Focus / TecnoSpeed",
    ]);
  });
});
