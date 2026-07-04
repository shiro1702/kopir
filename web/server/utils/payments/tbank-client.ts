import { createHash } from 'node:crypto'
import {
  getTbankApiUrl,
  getTbankCashboxApiUrl,
  getTbankNotificationUrl,
  getTbankPassword,
  getTbankTerminalKey,
  isTbankReceiptEnabled,
} from '../tbank-config'
import { maybeBuildTbankReceipt } from './tbank-receipt'
import {
  logTbankConfigHint,
  logTbankFailure,
  logTbankInvalidResponse,
  logTbankNetworkError,
  logTbankRequest,
  logTbankSuccess,
} from './tbank-log'
import { tbankFetch } from './tbank-fetch'

const NESTED_TOKEN_KEYS = new Set(['DATA', 'Receipt', 'Items', 'Shops'])

export type TbankRequestParams = Record<string, string | number | boolean | null | undefined | object>

export interface TbankApiResponse {
  Success: boolean
  ErrorCode: string
  Message?: string
  Details?: string
  TerminalKey?: string
  Status?: string
  PaymentId?: string | number
  OrderId?: string
  Amount?: number
  PaymentURL?: string
  Data?: string
  Url?: string
  ReceiptUrl?: string
}

function tbankError(message: string, code: string, statusCode = 502) {
  return createError({
    statusCode,
    data: { error: message, code },
  })
}

/** Build request Token per T-Bank EACQ spec (root scalar fields + Password, sorted keys, SHA-256). */
export function buildTbankToken(
  params: TbankRequestParams,
  password: string,
): string {
  const withPassword: Record<string, string> = { Password: password }

  for (const [key, value] of Object.entries(params)) {
    if (key === 'Token' || NESTED_TOKEN_KEYS.has(key)) {
      continue
    }
    if (value === undefined || value === null) {
      continue
    }
    withPassword[key] = String(value)
  }

  const concatenated = Object.keys(withPassword)
    .sort()
    .map((key) => withPassword[key])
    .join('')

  return createHash('sha256').update(concatenated).digest('hex')
}

export function verifyTbankNotificationToken(
  payload: Record<string, unknown>,
  password: string,
): boolean {
  const token = payload.Token
  if (typeof token !== 'string' || !token) {
    return false
  }

  const params: TbankRequestParams = {}
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'Token' || NESTED_TOKEN_KEYS.has(key)) {
      continue
    }
    if (value === undefined || value === null || typeof value === 'object') {
      continue
    }
    params[key] = value as string | number | boolean
  }

  return buildTbankToken(params, password) === token
}

async function postTbankToBase<T extends TbankApiResponse>(
  apiBaseUrl: string,
  method: string,
  params: TbankRequestParams,
): Promise<T> {
  const terminalKey = getTbankTerminalKey()
  const password = getTbankPassword()
  if (!terminalKey || !password) {
    throw tbankError('T-Bank is not configured', 'TBANK_NOT_CONFIGURED', 500)
  }

  const body: TbankRequestParams = {
    TerminalKey: terminalKey,
    ...params,
  }
  body.Token = buildTbankToken(body, password)

  const url = `${apiBaseUrl.replace(/\/$/, '')}/${method}`

  logTbankConfigHint(terminalKey, Boolean(password))
  logTbankRequest(method, body, { url })

  let response: Response
  try {
    response = await tbankFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    logTbankNetworkError(method, error)
    throw tbankError('T-Bank API unreachable', 'TBANK_NETWORK_ERROR')
  }

  let data: T
  try {
    data = await response.json() as T
  } catch {
    logTbankInvalidResponse(method, response.status)
    throw tbankError('Invalid T-Bank API response', 'TBANK_INVALID_RESPONSE')
  }

  if (!response.ok) {
    logTbankFailure(method, data, response.status)
    throw tbankError(
      data.Message ?? `T-Bank HTTP ${response.status}`,
      data.ErrorCode ?? 'TBANK_HTTP_ERROR',
      response.status,
    )
  }

  if (!data.Success) {
    logTbankFailure(method, data, response.status)
    throw tbankError(
      data.Message ?? data.Details ?? 'T-Bank request failed',
      data.ErrorCode ?? 'TBANK_API_ERROR',
    )
  }

  logTbankSuccess(method, data)
  return data
}

async function postTbank<T extends TbankApiResponse>(
  method: string,
  params: TbankRequestParams,
): Promise<T> {
  return postTbankToBase(getTbankApiUrl(), method, params)
}

export interface TbankInitParams {
  amountKopeks: number
  merchantOrderId: string
  description: string
  notificationUrl?: string
  receiptItemName?: string
  receiptEmail?: string | null
}

export async function tbankInit(params: TbankInitParams): Promise<TbankApiResponse> {
  const notificationUrl = params.notificationUrl ?? getTbankNotificationUrl()
  const request: TbankRequestParams = {
    Amount: params.amountKopeks,
    OrderId: params.merchantOrderId,
    Description: params.description,
    PayType: 'O',
    Language: 'ru',
  }
  if (notificationUrl) {
    request.NotificationURL = notificationUrl
  }

  const receipt = maybeBuildTbankReceipt({
    amountKopeks: params.amountKopeks,
    itemName: params.receiptItemName ?? params.description,
    email: params.receiptEmail,
  })
  if (receipt) {
    request.Receipt = receipt
    console.log('[tbank] Init with Receipt (FFD 1.05)', {
      taxation: receipt.Taxation,
      itemName: receipt.Items[0]?.Name,
      amountKopeks: params.amountKopeks,
      hasEmail: Boolean(receipt.Email),
    })
  } else if (isTbankReceiptEnabled()) {
    console.warn('[tbank] TBANK_RECEIPT_ENABLED but Receipt was not built')
  }

  return postTbank<TbankApiResponse>('Init', request)
}

export async function tbankGetQr(
  paymentId: string | number,
  dataType: 'PAYLOAD' | 'IMAGE' = 'PAYLOAD',
): Promise<TbankApiResponse> {
  return postTbank<TbankApiResponse>('GetQr', {
    PaymentId: paymentId,
    DataType: dataType,
  })
}

export async function tbankGetState(paymentId: string | number): Promise<TbankApiResponse> {
  return postTbank<TbankApiResponse>('GetState', {
    PaymentId: paymentId,
  })
}

/** Cashbox API: fiscal receipt status + OFD link (T-Checks). */
export async function tbankGetReceiptState(paymentId: string | number): Promise<TbankApiResponse> {
  return postTbankToBase(getTbankCashboxApiUrl(), 'GetReceiptState', {
    PaymentId: paymentId,
  })
}

export async function tbankCancel(
  paymentId: string | number,
  amountKopeks?: number,
): Promise<TbankApiResponse> {
  const params: TbankRequestParams = { PaymentId: paymentId }
  if (amountKopeks !== undefined) {
    params.Amount = amountKopeks
  }
  return postTbank<TbankApiResponse>('Cancel', params)
}
