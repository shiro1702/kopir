export type PrintBatchOrder = {
  id: string
  fileName: string
  status: string
  pageCount: number
  copies: number
  amountKopeks: number
  batchIndex: number | null
  errorMessage: string | null
}

export type PrintBatchPoint = {
  id: string
  slug: string
  name: string
  address: string | null
  displayCode: string | null
  pricePerPageKopeks: number
  citySlug: string
}

export type PrintBatch = {
  id: string
  status: string
  totalPages: number
  totalAmountKopeks: number
  shortId: string
  paymentMethod: string | null
  point: PrintBatchPoint | null
  orders: PrintBatchOrder[]
  createdAt: string
  updatedAt: string
}

export type PrintPaymentInfo = {
  paymentId: string
  payUrl: string
  channel: 'sbp' | 'card'
  amountKopeks: number
  shortId: string
}

export type PrintWizardStep = 'files' | 'point' | 'payment' | 'status'
