import fse from 'fs-extra'
import path from 'path'
import chalk from 'chalk'

import decryptFunc from './decrypt'
import encryptFunc from './encrypt'
import analyzeFunc from './response-analysis'
import { logError } from './logging'
import { OracleResult } from './types'
import parseArgs from './argparser'

const BANNER = fse.readFileSync(path.join(__dirname, '../banner.txt'), 'utf-8')
console.log(BANNER)

const args = parseArgs()
console.log(args)

const toBase64Custom = (
  buffer: Buffer,
  [plusChar, slashChar, equalChar]: string
) => buffer
    .toString('base64')
    .replace(/\+/g, plusChar || '')
    .replace(/\//g, slashChar || '')
    .replace(/=/g, equalChar || '')

const hexToBuffer = (str: string) => Buffer.from(str.replace(/\s+/g, ''), 'hex')
const b64ToBuffer = (str: string) => Buffer.from(str.replace(/\s+/g, ''), 'base64')
function strToBuffer(input: string, fromPlain: boolean = true) {
  if (input.startsWith('hex:')) return hexToBuffer(input.slice('hex:'.length))
  if (input.startsWith('base64:')) return b64ToBuffer(input.slice('base64:'.length))
  if (input.startsWith('b64:')) return b64ToBuffer(input.slice('b64:'.length))
  if (input.startsWith('utf8:')) return Buffer.from(input.slice('utf8:'.length), 'utf8')
  if (fromPlain) return Buffer.from(input, 'utf8')
  throw Error('Input string should start with `hex:` or `base64:`/`b64:`')
}
async function main() {
  const { url, method, headers, data, concurrency } = args
  const requestOptions = { method, headers, data }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.error(
      chalk`{red Invalid argument:} <url>\nMust start with http: or https:`
    )
    return
  }
  if (data && !String(headers).toLowerCase().includes('content-type:')) {
    console.error(chalk`
{yellow.underline Warning}: \`--data\` argument is present without a \`Content-Type\` header.
You may want to set it to {inverse application/x-www-form-urlencoded} or {inverse application/json}
`)
  }


  const isDecryptionSuccess = ({ statusCode, body }: OracleResult) => {
    if (!isNaN(paddingError as number)) return statusCode !== +paddingError
    return !body.includes(paddingError as unknown as string)
  }
  const transformPayload = (payload: Buffer) => {
    const urlencode = dontURLEncodePayload
      ? (i: string) => i
      : encodeURIComponent
    if (payloadEncoding === 'hex-uppercase') return payload.toString('hex').toUpperCase()
    if (payloadEncoding === 'base64') return urlencode(payload.toString('base64'))
    if (payloadEncoding === 'base64-urlsafe') return urlencode(toBase64Custom(payload, '-_'))
    if (payloadEncoding.startsWith('base64(')) {
      // base64 with custom alphabet. like "base64(-!~)"
      const chars = payloadEncoding.slice('base64('.length).split('')
      return urlencode(toBase64Custom(payload, chars))
    }
    return payload.toString('hex')
  }
  const isCacheEnabled = !disableCache && cache !== false
  const commonArgs = {
    url,
    blockSize,
    isDecryptionSuccess,
    transformPayload,
    concurrency,
    requestOptions,
    isCacheEnabled
  }
  if (isDecrypt) {
    await decryptFunc({
      ...commonArgs,
      ciphertext: strToBuffer(cipherOrPlaintext, false),
      startFromFirstBlock
    })
  } else if (isEncrypt) {
    await encryptFunc({
      ...commonArgs,
      plaintext: strToBuffer(cipherOrPlaintext)
    })
  } else if (isAnalyze) {
    await analyzeFunc(commonArgs)
  }
}

main().catch(logError)
