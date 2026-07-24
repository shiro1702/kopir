export default defineNuxtRouteMiddleware(async (to) => {
  const publicPaths = new Set(['/partner/login', '/partner/register'])
  if (publicPaths.has(to.path)) {
    return
  }

  if (!to.path.startsWith('/partner')) {
    return
  }

  try {
    await $fetch('/api/partner/me')
  } catch (err: unknown) {
    const status = (err as { statusCode?: number, status?: number })?.statusCode
      ?? (err as { status?: number })?.status
    if (status === 401) {
      return navigateTo({
        path: '/partner/login',
        query: { next: to.fullPath },
      })
    }
  }
})
