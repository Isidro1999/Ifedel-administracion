/**
 * Notificaciones por email de consultas comerciales — etapa futura.
 *
 * Configuración prevista (ver `.env.example`):
 * - BREVO_API_KEY
 * - INQUIRY_NOTIFICATION_FROM  → ej. "IFEDEL <info@ifedel.com>"
 * - INQUIRY_NOTIFICATION_RECIPIENTS → lista separada por comas
 *
 * Reply-To: email del cliente cuando exista.
 *
 * Esta función es un stub: no envía correos en esta etapa.
 * El POST de inquiries la invoca en fire-and-forget sin bloquear la respuesta.
 */

export type NewInquiryNotificationInput = {
  referenceNumber: string
  customerName: string
  companyName?: string | null
  phone: string
  email?: string | null
  location?: string | null
  message?: string | null
  itemCount: number
}

/**
 * Placeholder para `sendNewInquiryNotification`.
 * Cuando se active Brevo (u otro), implementar aquí sin tocar la ruta HTTP.
 */
export async function sendNewInquiryNotification(
  _input: NewInquiryNotificationInput,
): Promise<void> {
  // Etapa 1: no-op intencional.
  // Etapa 2: leer INQUIRY_NOTIFICATION_* / BREVO_API_KEY y enviar.
  return
}
