import { ref, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrIncludeBooleanAttr, ssrRenderAttr, ssrInterpolate, ssrRenderList } from 'vue/server-renderer';
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
    const loading = ref(false);
    const error = ref("");
    const payingId = ref(null);
    useHead({
      meta: [{ name: "robots", content: "noindex" }]
    });
    function formatUser(user) {
      if (user.username) return `@${user.username}`;
      if (user.firstName) return user.firstName;
      if (user.telegramId) return `TG:${user.telegramId}`;
      if (user.maxUserId) return `MAX:${user.maxUserId}`;
      return "\u2014";
    }
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "min-h-screen bg-gray-50 p-6" }, _attrs))}><div class="mx-auto max-w-5xl"><div class="mb-6 flex items-center justify-between"><h1 class="text-2xl font-bold text-gray-900"> Kopir Admin </h1><button class="rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300 disabled:opacity-50"${ssrIncludeBooleanAttr(unref(loading) || !unref(adminSecret)) ? " disabled" : ""}> \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C </button></div>`);
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
      _push(`<div class="overflow-hidden rounded-lg border bg-white"><table class="min-w-full text-sm"><thead class="bg-gray-100 text-left text-gray-600"><tr><th class="px-4 py-3"> \u0417\u0430\u043A\u0430\u0437 </th><th class="px-4 py-3"> \u0424\u0430\u0439\u043B </th><th class="px-4 py-3"> \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C </th><th class="px-4 py-3"> \u0422\u043E\u0447\u043A\u0430 </th><th class="px-4 py-3"> \u0414\u0430\u0442\u0430 </th><th class="px-4 py-3"> \u0421\u0442\u0430\u0442\u0443\u0441 </th><th class="px-4 py-3"></th></tr></thead><tbody><!--[-->`);
      ssrRenderList(unref(orders), (order) => {
        _push(`<tr class="border-t"><td class="px-4 py-3 font-mono"> #${ssrInterpolate(order.shortId)}</td><td class="px-4 py-3">${ssrInterpolate(order.fileName)}</td><td class="px-4 py-3">${ssrInterpolate(formatUser(order.user))}</td><td class="px-4 py-3">${ssrInterpolate(order.point.name)}</td><td class="px-4 py-3 text-gray-500">${ssrInterpolate(new Date(order.createdAt).toLocaleString("ru-RU"))}</td><td class="px-4 py-3"> \u041E\u0436\u0438\u0434\u0430\u0435\u0442 \u043E\u043F\u043B\u0430\u0442\u044B </td><td class="px-4 py-3"><button class="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700 disabled:opacity-50"${ssrIncludeBooleanAttr(unref(payingId) === order.id) ? " disabled" : ""}>${ssrInterpolate(unref(payingId) === order.id ? "..." : "\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C")}</button></td></tr>`);
      });
      _push(`<!--]-->`);
      if (!unref(loading) && unref(orders).length === 0 && unref(adminSecret)) {
        _push(`<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500"> \u041D\u0435\u0442 \u0437\u0430\u043A\u0430\u0437\u043E\u0432, \u043E\u0436\u0438\u0434\u0430\u044E\u0449\u0438\u0445 \u043E\u043F\u043B\u0430\u0442\u044B </td></tr>`);
      } else {
        _push(`<!---->`);
      }
      if (unref(loading)) {
        _push(`<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500"> \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430... </td></tr>`);
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
//# sourceMappingURL=admin-ImoG_Sit.mjs.map
