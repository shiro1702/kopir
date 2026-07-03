import {
  getTbankReceiptEmail,
  getTbankReceiptItemName,
  getTbankReceiptPaymentMethod,
  getTbankReceiptPaymentObject,
  getTbankReceiptTax,
  getTbankReceiptTaxation,
  isTbankReceiptEnabled,
} from '../tbank-config'

export interface TbankReceiptItemFfd105 {
  Name: string
  Price: number
  Quantity: number
  Amount: number
  Tax: string
  PaymentMethod: string
  PaymentObject: string
}

export interface TbankReceiptFfd105 {
  Email?: string
  Phone?: string
  Taxation: string
  Items: TbankReceiptItemFfd105[]
}

export interface BuildTbankReceiptParams {
  amountKopeks: number
  itemName: string
  email?: string | null
  phone?: string | null
}

export function buildTbankReceiptFfd105(params: BuildTbankReceiptParams): TbankReceiptFfd105 {
  const email = params.email?.trim() || getTbankReceiptEmail()
  const phone = params.phone?.trim()

  if (!email && !phone) {
    throw createError({
      statusCode: 500,
      data: {
        error: 'Receipt email is not configured (TBANK_RECEIPT_EMAIL)',
        code: 'TBANK_RECEIPT_MISCONFIGURED',
      },
    })
  }

  const name = params.itemName.trim().slice(0, 64) || getTbankReceiptItemName().slice(0, 64)
  const amount = params.amountKopeks

  const receipt: TbankReceiptFfd105 = {
    Taxation: getTbankReceiptTaxation(),
    Items: [{
      Name: name,
      Price: amount,
      Quantity: 1,
      Amount: amount,
      Tax: getTbankReceiptTax(),
      PaymentMethod: getTbankReceiptPaymentMethod(),
      PaymentObject: getTbankReceiptPaymentObject(),
    }],
  }

  if (email) {
    receipt.Email = email
  }
  if (phone) {
    receipt.Phone = phone
  }

  return receipt
}

export function maybeBuildTbankReceipt(
  params: BuildTbankReceiptParams,
): TbankReceiptFfd105 | undefined {
  if (!isTbankReceiptEnabled()) {
    return undefined
  }
  return buildTbankReceiptFfd105(params)
}
