import forge from "node-forge";

import type { LoadedA1 } from "./sefaz-sign";

export type RpsTaxation =
  | "T"
  | "F"
  | "A"
  | "B"
  | "D"
  | "M"
  | "N"
  | "R"
  | "S"
  | "X"
  | "V"
  | "P";

export type RpsStatus = "N" | "C";

export type RpsSignInput = {
  municipalRegistration: string;
  rpsSeries: string;
  rpsNumber: number;
  issuedOn: string;
  taxation: RpsTaxation;
  status: RpsStatus;
  issWithheld: boolean;
  serviceCents: number;
  deductionCents: number;
  serviceCode: string;
  takerDocument: string;
  intermediaryDocument?: string | null;
  intermediaryIssWithheld?: boolean;
};

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function padLeft(value: string, size: number): string {
  return value.padStart(size, "0").slice(-size);
}

function padRight(value: string, size: number): string {
  return value.padEnd(size, " ").slice(0, size);
}

function cents15(cents: number): string {
  return padLeft(String(Math.max(0, Math.round(cents))), 15);
}

function yyyymmdd(isoDate: string): string {
  return isoDate.replace(/-/g, "").slice(0, 8);
}

function documentIndicator(digits: string): "1" | "2" | "3" {
  if (digits.length === 11) return "1";
  if (digits.length === 14) return "2";
  return "3";
}

/**
 * Cadeia ASCII da assinatura do RPS (layout v1, manual Pref. SP).
 */
export function buildRpsSignPayload(input: RpsSignInput): string {
  const im = padLeft(onlyDigits(input.municipalRegistration), 8);
  const series = padRight(input.rpsSeries.trim(), 5);
  const number = padLeft(String(input.rpsNumber), 12);
  const date = yyyymmdd(input.issuedOn);
  const withheld = input.issWithheld ? "S" : "N";
  const serviceCode = padLeft(onlyDigits(input.serviceCode), 5);
  const taker = onlyDigits(input.takerDocument);
  const takerInd = documentIndicator(taker);
  const takerDoc = padLeft(takerInd === "3" ? "" : taker, 14);

  let payload =
    im +
    series +
    number +
    date +
    input.taxation +
    input.status +
    withheld +
    cents15(input.serviceCents) +
    cents15(input.deductionCents) +
    serviceCode +
    takerInd +
    takerDoc;

  const intermediary = onlyDigits(input.intermediaryDocument ?? "");
  if (intermediary) {
    const interInd = documentIndicator(intermediary);
    payload +=
      interInd +
      padLeft(intermediary, 14) +
      (input.intermediaryIssWithheld ? "S" : "N");
  }

  return payload;
}

/**
 * Assina a cadeia do RPS com RSA-SHA1 e devolve Base64.
 * Não hashear duas vezes: node-forge `sign()` já aplica SHA-1.
 */
export function signRpsPayload(payload: string, a1: LoadedA1): string {
  const key = forge.pki.privateKeyFromPem(a1.privateKeyPem);
  const md = forge.md.sha1.create();
  md.update(payload, "utf8");
  return forge.util.encode64(key.sign(md));
}
