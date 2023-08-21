import { GotTimings } from 'got'
import { VALID_ENCODINGS } from './encodings'

export interface HeadersObject {
  [key: string]: string
}
export interface OracleResult {
  url: string
  statusCode: number
  headers: HeadersObject
  body: string
  timings: GotTimings
}

export type DecryptionSuccessPredicate = (
  oracleResult: OracleResult
) => boolean;

interface RequestOptions {
  method?: string
  headers?: string | string[] | HeadersObject
  data?: string
}
export interface OracleCallerOptions {
  url: string
  requestOptions?: RequestOptions
  transformPayload?: Encoder
  isCacheEnabled?: boolean
  logMode?: 'full' | 'minimal' | 'none'
}
interface OptionsBase extends OracleCallerOptions {
  blockSize: number
  concurrency?: number
  isDecryptionSuccess: DecryptionSuccessPredicate
}
export interface ResponseAnalysisOptions extends OracleCallerOptions {
  blockSize: number
  concurrency?: number
  saveResponsesToTmpDir?: boolean
}
export interface PaddingOracleOptions extends OptionsBase {
  ciphertext: Buffer
  plaintext: Buffer
  blockCount: number
  origBytes: Buffer
  foundBytes: Buffer
  interBytes: Buffer
  foundOffsets: Set<number>
  initFirstPayloadBlockWithOrigBytes?: boolean
  startFromFirstBlock?: boolean
}
export interface DecryptOptions extends OptionsBase {
  ciphertext: Buffer
  makeInitialRequest?: boolean
  alreadyFound?: Buffer
  initFirstPayloadBlockWithOrigBytes?: boolean
  startFromFirstBlock?: boolean
}
export interface EncryptOptions extends OptionsBase {
  plaintext: Buffer
  makeFinalRequest?: boolean
  lastCiphertextBlock?: Buffer
}

export const VALID_BLOCK_SIZES = [8, 16]
type ValidBlockSizes = (typeof VALID_BLOCK_SIZES)[number];
type ValidEncodings = (typeof VALID_ENCODINGS)[number];

interface UrlArgs {
  url: string
  method: string
  headers: string[]
  data?: string
  payloadEncoding: ValidEncodings
  dontUrlencodePayload: boolean
}
export type POArgs = {
  concurrency: number
  disableCache: boolean
} & (
  | (UrlArgs & {
      mode: 'decrypt'
      ciphertext: string
      blockSize: ValidBlockSizes
      predicate: string
      startFromFirstBlock: boolean
    })
  | (UrlArgs & {
      mode: 'encrypt'
      plaintext: string
      blockSize: ValidBlockSizes
      predicate: string
    })
  | (UrlArgs & {
      mode: 'analyze'
      blockSize: ValidBlockSizes
    })
);

export type Encoder = (input: Buffer) => string;
