/** Paleta del manual de identidad IFEDEL */
export const IFEDEL_COLORS = {
  primary: '#8DC640',   // Verde marca
  brown: '#835029',     // Marrón secundario
  black: '#000000',
} as const

export const IFEDelBrand = {
  companyName: 'IFEDEL',
  tagline: 'Soluciones Agropecuarias',
  colors: IFEDEL_COLORS,
  address: 'Avenida Centenario 1825',
  phone: '+54 9 11 51435129',
  email: 'info@ifedel.com.ar',
  website: 'ifedel.com.ar',
  /** Marca IFEDEL (verde sobre negro). Archivo en `public/brand/ifedel-mark.png`. */
  logo: {
    src: '/brand/ifedel-mark.png',
  },
}

