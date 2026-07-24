import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { QuoteItem, QuoteClient, QuoteMeta } from '@/lib/quote-store'
import { IFEDelBrand } from '@/lib/ifedel-brand'
import { getOptimizedImageUrl } from '@/lib/cloudinary-url'
import { fmtMoneyUSD, fmtMoneyARS, fmtNumberAR } from '@/lib/format-money'

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.35,
    backgroundColor: '#ffffff',
  },
  headerWrap: {
    marginLeft: -20,
    marginRight: -20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    width: 190,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 260,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  brandBlock: {
    flex: 1,
    flexDirection: 'column',
    paddingLeft: 0,
  },
  logo: {
    width: 52,
    height: 52,
    objectFit: 'contain',
  },
  logoBox: {
    width: 150,
    height: 55,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  titleCentered: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 16,
  },
  clientBlock: {
    marginTop: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },
  clientGrid: {
    flexDirection: 'column',
  },
  clientRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  clientCell: {
    flex: 1,
    paddingRight: 10,
  },
  clientLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 2,
  },
  clientValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  metaBar: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 8,
    color: '#6B7280',
    marginRight: 4,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: 'bold',
    marginRight: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  cardImage: {
    width: 96,
    height: 96,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageText: {
    fontSize: 8,
    color: '#9CA3AF',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cardSku: {
    fontSize: 9,
    color: '#555555',
    marginBottom: 4,
  },
  cardLine: {
    fontSize: 9,
    marginBottom: 2,
  },
  metricRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  metric: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginRight: 6,
  },
  metricLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  summaryBlock: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  summaryLine: {
    fontSize: 10,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#4B5563',
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  totalArsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalArsValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#777777',
  },
})

export interface QuotePdfDocumentProps {
  items: QuoteItem[]
  client: QuoteClient
  meta: QuoteMeta
  dateLabel: string
  subtotalUSD: number
  totalUSD: number
  totalARS: number
}

export const QuotePdfDocument: React.FC<QuotePdfDocumentProps> = ({
  items,
  client,
  meta,
  dateLabel,
  subtotalUSD,
  totalUSD,
  totalARS,
}) => {
  const exchangeRate = meta.exchangeRateARS || 1000
  const discountPct = meta.discountPct ?? 0
  const hasDiscount = discountPct > 0
  const discountAmountUSD = hasDiscount ? totalUSD * (discountPct / 100) : 0
  const totalUSDWithDiscount = hasDiscount ? totalUSD - discountAmountUSD : totalUSD
  const totalARSFinal = totalUSDWithDiscount * exchangeRate
  const formattedDiscountPct = Number.isInteger(discountPct)
    ? `${discountPct}%`
    : `${discountPct.toFixed(1)}%`

  /** PDF se arma en el cliente: la imagen debe ser URL absoluta (mismo origen que /public). */
  const pdfLogoSrc =
    typeof window !== 'undefined'
      ? `${window.location.origin}${IFEDelBrand.logo.src}`
      : IFEDelBrand.logo.src.startsWith('http')
        ? IFEDelBrand.logo.src
        : ''

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerWrap}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {pdfLogoSrc ? (
                <Image src={pdfLogoSrc} style={styles.logo} />
              ) : (
                <View style={styles.logoBox}>
                  <Text style={styles.logoText}>IF</Text>
                </View>
              )}
            </View>

            <View style={styles.headerCenter}>
              <Text style={styles.titleCentered}>Cotización</Text>
            </View>

            <View style={styles.headerRight}>
              <View style={styles.metaBar}>
                <View style={styles.metaGroup}>
                  <Text style={styles.metaLabel}>Fecha:</Text>
                  <Text style={styles.metaValue}>{dateLabel}</Text>

                  <Text style={styles.metaLabel}>Validez:</Text>
                  <Text style={styles.metaValue}>
                    {meta.validityDays || 7} días
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 4, marginBottom: 8 }}>
          <Text style={styles.subtitle}>{IFEDelBrand.address}</Text>
          <Text style={styles.subtitle}>
            {IFEDelBrand.phone} • {IFEDelBrand.email}
          </Text>
          <Text style={styles.subtitle}>{IFEDelBrand.website}</Text>
        </View>

        {/* Cliente */}
        <Text style={styles.sectionTitle}>Datos del cliente</Text>
        <View style={styles.clientBlock}>
          <View style={styles.clientGrid}>
            <View style={styles.clientRow}>
              <View style={styles.clientCell}>
                <Text style={styles.clientLabel}>Cliente</Text>
                <Text style={styles.clientValue}>
                  {client.name || client.company || '-'}
                </Text>
              </View>
              <View style={[styles.clientCell, { paddingRight: 0 }]}>
                <Text style={styles.clientLabel}>Empresa</Text>
                <Text style={styles.clientValue}>
                  {client.company || '-'}
                </Text>
              </View>
            </View>
            <View style={[styles.clientRow, { marginTop: 6, marginBottom: 0 }]}>
              <View style={styles.clientCell}>
                <Text style={styles.clientLabel}>Email</Text>
                <Text style={styles.clientValue}>
                  {client.email || '-'}
                </Text>
              </View>
              <View style={[styles.clientCell, { paddingRight: 0 }]}>
                <Text style={styles.clientLabel}>Teléfono</Text>
                <Text style={styles.clientValue}>
                  {client.phone || '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Items */}
        <Text style={styles.sectionTitle}>Detalle de la cotización</Text>
        {items.length === 0 ? (
          <Text style={styles.cardLine}>No hay productos en la cotización.</Text>
        ) : (
          items.map((item) => {
            const itemSubtotal = item.unitPriceUSD * item.qty
            return (
              <View key={item.productId} style={styles.card}>
                {item.imageUrl ? (
                  <Image
                    style={styles.cardImage}
                    src={getOptimizedImageUrl(item.imageUrl, 800)}
                  />
                ) : (
                  <View style={styles.cardImage}>
                    <Text style={styles.cardImageText}>Sin imagen</Text>
                  </View>
                )}
                <View style={styles.cardContent}>
                  <View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSku}>
                      SKU: {item.sku} · IVA {item.taxRate}%
                    </Text>
                  </View>
                  <View style={styles.metricRow}>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Cantidad</Text>
                      <Text style={styles.metricValue}>{item.qty}</Text>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Unitario USD</Text>
                      <Text style={styles.metricValue}>
                        {fmtMoneyUSD(item.unitPriceUSD)}
                      </Text>
                    </View>
                    <View style={[styles.metric, { marginRight: 0 }]}>
                      <Text style={styles.metricLabel}>Total ítem USD</Text>
                      <Text style={styles.metricValue}>
                        {fmtMoneyUSD(itemSubtotal)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )
          })
        )}

        {/* Resumen */}
        <View style={styles.summaryBlock}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal USD (sin IVA)</Text>
            <Text style={styles.summaryValue}>
              {fmtMoneyUSD(subtotalUSD)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total USD (con IVA)</Text>
            <Text style={styles.summaryValue}>
              {fmtMoneyUSD(totalUSD)}
            </Text>
          </View>
          {hasDiscount && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Descuento ({formattedDiscountPct})
                </Text>
                <Text style={[styles.summaryValue, { color: '#DC2626' }]}>
                  -{fmtMoneyUSD(discountAmountUSD)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total USD final</Text>
                <Text style={styles.summaryValue}>
                  {fmtMoneyUSD(totalUSDWithDiscount)}
                </Text>
              </View>
            </>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tipo de cambio (ARS por USD)</Text>
            <Text style={styles.summaryValue}>{fmtNumberAR(exchangeRate)}</Text>
          </View>
          <View style={styles.totalArsRow}>
            <Text style={styles.summaryLabel}>Total ARS (con IVA)</Text>
            <Text style={styles.totalArsValue}>
              {fmtMoneyARS(totalARSFinal)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{IFEDelBrand.companyName}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}

