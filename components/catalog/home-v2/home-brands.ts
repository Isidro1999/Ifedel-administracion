export type HomeBrand = {
  name: string
  logo: string
  href?: string
  /** Ajuste fino de tamaño relativo dentro de la card. Default: md */
  scale?: 'sm' | 'md' | 'lg'
}

/**
 * Marcas con logo local para la franja de la home V2.
 * Solo assets en `/public/brand/partners/`. Sin Prisma ni claims comerciales.
 */
export const HOME_BRANDS: HomeBrand[] = [
  {
    name: 'Gallagher',
    logo: '/brand/partners/gallagher.png',
    scale: 'lg',
  },
  {
    name: 'Allflex',
    logo: '/brand/partners/allflex.png',
    scale: 'lg',
  },
  {
    name: 'Gripple',
    logo: '/brand/partners/griplle.png',
    scale: 'lg',
  },
  {
    name: 'Heiniger',
    logo: '/brand/partners/HEINIGER.png',
    scale: 'lg',
  },
  {
    name: 'Datamars Livestock',
    logo: '/brand/partners/datamars-livestock.png',
    scale: 'lg',
  },
  {
    name: 'Tec-Metal',
    logo: '/brand/partners/tecmetal.png',
    scale: 'lg',
  },
  {
    name: 'Speedrite',
    logo: '/brand/partners/speedrite.png',
    scale: 'lg',
  },
  {
    name: 'San Miguel',
    logo: '/brand/partners/sanmiguel.png',
    scale: 'lg',
  },
  {
    name: 'Simcro',
    logo: '/brand/partners/simcro-datamars.png',
    scale: 'lg',
  },
  {
    name: 'TMC',
    logo: '/brand/partners/TMC-agro.png',
    scale: 'lg',
  },
]
