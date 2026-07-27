import { clearPartnerSessionCookie } from '../../../utils/partner-session'

export default defineEventHandler(async (event) => {
  clearPartnerSessionCookie(event)
  return { ok: true }
})
