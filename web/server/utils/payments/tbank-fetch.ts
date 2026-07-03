import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import tls from 'node:tls'
import { Agent, fetch as undiciFetch, type RequestInit } from 'undici'

const BUNDLE_FILE = 'russian-trusted-ca-bundle.pem'

let cachedAgent: Agent | undefined
let agentResolved = false

function bundlePathCandidates(): string[] {
  const rel = join('certs', BUNDLE_FILE)
  const fromModule = fileURLToPath(new URL(`../../../certs/${BUNDLE_FILE}`, import.meta.url))
  return [
    process.env.NODE_EXTRA_CA_CERTS?.trim(),
    fromModule,
    join(process.cwd(), rel),
    join(process.cwd(), 'web', rel),
    `/var/task/${rel}`,
    `/var/task/web/${rel}`,
  ].filter((path): path is string => Boolean(path))
}

function loadExtraCaPem(): string | null {
  for (const path of bundlePathCandidates()) {
    try {
      if (existsSync(path)) {
        return readFileSync(path, 'utf8')
      }
    } catch {
      continue
    }
  }
  return null
}

function getTbankAgent(): Agent | undefined {
  if (agentResolved) {
    return cachedAgent
  }
  agentResolved = true

  const extra = loadExtraCaPem()
  if (!extra) {
    return undefined
  }

  const ca = [...tls.rootCertificates, extra].join('\n')
  cachedAgent = new Agent({ connect: { ca } })
  return cachedAgent
}

/** Outbound fetch to T-Bank API with Russian Trusted CA in addition to default roots. */
export async function tbankFetch(url: string, init?: RequestInit): Promise<Response> {
  const dispatcher = getTbankAgent()
  if (!dispatcher) {
    return fetch(url, init)
  }
  return undiciFetch(url, { ...init, dispatcher }) as Promise<Response>
}
