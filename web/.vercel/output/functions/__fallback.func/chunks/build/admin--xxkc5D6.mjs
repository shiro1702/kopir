import { ref, computed, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderAttr, ssrRenderList } from 'vue/server-renderer';
import { u as useHead } from './v3-DDj14wyo.mjs';
import './server.mjs';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'unhead/plugins';
import 'vue-router';

const _sfc_main = {
  __name: "admin",
  __ssrInlineRender: true,
  setup(__props) {
    const adminSecret = ref("");
    const orders = ref([]);
    const adminConfig = ref(null);
    const loading = ref(false);
    const error = ref("");
    const confirmingId = ref(null);
    const printingId = ref(null);
    useHead({
      meta: [{ name: "robots", content: "noindex" }]
    });
    const isTerminalMode = computed(() => {
      var _a;
      return ((_a = adminConfig.value) == null ? void 0 : _a.paymentMode) === "terminal";
    });
    function formatAmount(amountKopeks) {
      if (!amountKopeks) return "\u2014";
      return `${Math.round(amountKopeks / 100)} \u20BD`;
    }
    function formatPages(pageCount) {
      return pageCount != null ? pageCount : "\u2014";
    }
    function formatUser(user) {
      if (user.username) return `@${user.username}`;
      if (user.firstName) return user.firstName;
      if (user.telegramId) return `TG:${user.telegramId}`;
      if (user.maxUserId) return `MAX:${user.maxUserId}`;
      return "\u2014";
    }
    function orderStatusLabel(order) {
      if (order.paymentConfirmedAt) return "\u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u0440\u0438\u043D\u044F\u0442\u0430";
      return "\u0416\u0434\u0451\u0442 \u043E\u043F\u043B\u0430\u0442\u0443 \u043D\u0430 \u0442\u0435\u0440\u043C\u0438\u043D\u0430\u043B\u0435";
    }
    function canPrint(order) {
      if (!isTerminalMode.value) return true;
      return Boolean(order.paymentConfirmedAt);
    }
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "min-h-screen bg-gray-50 p-6" }, _attrs))}><div class="mx-auto max-w-5xl"><div class="mb-6 flex items-center justify-between gap-4"><div><h1 class="text-2xl font-bold text-gray-900"> Kopir Admin </h1>`);
      if (unref(adminConfig)) {
        _push(`<p class="mt-1 text-sm text-gray-500"> \u0420\u0435\u0436\u0438\u043C \u043E\u043F\u043B\u0430\u0442\u044B: ${ssrInterpolate(unref(adminConfig).paymentModeLabel)} `);
        if (unref(adminConfig).staffTelegramConfigured) {
          _push(`<span> \xB7 TG-\u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A</span>`);
        } else {
          _push(`<!---->`);
        }
        if (unref(adminConfig).staffMaxConfigured) {
          _push(`<span> \xB7 MAX-\u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A</span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><button class="rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300 disabled:opacity-50"${ssrIncludeBooleanAttr(unref(loading) || !unref(adminSecret)) ? " disabled" : ""}> \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C </button></div>`);
      if (!unref(adminSecret) || unref(error) === "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 ADMIN_SECRET") {
        _push(`<div class="mb-6 rounded-lg border bg-white p-4"><label class="mb-2 block text-sm font-medium text-gray-700"> ADMIN_SECRET </label><div class="flex gap-2"><input${ssrRenderAttr("value", unref(adminSecret))} type="password" class="flex-1 rounded border px-3 py-2 text-sm" placeholder="Bearer secret"><button class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"> \u0412\u043E\u0439\u0442\u0438 </button></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (unref(error) && unref(error) !== "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 ADMIN_SECRET") {
        _push(`<p class="mb-4 text-sm text-red-600">${ssrInterpolate(unref(error))}</p>`);
      } else {
        _push(`<!---->`);
      }
      if (unref(isTerminalMode) && unref(adminSecret)) {
        _push(`<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"> \u0422\u0435\u0441\u0442\u043E\u0432\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \xAB\u0442\u0435\u0440\u043C\u0438\u043D\u0430\u043B\xBB: \u043A\u043B\u0438\u0435\u043D\u0442 \u043F\u043B\u0430\u0442\u0438\u0442 \u043D\u0430 \u0442\u0435\u0440\u043C\u0438\u043D\u0430\u043B\u0435 \u2192 \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435 \u0432 Telegram (\u0435\u0441\u043B\u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u044B <code class="text-xs">STAFF_TELEGRAM_CHAT_ID</code> \u0438/\u0438\u043B\u0438 <code class="text-xs">STAFF_MAX_USER_ID</code>) \u2192 \xAB\u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430\xBB \u2192 \xAB\u041F\u0435\u0447\u0430\u0442\u044C\xBB. \u0414\u043B\u044F \u043E\u043D\u043B\u0430\u0439\u043D-\u043E\u043F\u043B\u0430\u0442\u044B \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u0435 <code class="text-xs">PAYMENT_MODE=online</code>. </div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="overflow-hidden rounded-lg border bg-white"><table class="min-w-full text-sm"><thead class="bg-gray-100 text-left text-gray-600"><tr><th class="px-4 py-3"> \u0417\u0430\u043A\u0430\u0437 </th><th class="px-4 py-3"> \u0424\u0430\u0439\u043B </th><th class="px-4 py-3"> \u0421\u0442\u0440\u0430\u043D\u0438\u0446 </th><th class="px-4 py-3"> \u0421\u0443\u043C\u043C\u0430 </th><th class="px-4 py-3"> \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C </th><th class="px-4 py-3"> \u0422\u043E\u0447\u043A\u0430 </th><th class="px-4 py-3"> \u0414\u0430\u0442\u0430 </th><th class="px-4 py-3"> \u0421\u0442\u0430\u0442\u0443\u0441 </th><th class="px-4 py-3"></th></tr></thead><tbody><!--[-->`);
      ssrRenderList(unref(orders), (order) => {
        _push(`<tr class="border-t"><td class="px-4 py-3 font-mono"> #${ssrInterpolate(order.shortId)}</td><td class="px-4 py-3">${ssrInterpolate(order.fileName)}</td><td class="px-4 py-3">${ssrInterpolate(formatPages(order.pageCount))}</td><td class="px-4 py-3">${ssrInterpolate(formatAmount(order.amountKopeks))}</td><td class="px-4 py-3">${ssrInterpolate(formatUser(order.user))}</td><td class="px-4 py-3">${ssrInterpolate(order.point.name)}</td><td class="px-4 py-3 text-gray-500">${ssrInterpolate(new Date(order.createdAt).toLocaleString("ru-RU"))}</td><td class="px-4 py-3">${ssrInterpolate(orderStatusLabel(order))}</td><td class="px-4 py-3"><div class="flex flex-col gap-1 sm:flex-row">`);
        if (unref(isTerminalMode) && !order.paymentConfirmedAt) {
          _push(`<button class="rounded bg-amber-500 px-3 py-1 text-white hover:bg-amber-600 disabled:opacity-50"${ssrIncludeBooleanAttr(unref(confirmingId) === order.id) ? " disabled" : ""}>${ssrInterpolate(unref(confirmingId) === order.id ? "..." : "\u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430")}</button>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<button class="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700 disabled:opacity-50"${ssrIncludeBooleanAttr(unref(printingId) === order.id || !canPrint(order)) ? " disabled" : ""}${ssrRenderAttr("title", !canPrint(order) ? "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u043E\u043F\u043B\u0430\u0442\u0443" : "")}>${ssrInterpolate(unref(printingId) === order.id ? "..." : "\u041F\u0435\u0447\u0430\u0442\u044C")}</button></div></td></tr>`);
      });
      _push(`<!--]-->`);
      if (!unref(loading) && unref(orders).length === 0 && unref(adminSecret)) {
        _push(`<tr><td colspan="9" class="px-4 py-8 text-center text-gray-500"> \u041D\u0435\u0442 \u0437\u0430\u043A\u0430\u0437\u043E\u0432, \u043E\u0436\u0438\u0434\u0430\u044E\u0449\u0438\u0445 \u043F\u0435\u0447\u0430\u0442\u0438 </td></tr>`);
      } else {
        _push(`<!---->`);
      }
      if (unref(loading)) {
        _push(`<tr><td colspan="9" class="px-4 py-8 text-center text-gray-500"> \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430... </td></tr>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</tbody></table></div></div></div>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/admin.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=admin--xxkc5D6.mjs.map
