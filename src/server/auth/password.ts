import "server-only";

import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LEN = 64;

function scrypt(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, KEY_LEN, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

const options: ScryptOptions = { N, r: R, p: P, maxmem: 128 * N * R * 2 };

/** Formato: scrypt$N$r$p$salt$hash (base64). O package.json não traz Argon2; scrypt é nativo do Node. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, options);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await scrypt(password, Buffer.from(salt, "base64"), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 128 * Number(n) * Number(r) * 2,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

let dummyHash: Promise<string> | undefined;

/** Executa o custo do hash quando o e-mail não existe, para não revelar contas pelo tempo de resposta. */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("dominus-dummy-password");
  await verifyPassword(password, await dummyHash);
}
