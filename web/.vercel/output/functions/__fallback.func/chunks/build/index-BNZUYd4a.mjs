import { _ as __nuxt_component_0 } from './nuxt-link-BBKNMA8w.mjs';
import { mergeProps, withCtx, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent } from 'vue/server-renderer';
import { _ as _export_sfc } from './server.mjs';
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

const _sfc_main = {};
function _sfc_ssrRender(_ctx, _push, _parent, _attrs) {
  const _component_NuxtLink = __nuxt_component_0;
  _push(`<div${ssrRenderAttrs(mergeProps({ class: "flex min-h-screen items-center justify-center bg-gray-50" }, _attrs))}><div class="text-center"><h1 class="text-3xl font-bold text-gray-900"> Kopir dev </h1><p class="mt-2 text-gray-600"> Self-service \u043F\u0435\u0447\u0430\u0442\u044C \u2014 Sprint 0 </p>`);
  _push(ssrRenderComponent(_component_NuxtLink, {
    to: "/admin",
    class: "mt-6 inline-block text-sm text-blue-600 hover:underline"
  }, {
    default: withCtx((_, _push2, _parent2, _scopeId) => {
      if (_push2) {
        _push2(` \u0410\u0434\u043C\u0438\u043D\u043A\u0430 `);
      } else {
        return [
          createTextVNode(" \u0410\u0434\u043C\u0438\u043D\u043A\u0430 ")
        ];
      }
    }),
    _: 1
  }, _parent));
  _push(`</div></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);

export { index as default };
//# sourceMappingURL=index-BNZUYd4a.mjs.map
