'use client'

import React from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { QuotePdfDocument, QuotePdfDocumentProps } from './QuotePdfDocument'

export interface DownloadQuotePdfButtonProps extends QuotePdfDocumentProps {}

export const DownloadQuotePdfButton: React.FC<DownloadQuotePdfButtonProps> = (
  props
) => {
  const clientName =
    props.client.company ||
    props.client.name ||
    'Cliente'

  const safeClient = clientName
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-]/g, '')

  const fileName = `Cotizacion_IFEDEL_${props.dateLabel}_${safeClient}.pdf`

  return (
    <PDFDownloadLink
      document={<QuotePdfDocument {...props} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <button
          type="button"
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Generando PDF...' : 'Generar PDF'}
        </button>
      )}
    </PDFDownloadLink>
  )
}

