import { decodeBase64UrlToBytes, decodeJsonBase64Url, encodeBase64UrlBytes, encodeJsonBase64Url, utf8ToBytes } from "./base64url";

type OriginRefPayload = {
  v: 1;
  cid: string;
  url: string;
  exp: number;
};

type CreateOriginRefInput = {
  secret: string;
  channelId: string;
  url: string;
  exp: number;
};

type VerifyOriginRefInput = {
  secret: string;
  channelId: string;
  ref: string;
  nowEpochSec?: number;
};

async function importAesKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", utf8ToBytes(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function createOriginRef(input: CreateOriginRefInput) {
  const payload: OriginRefPayload = {
    v: 1,
    cid: input.channelId,
    url: input.url,
    exp: input.exp,
  };

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importAesKey(input.secret);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    utf8ToBytes(encodeJsonBase64Url(payload))
  );

  return `${encodeBase64UrlBytes(iv)}.${encodeBase64UrlBytes(new Uint8Array(ciphertext))}`;
}

export async function verifyOriginRef(input: VerifyOriginRefInput) {
  const [ivEncoded, ciphertextEncoded] = input.ref.split(".");
  if (!ivEncoded || !ciphertextEncoded) {
    return { ok: false as const, error: "Malformed ref." };
  }

  try {
    const key = await importAesKey(input.secret);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decodeBase64UrlToBytes(ivEncoded) },
      key,
      decodeBase64UrlToBytes(ciphertextEncoded)
    );
    const payload = decodeJsonBase64Url<OriginRefPayload>(new TextDecoder().decode(plaintext));
    const nowEpochSec = input.nowEpochSec ?? Math.floor(Date.now() / 1000);

    if (payload.v !== 1) return { ok: false as const, error: "Unsupported ref version." };
    if (payload.cid !== input.channelId) return { ok: false as const, error: "Channel mismatch." };
    if (!payload.url) return { ok: false as const, error: "Missing origin URL." };
    if (payload.exp <= nowEpochSec) return { ok: false as const, error: "Ref expired." };

    return { ok: true as const, payload };
  } catch {
    return { ok: false as const, error: "Invalid ref." };
  }
}
