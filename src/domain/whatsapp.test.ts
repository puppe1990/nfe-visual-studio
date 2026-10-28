import { describe, expect, it } from "vitest";

import { normalizeWhatsapp } from "./whatsapp";

describe("normalizeWhatsapp", () => {
  it("prefixes 55 on 11-digit mobile", () => {
    expect(normalizeWhatsapp("11988887777")).toBe("5511988887777");
  });

  it("strips mask and keeps 55", () => {
    expect(normalizeWhatsapp("+55 (11) 98888-7777")).toBe("5511988887777");
  });

  it("accepts 10-digit landline with DDD", () => {
    expect(normalizeWhatsapp("1133334444")).toBe("551133334444");
  });

  it("returns null for empty or short values", () => {
    expect(normalizeWhatsapp("")).toBeNull();
    expect(normalizeWhatsapp("1198888")).toBeNull();
    expect(normalizeWhatsapp("abc")).toBeNull();
  });
});
