import { assertAdminAuth } from '../../../utils/admin-auth'
import { generateAgentReportPdf, getPartnerAgentReport } from '../../../utils/partner-agent-report'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const query = getQuery(event)
  const partnerId = String(query.partnerId ?? '').trim()
  const month = String(query.month ?? '').trim()

  if (!partnerId) {
    throw createError({
      statusCode: 400,
      data: { error: 'partnerId is required', code: 'PARTNER_ID_REQUIRED' },
    })
  }
  if (!month) {
    throw createError({
      statusCode: 400,
      data: { error: 'month is required (YYYY-MM)', code: 'MONTH_REQUIRED' },
    })
  }

  const config = useRuntimeConfig()
  const report = await getPartnerAgentReport(partnerId, month)
  const pdfBytes = await generateAgentReportPdf(report, {
    name: String(config.payoutPayerName || config.public.legalEntityName || 'Kopir').trim(),
    inn: String(config.payoutPayerInn || config.public.legalInn || '').replace(/\D/g, ''),
  })

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="kopir-agent-report-${month}.pdf"`)

  return pdfBytes
})
