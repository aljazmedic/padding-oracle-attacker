import fse from "fs-extra";
import path from "path";
import minimist from "minimist";
import chalk from "chalk";
import { Action, ArgumentParser } from "argparse";

import { PKG_NAME, PKG_VERSION } from "./constants";
import { POArgs } from "./types";

const VALID_ENCODINGS = ["hex-uppercase", "base64", "base64-urlsafe", "hex"];
const VALID_BLOCK_SIZES = [8, 16];
const DEFAULT_BLOCK_SIZE = 16;

const registerRequestArgs = (parser: ArgumentParser) => {
  parser.add_argument("url", {
    help: chalk`URL to attack. Payload will be inserted at the end by default. To specify a custom injection point, include {underline \{POPAYLOAD\}} in a header (-H), request body (-d) or the URL`,
    type: String,
  });
  parser.add_argument("-X", "--method", {
    default: "GET",
    help: "HTTP method to use while making request",
    type: String,
    dest: "method",
    choices: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
  });
  parser.add_argument("-H", "--header", {
    action: "append",
    help: "Headers to be sent with request.",
    dest: "headers",
    default: [],
    type: String,
  });
  parser.add_argument("-d", "--data", {
    help: `Request body
        JSON string: {"id": 101, "foo": "bar"}
        URL encoded: id=101&foo=bar
      Make sure to specify the Content-Type header.`,
    type: String,
  });
  parser.add_argument("-e", "--payload-encoding", {
    default: "hex",
    help: chalk`Ciphertext payload encoding for {underline \{POPAYLOAD\}}`,
    choices: VALID_ENCODINGS,
    dest: "payloadEncoding",
  });
  parser.add_argument("--dont-urlencode-payload", {
    action: "store_true",
    default: false,
    help: chalk`Don't URL encode {underline \{POPAYLOAD\}}`,
    dest: "dontUrlencodePayload",
  });
};

const registerErrorArgs = (parser: ArgumentParser) => {
  parser.add_argument("-e", "--error", {
    help: chalk`Error message to look for in the response when a decryption error occurs. This is used to determine if the padding is valid or not. For example, if the error message is {underline Invalid padding}, then the script will try to find a padding that results in a response containing {underline Invalid padding}.`,
    type: String,
    required: true,
  });
};

const argParser = new ArgumentParser({
  description: "Padding Oracle Attack CLI",
  add_help: true,
});

// Common arguments

argParser.add_argument("-v", "--version", {
  action: "version",
  version: `${PKG_NAME} ${PKG_VERSION}`,
});
argParser.add_argument("-c", "--concurrency", {
  type: "int",
  default: 128,
  help: "Requests to be sent concurrently",
});
argParser.add_argument("--disable-cache", {
  action: "store_true",
  default: false,
  help: "Disable caching of responses",
});

const subParser = argParser.add_subparsers({
  title: "Mode",
  dest: "mode",
  required: true,
});

// DECRYPT

const decryptParser = subParser.add_parser("decrypt", {
  help: "Finds the plaintext (foobar) for given ciphertext (hex:0123abcd)",
});
registerRequestArgs(decryptParser);
decryptParser.add_argument("ciphertext", {
  help: "Text to decrypt",
  type: String,
});
decryptParser.add_argument("block_size", {
  default: DEFAULT_BLOCK_SIZE,
  help: "Block size used by the encryption algorithm on the server",
  type: "int",
  choices: ["8", "16"],
});
registerErrorArgs(decryptParser);
decryptParser.add_argument("--start-from-1st-block", {
  action: "store_true",
  default: false,
  dest: "startFromFirstBlock",
  help: "Start processing from the first block instead of the last (only for decrypt mode)",
});

// ENCRYPT
const encryptParser = subParser.add_parser("encrypt", {
  help: "Finds the ciphertext (hex:abcd1234) for given plaintext (foo=bar)",
});
registerRequestArgs(encryptParser);
encryptParser.add_argument("plaintext", {
  help: "Text to encrypt",
  type: String,
});
encryptParser.add_argument("block_size", {
  default: DEFAULT_BLOCK_SIZE,
  help: "Block size used by the encryption algorithm on the server",
  type: "int",
});
registerErrorArgs(encryptParser);

const analyzeParser = subParser.add_parser("analyze", {
  help: "Helps find out if the URL is vulnerable or not, and how the response differs when a decryption error occurs (for the <error> argument)",
});
registerRequestArgs(analyzeParser);
analyzeParser.add_argument("block_size", {
  default: DEFAULT_BLOCK_SIZE,
  help: "Block size used by the encryption algorithm on the server",
  type: "int",
  nargs: "?",
});

export default (): POArgs => {
  return argParser.parse_args(process.argv.slice(2));
};
