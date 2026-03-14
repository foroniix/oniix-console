const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function hasBuffer() {
  return typeof Buffer !== "undefined";
}

function bytesToBase64(bytes: Uint8Array) {
  if (hasBuffer()) {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string) {
  if (hasBuffer()) {
    return Uint8Array.from(Buffer.from(base64, "base64"));
  }

  const binary = atob(base64);
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    output[index] = binary.charCodeAt(index);
  }
  return output;
}

export function utf8ToBytes(value: string) {
  return textEncoder.encode(value);
}

export function bytesToUtf8(value: Uint8Array) {
  return textDecoder.decode(value);
}

export function encodeBase64UrlBytes(value: Uint8Array) {
  return bytesToBase64(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeBase64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return base64ToBytes(`${normalized}${padding}`);
}

export function encodeBase64UrlString(value: string) {
  return encodeBase64UrlBytes(utf8ToBytes(value));
}

export function decodeBase64UrlToString(value: string) {
  return bytesToUtf8(decodeBase64UrlToBytes(value));
}

export function encodeJsonBase64Url<T>(value: T) {
  return encodeBase64UrlString(JSON.stringify(value));
}

export function decodeJsonBase64Url<T>(value: string) {
  return JSON.parse(decodeBase64UrlToString(value)) as T;
}
