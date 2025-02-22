import fse from 'fs-extra'
import path from 'path'
import chalk from 'chalk'

import decryptFunc from './decrypt'
import encryptFunc from './encrypt'
import analyzeFunc from './response-analysis'
import { logError } from './logging'
import parseArgs from './argparser'
import { getEncoder, strToBuffer } from './encodings'
import buildPredicateFunction from './predicate'

const BANNER = fse.readFileSync(path.join(__dirname, '../banner.txt'), 'utf-8')
console.log(BANNER)

const args = parseArgs()
console.log(args)

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
    mode
  } = args
  const requestOptions = { method, headers, data }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.error(
      chalk`{red Invalid argument:} <url>\nMust start with http: or https:`
    )
    return 1
  }
  if (data && !String(headers).toLowerCase().includes('content-type:')) {
    console.error(chalk`
{yellow.underline Warning}: \`--data\` argument is present without a \`Content-Type\` header.
You may want to set it to {inverse application/x-www-form-urlencoded} or {inverse application/json}
`)
  }

  const transformPayload = getEncoder(payloadEncoding, !dontUrlencodePayload)
  const isCacheEnabled = !disableCache
  const commonArgs = {
    url,
    blockSize,
    transformPayload,
    concurrency,
    requestOptions,
    isCacheEnabled
  }
  if (mode === 'decrypt') {
    const isDecryptionSuccess = buildPredicateFunction(args.predicate)
    const { ciphertext, startFromFirstBlock } = args
    await decryptFunc({
      ...commonArgs,
      isDecryptionSuccess,
      ciphertext: strToBuffer(ciphertext, false).data,
      startFromFirstBlock
    })
  } else if (mode === 'encrypt') {
    const isDecryptionSuccess = buildPredicateFunction(args.predicate)
    const { plaintext } = args
    await encryptFunc({
      ...commonArgs,
      isDecryptionSuccess,
      plaintext: strToBuffer(plaintext).data
    })
  } else if (mode === 'analyze') {
    await analyzeFunc(commonArgs)
  } else {
    console.error(chalk`{red Invalid argument:} <mode>\nMust be one of:
  {bold decrypt} - decrypt a ciphertext
  {bold encrypt} - encrypt a plaintext
  {bold analyze} - analyze responses for padding oracle vulnerabilities
  }
`)
    return 1
  }
  return 0
}

main().catch(logError)
