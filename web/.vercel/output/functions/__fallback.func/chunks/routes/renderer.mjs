import { w as withLeadingSlash, j as joinRelativeURL, u as useRuntimeConfig, e as encodePath, f as defineRenderHandler, g as getQuery, c as createError, h as getRouteRules, i as getResponseStatusText, k as getResponseStatus, l as useNitroApp } from '../nitro/nitro.mjs';
import { createHead as createHead$1, propsToString, renderSSRHead } from 'unhead/server';
import { renderToString } from '@vue/server-renderer';
import { stringify, uneval } from 'devalue';
import { walkResolver } from 'unhead/utils';
import * as compilerDom from '@vue/compiler-dom';
import { g as getDefaultExportFromNamespaceIfNotNamed, s as shared_cjs_prod } from '../_/shared.cjs.prod.mjs';
import * as runtimeDom from '@vue/runtime-dom';
import { DeprecationsPlugin, PromisesPlugin, TemplateParamsPlugin, AliasSortingPlugin } from 'unhead/plugins';

function createRendererContext({ manifest, precomputed, buildAssetsURL }) {
  if (!manifest && !precomputed) {
    throw new Error("Either manifest or precomputed data must be provided");
  }
  const ctx = {
    // Options
    buildAssetsURL: buildAssetsURL || withLeadingSlash,
    manifest,
    precomputed,
    updateManifest,
    // Internal cache
    _dependencies: {},
    _dependencySets: {},
    _entrypoints: []
  };
  function updateManifest(manifest2) {
    const manifestEntries = Object.entries(manifest2);
    ctx.manifest = manifest2;
    ctx._dependencies = {};
    ctx._dependencySets = {};
    ctx._entrypoints = manifestEntries.filter((e) => e[1].isEntry).map(([module]) => module);
  }
  if (precomputed) {
    ctx._dependencies = precomputed.dependencies;
    ctx._entrypoints = precomputed.entrypoints;
  } else if (manifest) {
    updateManifest(manifest);
  }
  return ctx;
}
function getModuleDependencies(id, rendererContext) {
  if (rendererContext._dependencies[id]) {
    return rendererContext._dependencies[id];
  }
  const dependencies = rendererContext._dependencies[id] = {
    scripts: {},
    styles: {},
    preload: {},
    prefetch: {}
  };
  if (!rendererContext.manifest) {
    return dependencies;
  }
  const meta = rendererContext.manifest[id];
  if (!meta) {
    return dependencies;
  }
  if (meta.file) {
    dependencies.preload[id] = meta;
    if (meta.isEntry || meta.sideEffects) {
      dependencies.scripts[id] = meta;
    }
  }
  for (const css of meta.css || []) {
    dependencies.styles[css] = dependencies.preload[css] = dependencies.prefetch[css] = rendererContext.manifest[css];
  }
  for (const asset of meta.assets || []) {
    dependencies.preload[asset] = dependencies.prefetch[asset] = rendererContext.manifest[asset];
  }
  for (const depId of meta.imports || []) {
    const depDeps = getModuleDependencies(depId, rendererContext);
    for (const key in depDeps.styles) {
      dependencies.styles[key] = depDeps.styles[key];
    }
    for (const key in depDeps.preload) {
      dependencies.preload[key] = depDeps.preload[key];
    }
    for (const key in depDeps.prefetch) {
      dependencies.prefetch[key] = depDeps.prefetch[key];
    }
  }
  const filteredPreload = {};
  for (const id2 in dependencies.preload) {
    const dep = dependencies.preload[id2];
    if (dep.preload) {
      filteredPreload[id2] = dep;
    }
  }
  dependencies.preload = filteredPreload;
  return dependencies;
}
function getAllDependencies(ids, rendererContext) {
  let cacheKey = "";
  const sortedIds = [...ids].sort();
  for (let i = 0; i < sortedIds.length; i++) {
    if (i > 0) cacheKey += ",";
    cacheKey += sortedIds[i];
  }
  if (rendererContext._dependencySets[cacheKey]) {
    return rendererContext._dependencySets[cacheKey];
  }
  const allDeps = {
    scripts: {},
    styles: {},
    preload: {},
    prefetch: {}
  };
  for (const id of ids) {
    const deps = getModuleDependencies(id, rendererContext);
    for (const key in deps.scripts) {
      allDeps.scripts[key] = deps.scripts[key];
    }
    for (const key in deps.styles) {
      allDeps.styles[key] = deps.styles[key];
    }
    for (const key in deps.preload) {
      allDeps.preload[key] = deps.preload[key];
    }
    for (const key in deps.prefetch) {
      allDeps.prefetch[key] = deps.prefetch[key];
    }
    for (const dynamicDepId of rendererContext.manifest?.[id]?.dynamicImports || []) {
      const dynamicDeps = getModuleDependencies(dynamicDepId, rendererContext);
      for (const key in dynamicDeps.scripts) {
        allDeps.prefetch[key] = dynamicDeps.scripts[key];
      }
      for (const key in dynamicDeps.styles) {
        allDeps.prefetch[key] = dynamicDeps.styles[key];
      }
      for (const key in dynamicDeps.preload) {
        allDeps.prefetch[key] = dynamicDeps.preload[key];
      }
    }
  }
  const filteredPrefetch = {};
  for (const id in allDeps.prefetch) {
    const dep = allDeps.prefetch[id];
    if (dep.prefetch) {
      filteredPrefetch[id] = dep;
    }
  }
  allDeps.prefetch = filteredPrefetch;
  for (const id in allDeps.preload) {
    delete allDeps.prefetch[id];
  }
  for (const style in allDeps.styles) {
    delete allDeps.preload[style];
    delete allDeps.prefetch[style];
  }
  rendererContext._dependencySets[cacheKey] = allDeps;
  return allDeps;
}
function getRequestDependencies(ssrContext, rendererContext) {
  if (ssrContext._requestDependencies) {
    return ssrContext._requestDependencies;
  }
  const ids = new Set(Array.from([
    ...rendererContext._entrypoints,
    ...ssrContext.modules || ssrContext._registeredComponents || []
  ]));
  const deps = getAllDependencies(ids, rendererContext);
  ssrContext._requestDependencies = deps;
  return deps;
}
function renderStyles(ssrContext, rendererContext) {
  const { styles } = getRequestDependencies(ssrContext, rendererContext);
  let result = "";
  for (const key in styles) {
    const resource = styles[key];
    result += `<link rel="stylesheet" href="${rendererContext.buildAssetsURL(resource.file)}" crossorigin>`;
  }
  return result;
}
function renderResourceHints(ssrContext, rendererContext) {
  const { preload, prefetch } = getRequestDependencies(ssrContext, rendererContext);
  let result = "";
  for (const key in preload) {
    const resource = preload[key];
    const href = rendererContext.buildAssetsURL(resource.file);
    const rel = resource.module ? "modulepreload" : "preload";
    const crossorigin = resource.resourceType === "style" || resource.resourceType === "font" || resource.resourceType === "script" || resource.module ? " crossorigin" : "";
    if (resource.resourceType && resource.mimeType) {
      result += `<link rel="${rel}" as="${resource.resourceType}" type="${resource.mimeType}"${crossorigin} href="${href}">`;
    } else if (resource.resourceType) {
      result += `<link rel="${rel}" as="${resource.resourceType}"${crossorigin} href="${href}">`;
    } else {
      result += `<link rel="${rel}"${crossorigin} href="${href}">`;
    }
  }
  for (const key in prefetch) {
    const resource = prefetch[key];
    const href = rendererContext.buildAssetsURL(resource.file);
    const crossorigin = resource.resourceType === "style" || resource.resourceType === "font" || resource.resourceType === "script" || resource.module ? " crossorigin" : "";
    if (resource.resourceType && resource.mimeType) {
      result += `<link rel="prefetch" as="${resource.resourceType}" type="${resource.mimeType}"${crossorigin} href="${href}">`;
    } else if (resource.resourceType) {
      result += `<link rel="prefetch" as="${resource.resourceType}"${crossorigin} href="${href}">`;
    } else {
      result += `<link rel="prefetch"${crossorigin} href="${href}">`;
    }
  }
  return result;
}
function renderResourceHeaders(ssrContext, rendererContext) {
  const { preload, prefetch } = getRequestDependencies(ssrContext, rendererContext);
  const links = [];
  for (const key in preload) {
    const resource = preload[key];
    const href = rendererContext.buildAssetsURL(resource.file);
    const rel = resource.module ? "modulepreload" : "preload";
    let header = `<${href}>; rel="${rel}"`;
    if (resource.resourceType) {
      header += `; as="${resource.resourceType}"`;
    }
    if (resource.mimeType) {
      header += `; type="${resource.mimeType}"`;
    }
    if (resource.resourceType === "style" || resource.resourceType === "font" || resource.resourceType === "script" || resource.module) {
      header += "; crossorigin";
    }
    links.push(header);
  }
  for (const key in prefetch) {
    const resource = prefetch[key];
    const href = rendererContext.buildAssetsURL(resource.file);
    let header = `<${href}>; rel="prefetch"`;
    if (resource.resourceType) {
      header += `; as="${resource.resourceType}"`;
    }
    if (resource.mimeType) {
      header += `; type="${resource.mimeType}"`;
    }
    if (resource.resourceType === "style" || resource.resourceType === "font" || resource.resourceType === "script" || resource.module) {
      header += "; crossorigin";
    }
    links.push(header);
  }
  return {
    link: links.join(", ")
  };
}
function getPreloadLinks(ssrContext, rendererContext) {
  const { preload } = getRequestDependencies(ssrContext, rendererContext);
  const result = [];
  for (const key in preload) {
    const resource = preload[key];
    result.push({
      rel: resource.module ? "modulepreload" : "preload",
      as: resource.resourceType,
      type: resource.mimeType ?? null,
      crossorigin: resource.resourceType === "style" || resource.resourceType === "font" || resource.resourceType === "script" || resource.module ? "" : null,
      href: rendererContext.buildAssetsURL(resource.file)
    });
  }
  return result;
}
function getPrefetchLinks(ssrContext, rendererContext) {
  const { prefetch } = getRequestDependencies(ssrContext, rendererContext);
  const result = [];
  for (const key in prefetch) {
    const resource = prefetch[key];
    result.push({
      rel: "prefetch",
      as: resource.resourceType,
      type: resource.mimeType ?? null,
      crossorigin: resource.resourceType === "style" || resource.resourceType === "font" || resource.resourceType === "script" || resource.module ? "" : null,
      href: rendererContext.buildAssetsURL(resource.file)
    });
  }
  return result;
}
function renderScripts(ssrContext, rendererContext) {
  const { scripts } = getRequestDependencies(ssrContext, rendererContext);
  let result = "";
  for (const key in scripts) {
    const resource = scripts[key];
    if (resource.module) {
      result += `<script type="module" src="${rendererContext.buildAssetsURL(resource.file)}" crossorigin><\/script>`;
    } else {
      result += `<script src="${rendererContext.buildAssetsURL(resource.file)}" defer crossorigin><\/script>`;
    }
  }
  return result;
}
function createRenderer(createApp, renderOptions) {
  const rendererContext = createRendererContext(renderOptions);
  return {
    rendererContext,
    async renderToString(ssrContext) {
      ssrContext._registeredComponents = ssrContext._registeredComponents || /* @__PURE__ */ new Set();
      const _createApp = await Promise.resolve(createApp).then((r) => "default" in r ? r.default : r);
      const app = await _createApp(ssrContext);
      const html = await renderOptions.renderToString(app, ssrContext);
      const wrap = (fn) => () => fn(ssrContext, rendererContext);
      return {
        html,
        renderResourceHeaders: wrap(renderResourceHeaders),
        renderResourceHints: wrap(renderResourceHints),
        renderStyles: wrap(renderStyles),
        renderScripts: wrap(renderScripts)
      };
    }
  };
}

var vue = {exports: {}};

var vue_cjs_prod = {};

const require$$0 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(compilerDom);

const require$$1 = /*@__PURE__*/getDefaultExportFromNamespaceIfNotNamed(runtimeDom);

/**
* vue v3.5.38
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/

(function (exports) {

	Object.defineProperty(exports, '__esModule', { value: true });

	var compilerDom = require$$0;
	var runtimeDom = require$$1;
	var shared = shared_cjs_prod;

	function _interopNamespaceDefault(e) {
	  var n = Object.create(null);
	  if (e) {
	    for (var k in e) {
	      n[k] = e[k];
	    }
	  }
	  n.default = e;
	  return Object.freeze(n);
	}

	var runtimeDom__namespace = /*#__PURE__*/_interopNamespaceDefault(runtimeDom);

	const compileCache = /* @__PURE__ */ Object.create(null);
	function compileToFunction(template, options) {
	  if (!shared.isString(template)) {
	    if (template.nodeType) {
	      template = template.innerHTML;
	    } else {
	      return shared.NOOP;
	    }
	  }
	  const key = shared.genCacheKey(template, options);
	  const cached = compileCache[key];
	  if (cached) {
	    return cached;
	  }
	  if (template[0] === "#") {
	    const el = document.querySelector(template);
	    template = el ? el.innerHTML : ``;
	  }
	  const opts = shared.extend(
	    {
	      hoistStatic: true,
	      onError: void 0,
	      onWarn: shared.NOOP
	    },
	    options
	  );
	  if (!opts.isCustomElement && typeof customElements !== "undefined") {
	    opts.isCustomElement = (tag) => !!customElements.get(tag);
	  }
	  const { code } = compilerDom.compile(template, opts);
	  const render = new Function("Vue", code)(runtimeDom__namespace);
	  render._rc = true;
	  return compileCache[key] = render;
	}
	runtimeDom.registerRuntimeCompiler(compileToFunction);

	exports.compile = compileToFunction;
	Object.keys(runtimeDom).forEach(function (k) {
	  if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = runtimeDom[k];
	}); 
} (vue_cjs_prod));

{
  vue.exports = vue_cjs_prod;
}

var vueExports = vue.exports;

const VueResolver = (_, value) => {
  return vueExports.isRef(value) ? vueExports.toValue(value) : value;
};

const headSymbol = "usehead";
// @__NO_SIDE_EFFECTS__
function vueInstall(head) {
  const plugin = {
    install(app) {
      app.config.globalProperties.$unhead = head;
      app.config.globalProperties.$head = head;
      app.provide(headSymbol, head);
    }
  };
  return plugin.install;
}

// @__NO_SIDE_EFFECTS__
function injectHead() {
  if (vueExports.hasInjectionContext()) {
    const instance = vueExports.inject(headSymbol);
    if (instance) {
      return instance;
    }
  }
  throw new Error("useHead() was called without provide context, ensure you call it through the setup() function.");
}
function useHead(input, options = {}) {
  const head = options.head || /* @__PURE__ */ injectHead();
  return head.ssr ? head.push(input || {}, options) : clientUseHead(head, input, options);
}
function clientUseHead(head, input, options = {}) {
  const deactivated = vueExports.ref(false);
  let entry;
  vueExports.watchEffect(() => {
    const i = deactivated.value ? {} : walkResolver(input, VueResolver);
    if (entry) {
      entry.patch(i);
    } else {
      entry = head.push(i, options);
    }
  });
  const vm = vueExports.getCurrentInstance();
  if (vm) {
    vueExports.onBeforeUnmount(() => {
      entry.dispose();
    });
    vueExports.onDeactivated(() => {
      deactivated.value = true;
    });
    vueExports.onActivated(() => {
      deactivated.value = false;
    });
  }
  return entry;
}

// @__NO_SIDE_EFFECTS__
function createHead(options = {}) {
  const head = createHead$1({
    ...options,
    propResolvers: [VueResolver]
  });
  head.install = vueInstall(head);
  return head;
}

const NUXT_RUNTIME_PAYLOAD_EXTRACTION = false;

const appHead = {"meta":[{"name":"viewport","content":"width=device-width, initial-scale=1"},{"charset":"utf-8"}],"link":[],"style":[],"script":[],"noscript":[]};

const appRootTag = "div";

const appRootAttrs = {"id":"__nuxt"};

const appTeleportTag = "div";

const appTeleportAttrs = {"id":"teleports"};

const appId = "nuxt-app";

function baseURL() {
	
	return useRuntimeConfig().app.baseURL;
}
function buildAssetsDir() {
	
	return useRuntimeConfig().app.buildAssetsDir;
}
function buildAssetsURL(...path) {
	return joinRelativeURL(publicAssetsURL(), buildAssetsDir(), ...path);
}
function publicAssetsURL(...path) {
	
	const app = useRuntimeConfig().app;
	const publicBase = app.cdnURL || app.baseURL;
	return path.length ? joinRelativeURL(publicBase, ...path) : publicBase;
}

// @ts-expect-error private property consumed by vite-generated url helpers
globalThis.__buildAssetsURL = buildAssetsURL;
// @ts-expect-error private property consumed by vite-generated url helpers
globalThis.__publicAssetsURL = publicAssetsURL;
const APP_ROOT_OPEN_TAG = `<${appRootTag}${propsToString(appRootAttrs)}>`;
const APP_ROOT_CLOSE_TAG = `</${appRootTag}>`;
// @ts-expect-error file will be produced after app build
const getServerEntry = () => import('../build/server.mjs').then((r) => r.default || r);
// @ts-expect-error file will be produced after app build
const getPrecomputedDependencies = () => import('../build/client.precomputed.mjs').then((r) => r.default || r).then((r) => typeof r === "function" ? r() : r);

const getSSRRenderer = lazyCachedFunction(async () => {
	
	const createSSRApp = await getServerEntry();
	if (!createSSRApp) {
		throw new Error("Server bundle is not available");
	}
	
	const precomputed = await getPrecomputedDependencies();
	
	const renderer = createRenderer(createSSRApp, {
		precomputed,
		manifest: undefined,
		renderToString: renderToString$1,
		buildAssetsURL
	});
	async function renderToString$1(input, context) {
		const html = await renderToString(input, context);
		return APP_ROOT_OPEN_TAG + html + APP_ROOT_CLOSE_TAG;
	}
	return renderer;
});

const getSPARenderer = lazyCachedFunction(async () => {
	const precomputed = await getPrecomputedDependencies();
	// @ts-expect-error virtual file
	const spaTemplate = await import('../virtual/_virtual_spa-template.mjs').then((r) => r.template).catch(() => "").then((r) => {
		{
			return APP_ROOT_OPEN_TAG + r + APP_ROOT_CLOSE_TAG;
		}
	});
	
	const renderer = createRenderer(() => () => {}, {
		precomputed,
		manifest: undefined,
		renderToString: () => spaTemplate,
		buildAssetsURL
	});
	const result = await renderer.renderToString({});
	const renderToString = (ssrContext) => {
		const config = useRuntimeConfig(ssrContext.event);
		ssrContext.modules ||= new Set();
		ssrContext.payload.serverRendered = false;
		ssrContext.config = {
			public: config.public,
			app: config.app
		};
		return Promise.resolve(result);
	};
	return {
		rendererContext: renderer.rendererContext,
		renderToString
	};
});
function lazyCachedFunction(fn) {
	let res = null;
	return () => {
		if (res === null) {
			res = fn().catch((err) => {
				res = null;
				throw err;
			});
		}
		return res;
	};
}
function getRenderer(ssrContext) {
	return ssrContext.noSSR ? getSPARenderer() : getSSRRenderer();
}
// @ts-expect-error file will be produced after app build
const getSSRStyles = lazyCachedFunction(() => import('../build/styles.mjs').then((r) => r.default || r));

function renderPayloadJsonScript(opts) {
	const contents = opts.data ? encodeForwardSlashes(stringify(opts.data, opts.ssrContext["~payloadReducers"])) : "";
	const payload = {
		"type": "application/json",
		"innerHTML": contents,
		"data-nuxt-data": appId,
		"data-ssr": !(opts.ssrContext.noSSR)
	};
	{
		payload.id = "__NUXT_DATA__";
	}
	if (opts.src) {
		payload["data-src"] = opts.src;
	}
	const config = uneval(opts.ssrContext.config);
	return [payload, { innerHTML: `window.__NUXT__={};window.__NUXT__.config=${config}` }];
}

function encodeForwardSlashes(str) {
	return str.replaceAll("/", "\\u002F");
}

const unheadOptions = {
  disableDefaults: true,
  disableCapoSorting: false,
  plugins: [DeprecationsPlugin, PromisesPlugin, TemplateParamsPlugin, AliasSortingPlugin],
};

function encodeEventPath(path) {
	const queryIndex = path.indexOf("?");
	if (queryIndex === -1) {
		return encodePath(path);
	}
	return encodePath(path.slice(0, queryIndex)) + path.slice(queryIndex);
}
function createSSRContext(event) {
	const url = encodeEventPath(event.path);
	const ssrContext = {
		url,
		event,
		runtimeConfig: useRuntimeConfig(event),
		noSSR: event.context.nuxt?.noSSR || (false),
		head: createHead(unheadOptions),
		error: false,
		nuxt: undefined,
		payload: {},
		["~payloadReducers"]: Object.create(null),
		modules: new Set()
	};
	return ssrContext;
}
function setSSRError(ssrContext, error) {
	ssrContext.error = true;
	ssrContext.payload = { error };
	ssrContext.url = error.url;
}

async function renderInlineStyles(usedModules) {
	const styleMap = await getSSRStyles();
	const inlinedStyles = new Set();
	for (const mod of usedModules) {
		if (mod in styleMap && styleMap[mod]) {
			for (const style of await styleMap[mod]()) {
				inlinedStyles.add(style);
			}
		}
	}
	return Array.from(inlinedStyles).map((style) => ({ innerHTML: style }));
}

const renderSSRHeadOptions = {"omitLineBreaks":false};

const entryIds = ["node_modules/nuxt/dist/app/entry.js"];

// @ts-expect-error private property consumed by vite-generated url helpers
globalThis.__buildAssetsURL = buildAssetsURL;
// @ts-expect-error private property consumed by vite-generated url helpers
globalThis.__publicAssetsURL = publicAssetsURL;
const HAS_APP_TELEPORTS = !!(appTeleportAttrs.id);
const APP_TELEPORT_OPEN_TAG = HAS_APP_TELEPORTS ? `<${appTeleportTag}${propsToString(appTeleportAttrs)}>` : "";
const APP_TELEPORT_CLOSE_TAG = HAS_APP_TELEPORTS ? `</${appTeleportTag}>` : "";
const handler = defineRenderHandler((event) => {
	
	const ssrError = event.path.startsWith("/__nuxt_error") ? getQuery(event) : null;
	if (ssrError && !("__unenv__" in event.node.req)) {
		throw createError({
			status: 404,
			statusText: "Page Not Found: /__nuxt_error",
			message: "Page Not Found: /__nuxt_error"
		});
	}
	return renderRoute(event, ssrError);
});
async function renderRoute(event, ssrError) {
	const nitroApp = useNitroApp();
	
	const ssrContext = createSSRContext(event);
	
	const headEntryOptions = { mode: "server" };
	ssrContext.head.push(appHead, headEntryOptions);
	if (ssrError) {
		
		const status = ssrError.status || ssrError.statusCode;
		if (status) {
			
			ssrError.status = ssrError.statusCode = Number.parseInt(status);
		}
		setSSRError(ssrContext, ssrError);
	}
	
	const routeOptions = getRouteRules(event);
	if (routeOptions.ssr === false) {
		ssrContext.noSSR = true;
	}
	
	!ssrContext.noSSR && (NUXT_RUNTIME_PAYLOAD_EXTRACTION);
	
	const renderer = await getRenderer(ssrContext);
	{
		for (const id of entryIds) {
			ssrContext.modules.add(id);
		}
	}
	const _rendered = await renderer.renderToString(ssrContext).catch(async (error) => {
		
		
		if ((ssrContext["~renderResponse"] || ssrContext._renderResponse) && error.message === "skipping render") {
			return {};
		}
		
		const _err = !ssrError && ssrContext.payload?.error || error;
		await ssrContext.nuxt?.hooks.callHook("app:error", _err);
		throw _err;
	});
	
	
	const inlinedStyles = !ssrContext["~renderResponse"] && !ssrContext._renderResponse && true ? await renderInlineStyles(ssrContext.modules ?? []) : [];
	await ssrContext.nuxt?.hooks.callHook("app:rendered", {
		ssrContext,
		renderResult: _rendered
	});
	if (ssrContext["~renderResponse"] || ssrContext._renderResponse) {
		
		return ssrContext["~renderResponse"] || ssrContext._renderResponse;
	}
	
	if (ssrContext.payload?.error && !ssrError) {
		throw ssrContext.payload.error;
	}
	const NO_SCRIPTS = routeOptions.noScripts;
	
	const { styles, scripts } = getRequestDependencies(ssrContext, renderer.rendererContext);
	if (ssrContext["~preloadManifest"] && !NO_SCRIPTS) {
		ssrContext.head.push({ link: [{
			rel: "preload",
			as: "fetch",
			fetchpriority: "low",
			crossorigin: "anonymous",
			href: buildAssetsURL(`builds/meta/${ssrContext.runtimeConfig.app.buildId}.json`)
		}] }, {
			...headEntryOptions,
			tagPriority: "low"
		});
	}
	
	if (inlinedStyles.length) {
		ssrContext.head.push({ style: inlinedStyles });
	}
	const link = [];
	for (const resource of Object.values(styles)) {
		
		
		
		link.push({
			rel: "stylesheet",
			href: renderer.rendererContext.buildAssetsURL(resource.file),
			crossorigin: ""
		});
	}
	if (link.length) {
		ssrContext.head.push({ link }, headEntryOptions);
	}
	if (!NO_SCRIPTS) {
		
		
		
		if (ssrContext["~lazyHydratedModules"]) {
			for (const id of ssrContext["~lazyHydratedModules"]) {
				ssrContext.modules?.delete(id);
			}
		}
		
		ssrContext.head.push({ link: getPreloadLinks(ssrContext, renderer.rendererContext) }, headEntryOptions);
		ssrContext.head.push({ link: getPrefetchLinks(ssrContext, renderer.rendererContext) }, headEntryOptions);
		
		ssrContext.head.push({ script: renderPayloadJsonScript({
			ssrContext,
			data: ssrContext.payload
		})  }, {
			...headEntryOptions,
			
			tagPosition: "bodyClose",
			tagPriority: "high"
		});
	}
	
	if (!routeOptions.noScripts) {
		const tagPosition = "head";
		ssrContext.head.push({ script: Object.values(scripts).map((resource) => ({
			type: resource.module ? "module" : null,
			src: renderer.rendererContext.buildAssetsURL(resource.file),
			defer: resource.module ? null : true,
			
			
			tagPosition,
			crossorigin: ""
		})) }, headEntryOptions);
	}
	const { headTags, bodyTags, bodyTagsOpen, htmlAttrs, bodyAttrs } = await renderSSRHead(ssrContext.head, renderSSRHeadOptions);
	
	const htmlContext = {
		htmlAttrs: htmlAttrs ? [htmlAttrs] : [],
		head: normalizeChunks([headTags]),
		bodyAttrs: bodyAttrs ? [bodyAttrs] : [],
		bodyPrepend: normalizeChunks([bodyTagsOpen, ssrContext.teleports?.body]),
		body: [_rendered.html, APP_TELEPORT_OPEN_TAG + (HAS_APP_TELEPORTS ? joinTags([ssrContext.teleports?.[`#${appTeleportAttrs.id}`]]) : "") + APP_TELEPORT_CLOSE_TAG],
		bodyAppend: [bodyTags]
	};
	
	await nitroApp.hooks.callHook("render:html", htmlContext, { event });
	
	return {
		body: renderHTMLDocument(htmlContext),
		statusCode: getResponseStatus(event),
		statusMessage: getResponseStatusText(event),
		headers: {
			"content-type": "text/html;charset=utf-8",
			"x-powered-by": "Nuxt"
		}
	};
}
function normalizeChunks(chunks) {
	const result = [];
	for (const _chunk of chunks) {
		const chunk = _chunk?.trim();
		if (chunk) {
			result.push(chunk);
		}
	}
	return result;
}
function joinTags(tags) {
	return tags.join("");
}
function joinAttrs(chunks) {
	if (chunks.length === 0) {
		return "";
	}
	return " " + chunks.join(" ");
}
function renderHTMLDocument(html) {
	return "<!DOCTYPE html>" + `<html${joinAttrs(html.htmlAttrs)}>` + `<head>${joinTags(html.head)}</head>` + `<body${joinAttrs(html.bodyAttrs)}>${joinTags(html.bodyPrepend)}${joinTags(html.body)}${joinTags(html.bodyAppend)}</body>` + "</html>";
}

const renderer = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: handler
}, Symbol.toStringTag, { value: 'Module' }));

export { baseURL as b, headSymbol as h, renderer as r, useHead as u, vueExports as v };
//# sourceMappingURL=renderer.mjs.map
