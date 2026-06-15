export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  return {
    ok: true,
    version: config.public.appVersion,
  }
})
