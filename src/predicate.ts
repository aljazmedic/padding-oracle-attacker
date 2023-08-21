import chalk from 'chalk'
import { DecryptionSuccessPredicate, OracleResult } from './types'

/**
 *
`sm:success message`
`sc:success code`
`em:error message`
`ec:error code`
`st:timeout on success`
`et:timeout on error` ?
 */

const retCodeRegex = /[12345][0-9]{2}/g
const textRegex = /[a-zA-Z0-9 :_<>\-/]+/g

const smartAssumePredicate = (predicateString: string) => {
  if (retCodeRegex.test(predicateString)) {
    console.log(
      chalk`{yellow.underline Assuming} error code predicate: {red ${predicateString}}\n`
    )
    return { booleanReturnOnHit: false, mode: 'c', value: predicateString }
  }
  if (textRegex.test(predicateString)) {
    console.log(
      chalk`{yellow.underline Assuming} success message predicate: {red ${predicateString}}\n`
    )
    return { booleanReturnOnHit: false, mode: 'm', value: predicateString }
  }
  return null
}

const tryAssumeOrFail = (predicateString: string, errorMessage: string) => {
  const smartAssumed = smartAssumePredicate(predicateString)
  if (smartAssumed) return smartAssumed
  throw new Error(errorMessage)
}

const parseStringPredicate = (predicateString: string) => {
  if (predicateString.indexOf(':') === -1) {
    return tryAssumeOrFail(
      predicateString,
      'Invalid predicate string: ' + predicateString
    )
  }

  const [type, value] = predicateString.split(':', 2)

  // First character must tell us what type of predicate it is - only allow s and e
  const [firstChar, mode] = [type.charAt(0), type.slice(1)]

  if (firstChar !== 's' && firstChar !== 'e') return tryAssumeOrFail(predicateString, 'Invalid predicate type: ' + type)

  const booleanReturnOnHit = firstChar === 's'
  return { booleanReturnOnHit, mode, value }
}

export default function buildPredicateFunction(
  predicateString: string
): DecryptionSuccessPredicate {
  const { booleanReturnOnHit, mode, value } = parseStringPredicate(predicateString)
  switch (mode) {
    case 'm': {
      return ({ body, headers }: OracleResult) => {
        const bodyString = body.toString()
        if (bodyString.includes(value)) return booleanReturnOnHit
        const headersString = JSON.stringify(headers)
        if (headersString.includes(value)) return booleanReturnOnHit
        return !booleanReturnOnHit
      }
    }
    case 'c': {
      const statusCodeTarget = parseInt(value, 10)
      return ({ statusCode }: OracleResult) => (statusCode === statusCodeTarget
          ? booleanReturnOnHit
          : !booleanReturnOnHit)
    }
    case 's': {
      const responseSizeTarget = parseInt(value, 10)
      return ({ body }: OracleResult) => (body.length === responseSizeTarget
          ? booleanReturnOnHit
          : !booleanReturnOnHit)
    }
    case 't': {
      const timeoutTarget = parseInt(value, 10)
      return ({ timings }: OracleResult) => (timings.end - timings.start < timeoutTarget
          ? booleanReturnOnHit
          : !booleanReturnOnHit)
    }
    default:
      throw new Error('Invalid predicate mode: ' + mode)
  }
}
