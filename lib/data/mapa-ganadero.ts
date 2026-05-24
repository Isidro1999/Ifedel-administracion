export type Tier = 1 | 2 | 3 | 4

export interface ProvinciaData {
  tier: Tier
  stock: string
  estab: string
  pct: string
  accion: string
  productos: string[]
  ciudad: string
}

export const PROVINCIAS_DATA: Record<string, ProvinciaData> = {
  'Buenos Aires': {
    tier: 1,
    stock: '19,4M',
    estab: '~28.000',
    pct: '37%',
    accion: 'Arrancar esta semana — mayor volumen ganadero del país.',
    productos: [
      'Electrificadores Gallagher/Speedrite',
      'Balanzas y monitores TruTest',
      'Caravanas y trazabilidad SENASA',
      'Aisladores y accesorios San Miguel',
      'Alambres Acindar/Morlan',
    ],
    ciudad: 'La Plata / interior bonaerense',
  },
  'Santa Fe': {
    tier: 1,
    stock: '6,0M',
    estab: '~6.500',
    pct: '12%',
    accion:
      'Arrancar esta semana — alta densidad de veterinarias y agropecuarias.',
    productos: [
      'Jeringas Simcro',
      'Caravanas electrónicas SENASA',
      'Boyeros y accesorios',
      'Balanzas TruTest',
      'Peladoras Heiniger',
    ],
    ciudad: 'Rosario / Santa Fe / Rafaela',
  },
  'Córdoba': {
    tier: 2,
    stock: '4,3M',
    estab: '~7.000',
    pct: '9%',
    accion: 'Segunda prioridad — mercado muy activo y diversificado.',
    productos: [
      'Balanzas y monitores de pesaje',
      'Electrificadores Gallagher',
      'Caravanas SENASA',
      'Jeringas Simcro',
      'Gripple y accesorios',
    ],
    ciudad: 'Córdoba / Río Cuarto / Villa María',
  },
  'Entre Ríos': {
    tier: 2,
    stock: '4,3M',
    estab: '~4.800',
    pct: '9%',
    accion: 'Segunda prioridad — ganadería estable y activa.',
    productos: [
      'Electrificadores y boyeros',
      'Caravanas y lectores',
      'Aisladores San Miguel',
      'Alambres y torniquetes',
      'Balanzas TruTest',
    ],
    ciudad: 'Paraná / Concordia / Gualeguaychú',
  },
  Corrientes: {
    tier: 2,
    stock: '4,5M',
    estab: '~4.200',
    pct: '9%',
    accion:
      'Única provincia con crecimiento de stock en 2024 (+3,5%). Alta oportunidad.',
    productos: [
      'Electrificadores solares',
      'Caravanas y trazabilidad',
      'Balanzas de campo',
      'Boyeros Speedrite',
      'Aisladores y alambres',
    ],
    ciudad: 'Corrientes / Mercedes / Paso de los Libres',
  },
  'La Pampa': {
    tier: 2,
    stock: '3,2M',
    estab: '~3.100',
    pct: '6%',
    accion: 'Segunda prioridad — campos grandes, tickets altos.',
    productos: [
      'Electrificadores de alta potencia',
      'Boyeros solares',
      'Alambres alta resistencia',
      'Balanzas de campo',
      'Postes e infraestructura',
    ],
    ciudad: 'Santa Rosa / General Pico',
  },
  'Santiago del Estero': {
    tier: 3,
    stock: '2,1M',
    estab: '~3.200',
    pct: '4%',
    accion: 'Segunda ola — ganadería de cría extensa.',
    productos: [
      'Boyeros básicos y solares',
      'Caravanas visuales',
      'Aisladores y varillas',
      'Alambres',
      'Accesorios de campo',
    ],
    ciudad: 'Santiago del Estero / Termas de Río Hondo',
  },
  Chaco: {
    tier: 3,
    stock: '1,9M',
    estab: '~2.800',
    pct: '4%',
    accion: 'Segunda ola — ganadería de cría en expansión.',
    productos: [
      'Boyeros solares',
      'Caravanas trazabilidad',
      'Aisladores San Miguel',
      'Alambres',
      'Electrificadores batería',
    ],
    ciudad: 'Resistencia / Presidencia Roque Sáenz Peña',
  },
  Salta: {
    tier: 3,
    stock: '1,4M',
    estab: '~2.100',
    pct: '3%',
    accion: 'Segunda ola — ganadería en altura y Chaco salteño.',
    productos: ['Boyeros solares', 'Trazabilidad', 'Caravanas', 'Aisladores', 'Alambres'],
    ciudad: 'Salta / Orán / Tartagal',
  },
  Formosa: {
    tier: 3,
    stock: '1,1M',
    estab: '~1.400',
    pct: '2%',
    accion:
      'Segunda ola — condiciones de campo exigentes, soluciones solares clave.',
    productos: [
      'Boyeros solares resistentes',
      'Caravanas SENASA',
      'Aisladores',
      'Alambres básicos',
    ],
    ciudad: 'Formosa capital',
  },
  Misiones: {
    tier: 3,
    stock: '0,8M',
    estab: '~1.600',
    pct: '2%',
    accion: 'Segunda ola — ganadería menor pero activa.',
    productos: [
      'Boyeros compactos',
      'Caravanas',
      'Aisladores',
      'Varillas plásticas',
      'Accesorios básicos',
    ],
    ciudad: 'Posadas / Oberá',
  },
  'San Luis': {
    tier: 3,
    stock: '0,9M',
    estab: '~1.200',
    pct: '2%',
    accion: 'Segunda ola — zona de cría en crecimiento.',
    productos: ['Electrificadores', 'Boyeros', 'Aisladores San Miguel', 'Alambres'],
    ciudad: 'San Luis / Villa Mercedes',
  },
  Tucumán: {
    tier: 4,
    stock: '0,5M',
    estab: '~900',
    pct: '1%',
    accion: 'Más adelante — ganadería secundaria en la provincia.',
    productos: ['Boyeros básicos', 'Caravanas', 'Aisladores'],
    ciudad: 'Tucumán capital',
  },
  Jujuy: {
    tier: 4,
    stock: '0,3M',
    estab: '~500',
    pct: '0,6%',
    accion: 'Más adelante — ganadería de altura, mercado chico.',
    productos: ['Boyeros solares', 'Caravanas', 'Aisladores'],
    ciudad: 'San Salvador de Jujuy',
  },
  Catamarca: {
    tier: 4,
    stock: '0,2M',
    estab: '~300',
    pct: '0,4%',
    accion: 'Más adelante — mercado pequeño.',
    productos: ['Boyeros', 'Caravanas', 'Accesorios básicos'],
    ciudad: 'San Fernando del Valle',
  },
  'La Rioja': {
    tier: 4,
    stock: '0,3M',
    estab: '~350',
    pct: '0,5%',
    accion: 'Más adelante — ganadería caprina mayor que bovina.',
    productos: ['Boyeros', 'Caravanas', 'Aisladores'],
    ciudad: 'La Rioja capital',
  },
  'San Juan': {
    tier: 4,
    stock: '0,2M',
    estab: '~300',
    pct: '0,4%',
    accion: 'Más adelante — provincia agrícola, ganadería menor.',
    productos: ['Boyeros básicos', 'Accesorios de campo'],
    ciudad: 'San Juan capital',
  },
  Mendoza: {
    tier: 4,
    stock: '0,3M',
    estab: '~500',
    pct: '0,6%',
    accion: 'Más adelante — mercado más agrícola y vitivinícola.',
    productos: ['Boyeros', 'Caravanas', 'Jeringas Simcro'],
    ciudad: 'Mendoza / San Rafael',
  },
  Neuquén: {
    tier: 4,
    stock: '0,3M',
    estab: '~400',
    pct: '0,6%',
    accion: 'Más adelante — ganadería ovina mayor que bovina.',
    productos: ['Boyeros', 'Esquiladoras Heiniger', 'Aisladores'],
    ciudad: 'Neuquén capital',
  },
  'Río Negro': {
    tier: 4,
    stock: '0,4M',
    estab: '~600',
    pct: '0,8%',
    accion: 'Más adelante — Patagonia Norte, logística compleja.',
    productos: ['Boyeros', 'Esquiladoras Heiniger', 'Caravanas'],
    ciudad: 'Viedma / Bariloche / Cipolletti',
  },
  Chubut: {
    tier: 4,
    stock: '0,5M',
    estab: '~700',
    pct: '1%',
    accion: 'Más adelante — ganadería ovina fuerte, bovina menor.',
    productos: ['Esquiladoras Heiniger', 'Boyeros', 'Caravanas ovinos'],
    ciudad: 'Rawson / Comodoro Rivadavia / Trelew',
  },
  'Santa Cruz': {
    tier: 4,
    stock: '0,2M',
    estab: '~200',
    pct: '0,4%',
    accion: 'Más adelante — campos muy grandes, logística de alto costo.',
    productos: ['Boyeros solares', 'Esquiladoras', 'Caravanas'],
    ciudad: 'Río Gallegos',
  },
  'Tierra del Fuego': {
    tier: 4,
    stock: '0,05M',
    estab: '~50',
    pct: '0,1%',
    accion: 'Más adelante — mercado muy pequeño.',
    productos: ['Boyeros', 'Esquiladoras Heiniger'],
    ciudad: 'Ushuaia / Río Grande',
  },
}

export const TIER_CONFIG: Record<
  Tier,
  { label: string; color: string; bg: string; text: string; desc: string }
> = {
  1: {
    label: 'Tier 1 — arrancar ya',
    color: '#378ADD',
    bg: '#DDEEFF',
    text: '#0C447C',
    desc: 'Máximo stock ganadero',
  },
  2: {
    label: 'Tier 2 — segunda prioridad',
    color: '#5A9E2F',
    bg: '#D8EDCA',
    text: '#27500A',
    desc: 'Alto stock ganadero',
  },
  3: {
    label: 'Tier 3 — segunda ola',
    color: '#E8973A',
    bg: '#FDECC8',
    text: '#633806',
    desc: 'Stock ganadero medio',
  },
  4: {
    label: 'Tier 4 — más adelante',
    color: '#9E9E94',
    bg: '#EAEAE6',
    text: '#444441',
    desc: 'Stock ganadero bajo',
  },
}

export const RANKING_TOP7 = [
  { nombre: 'Buenos Aires', stock: '19,4M', tier: 1 as Tier, pct: 100 },
  { nombre: 'Santa Fe', stock: '6,0M', tier: 1 as Tier, pct: 31 },
  { nombre: 'Corrientes', stock: '4,5M', tier: 2 as Tier, pct: 23 },
  { nombre: 'Córdoba', stock: '4,3M', tier: 2 as Tier, pct: 22 },
  { nombre: 'Entre Ríos', stock: '4,3M', tier: 2 as Tier, pct: 22 },
  { nombre: 'La Pampa', stock: '3,2M', tier: 2 as Tier, pct: 16 },
  { nombre: 'Santiago del Estero', stock: '2,1M', tier: 3 as Tier, pct: 11 },
]

export function getProvinciaTier(nombre: string): Tier {
  return PROVINCIAS_DATA[nombre]?.tier ?? 4
}
