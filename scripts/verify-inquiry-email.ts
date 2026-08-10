/**
 * Verificación rápida de builders de email (sin Brevo ni DB).
 * Uso: npx tsx scripts/verify-inquiry-email.ts
 */
import {
  buildInquiryBackofficeUrl,
  buildInquiryNotificationHtml,
  buildInquiryNotificationSubject,
  buildInquiryNotificationText,
  escapeHtml,
  isValidEmail,
  parseNotificationRecipients,
  plainTextToSafeHtml,
  resolveInquiryEmailConfig,
  type InquiryEmailPayload,
} from '../lib/catalog-inquiry-email'

const sample: InquiryEmailPayload = {
  id: 42,
  referenceNumber: 'IFD-000042',
  createdAt: new Date('2026-08-10T15:30:00.000Z'),
  customerName: 'Juan <script>Pérez</script>',
  companyName: 'Campo & Co',
  phone: '1155551234',
  email: 'juan@example.com',
  location: 'Pergamino',
  message: 'Necesito stock\ny urgencia.',
  source: 'CATALOG_WEB',
  items: [
    { title: 'Balanza "TWR5"', sku: 'G-02606', quantity: 2 },
    { title: 'Caravana <FDX>', sku: '242308', quantity: 1 },
  ],
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

assert(escapeHtml('<b>x</b>') === '&lt;b&gt;x&lt;/b&gt;', 'escapeHtml')
assert(
  plainTextToSafeHtml('a\nb').includes('<br />'),
  'plainTextToSafeHtml breaks',
)
assert(
  parseNotificationRecipients(
    ' a@b.com , invalid, a@b.com, c@d.com ',
  ).join(',') === 'a@b.com,c@d.com',
  'parse recipients',
)
assert(isValidEmail('ok@ifedel.com'), 'valid email')
assert(!isValidEmail('nope'), 'invalid email')

const disabled = resolveInquiryEmailConfig({
  BREVO_API_KEY: '',
  INQUIRY_NOTIFICATION_RECIPIENTS: 'a@b.com',
})
assert(disabled.ok === false && disabled.reason === 'disabled', 'disabled')

const badRecipients = resolveInquiryEmailConfig({
  BREVO_API_KEY: 'x',
  INQUIRY_NOTIFICATION_FROM: 'info@ifedel.com',
  INQUIRY_NOTIFICATION_RECIPIENTS: 'not-an-email',
})
assert(
  badRecipients.ok === false && badRecipients.reason === 'configuration_error',
  'bad recipients',
)

const okCfg = resolveInquiryEmailConfig({
  BREVO_API_KEY: 'x',
  INQUIRY_NOTIFICATION_FROM: 'info@ifedel.com',
  INQUIRY_NOTIFICATION_FROM_NAME: 'IFEDEL',
  INQUIRY_NOTIFICATION_RECIPIENTS:
    'isidroballestrin@gmail.com, jeroanchelerguez@gmail.com',
  NEXT_PUBLIC_BACKOFFICE_URL: 'https://app.ifedel.com/',
})
assert(okCfg.ok === true, 'ok config')
if (okCfg.ok) {
  assert(okCfg.config.recipients.length === 2, '2 recipients')
  assert(
    okCfg.config.backofficeBaseUrl === 'https://app.ifedel.com',
    'trim slash',
  )
}

const subject = buildInquiryNotificationSubject(sample)
assert(subject.includes('IFD-000042'), 'subject ref')
assert(subject.includes('Juan'), 'subject name')

const url = buildInquiryBackofficeUrl('https://app.ifedel.com', 42)
assert(
  url === 'https://app.ifedel.com/admin/catalog/inquiries/42',
  'backoffice url',
)

const html = buildInquiryNotificationHtml(sample, url)
assert(!html.includes('<script>'), 'html escaped script')
assert(html.includes('&lt;script&gt;'), 'escaped name in html')
assert(html.includes('Ver consulta en el backoffice'), 'cta')
assert(html.includes(url), 'url in html')

const text = buildInquiryNotificationText(sample, url)
assert(!text.includes('<br'), 'text has no html')
assert(text.includes('IFD-000042'), 'text ref')
assert(text.includes(url), 'text url')

const noEmail = { ...sample, email: null }
const htmlNoReplyBits = buildInquiryNotificationHtml(noEmail, url)
assert(htmlNoReplyBits.includes('Llamar'), 'tel link still present')

console.log('verify-inquiry-email: OK')
