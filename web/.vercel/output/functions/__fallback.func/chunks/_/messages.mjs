import { u as useRuntimeConfig } from '../nitro/nitro.mjs';

function getPaymentMode() {
  var _a;
  const config = useRuntimeConfig();
  const raw = String((_a = config.paymentMode) != null ? _a : "terminal").toLowerCase();
  return raw === "online" ? "online" : "terminal";
}
function isTerminalPaymentMode() {
  return getPaymentMode() === "terminal";
}
function getStaffTelegramChatId() {
  var _a;
  const config = useRuntimeConfig();
  const raw = String((_a = config.staffTelegramChatId) != null ? _a : "").trim();
  if (!raw) {
    return null;
  }
  const chatId = Number(raw);
  return Number.isFinite(chatId) ? chatId : null;
}
function getStaffMaxUserId() {
  var _a;
  const config = useRuntimeConfig();
  const raw = String((_a = config.staffMaxUserId) != null ? _a : "").trim();
  if (!raw) {
    return null;
  }
  const userId = Number(raw);
  return Number.isFinite(userId) ? userId : null;
}
function isStaffChannelConfigured() {
  return getStaffTelegramChatId() !== null || getStaffMaxUserId() !== null;
}

const MSG_START = "\u041F\u0440\u0438\u0432\u0435\u0442! \u041E\u0442\u043F\u0440\u0430\u0432\u044C PDF \u0438\u043B\u0438 Word-\u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 (.doc, .docx) \u0434\u043B\u044F \u043F\u0435\u0447\u0430\u0442\u0438.\n\n\u041F\u043E\u0441\u043B\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u043C\u044B \u0441\u043E\u043E\u0431\u0449\u0438\u043C \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u0438 \u0434\u0430\u043B\u044C\u043D\u0435\u0439\u0448\u0438\u0435 \u0448\u0430\u0433\u0438 \u043F\u043E \u043E\u043F\u043B\u0430\u0442\u0435.";
const MSG_UNSUPPORTED_FILE = "\u041F\u043E\u043A\u0430 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u043C \u0442\u043E\u043B\u044C\u043A\u043E PDF \u0438 Word (.doc, .docx). \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0444\u0430\u0439\u043B \u0432 \u043E\u0434\u043D\u043E\u043C \u0438\u0437 \u044D\u0442\u0438\u0445 \u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0432.";
const MSG_CALCULATING = "\u0421\u0447\u0438\u0442\u0430\u0435\u043C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u043D\u0430 \u043F\u0440\u0438\u043D\u0442\u0435\u0440\u0435\u2026 \u042D\u0442\u043E \u043C\u043E\u0436\u0435\u0442 \u0437\u0430\u043D\u044F\u0442\u044C \u0434\u043E 20 \u0441\u0435\u043A\u0443\u043D\u0434.";
const MSG_CALCULATION_FAILED = "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u0444\u0430\u0439\u043B. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435, \u0447\u0442\u043E \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u043D\u0435 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D, \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430 \u0438\u043B\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 PDF.";
function clientPaymentHint() {
  if (isTerminalPaymentMode()) {
    return "\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u0435 \u043D\u0430 \u0442\u0435\u0440\u043C\u0438\u043D\u0430\u043B\u0435 \u043A\u043E\u043F\u0438\u0446\u0435\u043D\u0442\u0440\u0430.\n\u0421\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A \u043F\u043E\u043B\u0443\u0447\u0438\u0442 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435 \u2014 \u043F\u043E\u0441\u043B\u0435 \u043E\u043F\u043B\u0430\u0442\u044B \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442 \u0435\u0451 \u0438 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442 \u043F\u0435\u0447\u0430\u0442\u044C.";
  }
  return "\u041E\u043F\u043B\u0430\u0442\u0430 \u0432 \u0431\u043E\u0442\u0435 \u0441\u043A\u043E\u0440\u043E \u0431\u0443\u0434\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430. \u041F\u043E\u043A\u0430 \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u043A \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u0443 \u043A\u043E\u043F\u0438\u0446\u0435\u043D\u0442\u0440\u0430.";
}
function formatOrderReceived(fileName, shortId) {
  return `\u{1F4C4} \u0424\u0430\u0439\u043B \u043F\u043E\u043B\u0443\u0447\u0435\u043D: ${fileName}
\u0417\u0430\u043A\u0430\u0437 #${shortId}

` + clientPaymentHint();
}
function formatCalculating(fileName, shortId) {
  return `\u{1F4C4} \u0424\u0430\u0439\u043B \u043F\u043E\u043B\u0443\u0447\u0435\u043D: ${fileName}
\u0417\u0430\u043A\u0430\u0437 #${shortId}

` + MSG_CALCULATING;
}
function formatQuote(fileName, pageCount, amountKopeks) {
  const amountRub = Math.round(amountKopeks / 100);
  return `\u{1F4C4} ${fileName}
\u0421\u0442\u0440\u0430\u043D\u0438\u0446: ${pageCount}
\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C: ${amountRub} \u20BD

` + clientPaymentHint();
}
function formatCalculationFailed(fileName, errorMessage) {
  const detail = errorMessage == null ? void 0 : errorMessage.trim();
  if (detail) {
    return `${MSG_CALCULATION_FAILED}

\u041F\u0440\u0438\u0447\u0438\u043D\u0430: ${detail}`;
  }
  return MSG_CALCULATION_FAILED;
}
function formatPaymentReceivedByStaff(shortId) {
  return `\u2705 \u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u0440\u0438\u043D\u044F\u0442\u0430!
\u0417\u0430\u043A\u0430\u0437 #${shortId}
\u0421\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442 \u043F\u0435\u0447\u0430\u0442\u044C.`;
}
function formatPrintStarted(shortId) {
  return `\u{1F5A8} \u0417\u0430\u043A\u0430\u0437 #${shortId} \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u043D\u0430 \u043F\u0435\u0447\u0430\u0442\u044C.
\u0417\u0430\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u0443 \u043F\u0440\u0438\u043D\u0442\u0435\u0440\u0430, \u043A\u043E\u0433\u0434\u0430 \u0431\u0443\u0434\u0435\u0442 \u0433\u043E\u0442\u043E\u0432\u043E.`;
}
function formatPrintComplete(shortId) {
  return `\u2705 \u0413\u043E\u0442\u043E\u0432\u043E!
\u0417\u0430\u043A\u0430\u0437 #${shortId}
\u0417\u0430\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u0443 \u043F\u0440\u0438\u043D\u0442\u0435\u0440\u0430.`;
}
function formatStaffOrderAwaitingPayment(order) {
  var _a;
  const shortId = order.id.slice(-6);
  const amountText = order.amountKopeks > 0 ? `${Math.round(order.amountKopeks / 100)} \u20BD` : "\u0443\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u0443 \u043A\u043B\u0438\u0435\u043D\u0442\u0430";
  const userLabel = order.user.username ? `@${order.user.username}` : (_a = order.user.firstName) != null ? _a : "\u043A\u043B\u0438\u0435\u043D\u0442";
  return `\u{1F195} \u041D\u043E\u0432\u044B\u0439 \u0437\u0430\u043A\u0430\u0437 #${shortId}
\u{1F4C4} ${order.fileName}
\u0421\u0442\u0440\u0430\u043D\u0438\u0446: ${order.pageCount} | ${amountText}
\u041A\u043B\u0438\u0435\u043D\u0442: ${userLabel}
\u0422\u043E\u0447\u043A\u0430: ${order.point.name}

\u041F\u0440\u0438\u043C\u0438\u0442\u0435 \u043E\u043F\u043B\u0430\u0442\u0443 \u043D\u0430 \u0442\u0435\u0440\u043C\u0438\u043D\u0430\u043B\u0435, \u0437\u0430\u0442\u0435\u043C:
1\uFE0F\u20E3 \xAB\u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430\xBB
2\uFE0F\u20E3 \xAB\u041F\u0435\u0447\u0430\u0442\u044C\xBB`;
}
function paymentModeLabel(mode) {
  return mode === "terminal" ? "\u0422\u0435\u0440\u043C\u0438\u043D\u0430\u043B (\u0440\u0443\u0447\u043D\u043E\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435)" : "\u041E\u043D\u043B\u0430\u0439\u043D (\u0441\u043A\u043E\u0440\u043E)";
}

export { MSG_START as M, getStaffMaxUserId as a, getStaffTelegramChatId as b, isStaffChannelConfigured as c, formatCalculationFailed as d, formatQuote as e, formatStaffOrderAwaitingPayment as f, getPaymentMode as g, formatPrintComplete as h, isTerminalPaymentMode as i, formatPaymentReceivedByStaff as j, formatPrintStarted as k, MSG_UNSUPPORTED_FILE as l, formatCalculating as m, formatOrderReceived as n, paymentModeLabel as p };
//# sourceMappingURL=messages.mjs.map
