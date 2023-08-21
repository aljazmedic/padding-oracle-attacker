import { Encoder } from "./types";

export const VALID_ENCODINGS = [
  "hex",
  "base64",
  "hex-uppercase",
  "base64-urlsafe",
  "utf8",
];

const hexToBuffer = (str: string) =>
  Buffer.from(str.replace(/\s+/g, ""), "hex");
const b64ToBuffer = (str: string) =>
  Buffer.from(str.replace(/\s+/g, ""), "base64");

export function strToBuffer(input: string, fromPlain: boolean = true) {
  if (input.startsWith("hex:"))
    return { encoding: "hex", data: hexToBuffer(input.slice("hex:".length)) };
  if (input.startsWith("base64:"))
    return {
      encoding: "base64",
      data: b64ToBuffer(input.slice("base64:".length)),
    };
  if (input.startsWith("b64:"))
    return {
      encoding: "base64",
      data: b64ToBuffer(input.slice("b64:".length)),
    };
  if (input.startsWith("utf8:"))
    return {
      encoding: "utf8",
      data: Buffer.from(input.slice("utf8:".length), "utf8"),
    };
  if (fromPlain)
    return {
      encoding: "utf8",
      data: Buffer.from(input, "utf8"),
    };
  throw Error("Input string should start with `hex:` or `base64:`/`b64:`");
}

const getCustomB64Encoder = ([
  plusChar,
  slashChar,
  equalChar,
]: string[]): Encoder => {
  return (buffer: Buffer) =>
    buffer
      .toString("base64")
      .replace(/\+/g, plusChar || "")
      .replace(/\//g, slashChar || "")
      .replace(/=/g, equalChar || "");
};
const encodings: { [key: string]: Encoder } = {
  hex: (x: Buffer) => x.toString("hex"),
  base64: (x: Buffer) => x.toString("base64"),
  "hex-uppercase": (x: Buffer) => x.toString("hex").toUpperCase(),
  "base64-urlsafe": (x: Buffer) =>
    x.toString("base64").replace(/\+/g, "-").replace(/\//g, "_"),
  utf8: (x: Buffer) => x.toString("utf8"),
};

export function getEncoder(
  payloadEncoding: string,
  shouldUrlEncode: boolean
): Encoder {
  const urlencode = shouldUrlEncode ? encodeURIComponent : (i: string) => i;
  const isBase64Custom = payloadEncoding.startsWith("base64(");
  let f: Encoder;
  if (isBase64Custom) {
    const chars = payloadEncoding.slice("base64(".length).split("");
    if (chars.length !== 3) throw Error("Invalid base64 alphabet");
    f = getCustomB64Encoder(chars);
  } else if (payloadEncoding in encodings) {
    f = encodings[payloadEncoding];
  } else {
    throw Error(`Invalid encoding: ${payloadEncoding}`);
  }
  return (x: Buffer) => urlencode(f(x));
}

export default encodings;
