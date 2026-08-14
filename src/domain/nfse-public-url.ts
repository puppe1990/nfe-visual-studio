/** Página oficial de impressão da NFS-e Paulistana. */
export function buildNfsePrintUrl(input: {
  municipalRegistration: string;
  nfseNumber: number;
  verificationCode: string;
}): string | null {
  const ccm = input.municipalRegistration.replace(/\D/g, "");
  const code = input.verificationCode.replace(/[^A-Za-z0-9]/g, "");
  if (ccm.length !== 8 || !input.nfseNumber || !code) return null;
  const params = new URLSearchParams({
    ccm,
    nf: String(input.nfseNumber),
    cod: code,
  });
  return `https://nfe.prefeitura.sp.gov.br/contribuinte/notaprint.aspx?${params.toString()}`;
}

export const NFSE_VERIFICATION_URL =
  "https://nfe.prefeitura.sp.gov.br/publico/verificacao.aspx";
