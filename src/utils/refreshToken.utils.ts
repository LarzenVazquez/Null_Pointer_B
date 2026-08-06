import crypto from "crypto";

export function generarRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function hashRefreshToken(tokenPlano: string): string {
  return crypto.createHash("sha256").update(tokenPlano).digest("hex");
}
