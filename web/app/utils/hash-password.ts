import { sha256 } from "js-sha256";

export async function hashPassword(password: string) {
  return sha256(password);
}