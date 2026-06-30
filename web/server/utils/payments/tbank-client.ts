import { createHash } from 'node:crypto'
import { getTbankApiUrl, getTbankNotificationUrl, getTbankPassword, getTbankTerminalKey } from '../tbank-config'

const NESTED_TOKEN_KEYS = new Set(['DATA', 'Receipt', 'Items', 'Shops'])

export type TbankRequestParams = Record<string, string | number | boolean | null | undefined>

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

async function postTbank<T extends TbankApiResponse>(
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

  const apiUrl = getTbankApiUrl()
  const url = `${apiUrl.replace(/\/$/, '')}/${method}`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    console.error('[tbank] request failed:', method, error)
    throw tbankError('T-Bank API unreachable', 'TBANK_NETWORK_ERROR')
  }

  let data: T
  try {
    data = await response.json() as T
  } catch {
    throw tbankError('Invalid T-Bank API response', 'TBANK_INVALID_RESPONSE')
  }

  if (!response.ok) {
    throw tbankError(
      data.Message ?? `T-Bank HTTP ${response.status}`,
      data.ErrorCode ?? 'TBANK_HTTP_ERROR',
      response.status,
    )
  }

  if (!data.Success) {
    throw tbankError(
      data.Message ?? data.Details ?? 'T-Bank request failed',
      data.ErrorCode ?? 'TBANK_API_ERROR',
    )
  }

  return data
}

export interface TbankInitParams {
  amountKopeks: number
  merchantOrderId: string
  description: string
  notificationUrl?: string
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
