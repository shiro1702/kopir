import type { Order, OrderBatch, PaymentMethod, Point, User } from '@prisma/client'

export type PaymentEntityKind = 'order' | 'batch'

export type StaffNotifyTrigger = 'on_method_selected' | 'on_client_claimed'

export interface PaymentContext {
  kind: PaymentEntityKind
  entityId: string
  shortId: string
  amountKopeks: number
  paymentMethod: PaymentMethod | null
  point: Point
  user: Pick<User, 'username' | 'firstName'>
  order?: Pick<Order, 'id' | 'fileName' | 'pageCount'>
  batch?: Pick<OrderBatch, 'id' | 'totalPages'> & {
    orders: Array<Pick<Order, 'fileName' | 'batchIndex'>>
  }
}

export interface PaymentProvider {
  readonly method: PaymentMethod
  readonly staffNotifyTrigger: StaffNotifyTrigger
}
