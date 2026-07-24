import crypto from "crypto";

const RSA_MODULUS_LENGTH = 2048;

let publicKeyPem: string;
let privateKeyPem: string;

function generarParDeLlaves(): void {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: RSA_MODULUS_LENGTH,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  publicKeyPem = publicKey;
  privateKeyPem = privateKey;
}

generarParDeLlaves();

export function getPublicKeyPem(): string {
  return publicKeyPem;
}

interface PayloadCifrado {
  encryptedKey: string;
  iv: string;
  ciphertext: string;
}
export function descifrarPayloadHibrido<T = unknown>(
  payload: PayloadCifrado,
): T {
  const { encryptedKey, iv, ciphertext } = payload;

  const llaveAes = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encryptedKey, "base64"),
  );

  const bufferCompleto = Buffer.from(ciphertext, "base64");
  const authTag = bufferCompleto.subarray(bufferCompleto.length - 16);
  const datosCifrados = bufferCompleto.subarray(0, bufferCompleto.length - 16);

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    llaveAes,
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(authTag);

  const textoPlano = Buffer.concat([
    decipher.update(datosCifrados),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(textoPlano) as T;
}
