/** Customer support: one WhatsApp number, and how long payment checks should take. */
export const HELP_WHATSAPP = '26775362329'
export const HELP_WHATSAPP_DISPLAY = '+267 75 362 329'

/** Payments should be confirmed within this window; after it, customers are told to get in touch. */
export const CONFIRM_WITHIN_HOURS = 24

/** WhatsApp link with a ready-written message so staff can find the order straight away. */
export function helpLink(topic: string, details: Record<string, string | undefined> = {}) {
  const lines = [`Hi MBO, I need help: ${topic}.`]
  for (const [k, v] of Object.entries(details)) if (v) lines.push(`${k}: ${v}`)
  return `https://wa.me/${HELP_WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`
}
