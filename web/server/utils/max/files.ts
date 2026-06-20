import type { MaxAttachment, MaxMessage } from './types'
import type { MaxClient } from './client'
import { guessFileNameFromUrl } from '../file-types'

function findFileAttachment(attachments: MaxAttachment[] | undefined | null) {
  return attachments?.find((attachment) => attachment.type === 'file')
}

function resolveFileAttachment(message: MaxMessage): MaxAttachment | undefined {
  return findFileAttachment(message.body?.attachments)
    ?? findFileAttachment(message.link?.message?.attachments)
}

function attachmentFileName(attachment: MaxAttachment): string {
  return attachment.filename
    ?? (attachment.payload?.url ? guessFileNameFromUrl(attachment.payload.url) : undefined)
    ?? 'document.bin'
}

function pickDownloadUrl(attachment: MaxAttachment): string | undefined {
  const url = attachment.payload?.url?.trim()
  return url || undefined
}

async function resolveAttachmentWithUrl(
  client: MaxClient,
  message: MaxMessage,
  attachment: MaxAttachment,
): Promise<MaxAttachment> {
  if (pickDownloadUrl(attachment)) {
    return attachment
  }

  const messageIds = [
    message.link?.message?.mid,
    message.body?.mid,
  ].filter((mid): mid is string => Boolean(mid))

  for (const messageId of messageIds) {
    const resolvedMessage = await client.getMessageById(messageId)
    const resolvedAttachment = resolveFileAttachment(resolvedMessage)
    if (resolvedAttachment && pickDownloadUrl(resolvedAttachment)) {
      return {
        ...resolvedAttachment,
        filename: resolvedAttachment.filename ?? attachment.filename,
      }
    }
  }

  return attachment
}

export async function downloadMaxFileAttachment(
  client: MaxClient,
  message: MaxMessage,
  attachment: MaxAttachment,
): Promise<{ buffer: Buffer, fileName: string }> {
  const resolved = await resolveAttachmentWithUrl(client, message, attachment)
  const url = pickDownloadUrl(resolved)

  if (!url) {
    throw new Error('MAX file attachment has no download URL')
  }

  return {
    buffer: await client.downloadFile(url),
    fileName: attachmentFileName(resolved),
  }
}

export { resolveFileAttachment }
