import fse from "fs-extra";
import path from "path";
import chalk from "chalk";

import decryptFunc from "./decrypt";
import encryptFunc from "./encrypt";
import analyzeFunc from "./response-analysis";
import { logError } from "./logging";
import { OracleResult } from "./types";
import parseArgs from "./argparser";
import { getEncoder, strToBuffer } from "./encodings";

const BANNER = fse.readFileSync(path.join(__dirname, "../banner.txt"), "utf-8");
console.log(BANNER);

const args = parseArgs();
console.log(args);

async function main() {
  const {
    url,
    method,
    headers,
    data,
    concurrency,
    payloadEncoding,
    dontUrlencodePayload,
    disableCache,
    blockSize,
    mode,
  } = args;
  const requestOptions = { method, headers, data };
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    console.error(
      chalk`{red Invalid argument:} <url>\nMust start with http: or https:`
    );
    return 1;
  }
  if (data && !String(headers).toLowerCase().includes("content-type:")) {
    console.error(chalk`
{yellow.underline Warning}: \`--data\` argument is present without a \`Content-Type\` header.
You may want to set it to {inverse application/x-www-form-urlencoded} or {inverse application/json}
`);
  }

  const isDecryptionSuccess = ({ statusCode, body }: OracleResult) => {
    if (!isNaN(paddingError as number)) return statusCode !== +paddingError;
    return !body.includes(paddingError as unknown as string);
  };

  const transformPayload = getEncoder(payloadEncoding, !dontUrlencodePayload);
  const isCacheEnabled = !disableCache && cache !== false;
  const commonArgs = {
    url,
    blockSize,
    isDecryptionSuccess,
    transformPayload,
    concurrency,
    requestOptions,
    isCacheEnabled,
  };
  if (mode === "decrypt") {
    const { ciphertext, startFromFirstBlock } = args;
    await decryptFunc({
      ...commonArgs,
      ciphertext: strToBuffer(ciphertext, false).data,
      startFromFirstBlock,
    });
  } else if (mode === "encrypt") {
    const { plaintext } = args;
    await encryptFunc({
      ...commonArgs,
      plaintext: strToBuffer(plaintext).data,
    });
  } else if (mode === "analyze") {
    await analyzeFunc(commonArgs);
  }
}

main().catch(logError);
