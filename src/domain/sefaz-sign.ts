import forge from "node-forge";
import { SignedXml } from "xml-crypto";

export type LoadedA1 = {
  privateKeyPem: string;
  certificatePem: string;
  certificateDerBase64: string;
};

/**
 * Carrega PKCS#12 (A1) a partir de base64 + senha.
 */
export function loadA1FromPfx(
  pfxBase64: string,
  password: string,
): LoadedA1 {
  const der = forge.util.decode64(pfxBase64.replace(/\s/g, ""));
  const asn1 = forge.asn1.fromDer(der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);

  const keyBags =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag
    ] ??
    p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag];

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[
    forge.pki.oids.certBag
  ];

  if (!keyBags?.length || !keyBags[0].key) {
    throw new Error("Chave privada não encontrada no PFX");
  }
  if (!certBags?.length || !certBags[0].cert) {
    throw new Error("Certificado não encontrado no PFX");
  }

  const privateKeyPem = forge.pki.privateKeyToPem(keyBags[0].key);
  const certificatePem = forge.pki.certificateToPem(certBags[0].cert);
  const certificateDerBase64 = forge.util.encode64(
    forge.asn1.toDer(forge.pki.certificateToAsn1(certBags[0].cert)).getBytes(),
  );

  return { privateKeyPem, certificatePem, certificateDerBase64 };
}

/**
 * Extrai o bloco <NFe>...</NFe> de um XML (com ou sem nfeProc).
 */
export function extractNFeXml(xml: string): string {
  const match = xml.match(/<NFe[\s\S]*?<\/NFe>/i);
  if (!match) {
    throw new Error("XML sem elemento NFe");
  }
  return match[0];
}

/**
 * Assina a NF-e (infNFe) com algoritmos usados na NF-e 4.00 (RSA-SHA1).
 * O elemento assinado deve ter Id no infNFe (ex.: Id="NFe...").
 */
export function signNFeXml(nfeXml: string, a1: LoadedA1): string {
  const idMatch = nfeXml.match(/<infNFe[^>]*\sId="([^"]+)"/i);
  if (!idMatch) {
    throw new Error('infNFe sem atributo Id (ex.: Id="NFe...")');
  }
  const referenceUri = `#${idMatch[1]}`;

  const sig = new SignedXml({
    privateKey: a1.privateKeyPem,
    publicCert: a1.certificatePem,
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
  });

  sig.addReference({
    xpath: "//*[local-name(.)='infNFe']",
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
    uri: referenceUri,
  });

  sig.computeSignature(nfeXml, {
    location: {
      reference: "//*[local-name(.)='infNFe']",
      action: "after",
    },
    prefix: "",
  });

  return sig.getSignedXml();
}

/** Assina infEvento (cancelamento). */
export function signInfEventoXml(
  eventoXml: string,
  a1: LoadedA1,
  eventId: string,
): string {
  const sig = new SignedXml({
    privateKey: a1.privateKeyPem,
    publicCert: a1.certificatePem,
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
  });
  sig.addReference({
    xpath: "//*[local-name(.)='infEvento']",
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
    uri: `#${eventId}`,
  });
  sig.computeSignature(eventoXml, {
    location: { reference: "//*[local-name(.)='infEvento']", action: "after" },
    prefix: "",
  });
  return sig.getSignedXml();
}

/** Assina infInut (inutilização). */
export function signInfInutXml(
  inutXml: string,
  a1: LoadedA1,
  inutId: string,
): string {
  const sig = new SignedXml({
    privateKey: a1.privateKeyPem,
    publicCert: a1.certificatePem,
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
  });
  sig.addReference({
    xpath: "//*[local-name(.)='infInut']",
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
    uri: `#${inutId}`,
  });
  sig.computeSignature(inutXml, {
    location: { reference: "//*[local-name(.)='infInut']", action: "after" },
    prefix: "",
  });
  return sig.getSignedXml();
}

/** Gera um PFX de teste (autoassinado) — só para unit tests de assinatura. */
export function generateTestPfx(password: string): {
  pfxBase64: string;
  password: string;
} {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  const attrs = [
    { name: "commonName", value: "NFeFácil Teste" },
    { name: "countryName", value: "BR" },
    { shortName: "ST", value: "SP" },
    { name: "organizationName", value: "Teste" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    algorithm: "3des",
  });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return {
    pfxBase64: forge.util.encode64(p12Der),
    password,
  };
}
