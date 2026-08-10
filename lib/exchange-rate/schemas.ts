import { z } from 'zod'

/** Body del PUT manual de tipo de cambio (solo tasa; source lo fuerza el servidor). */
export const UpdateUsdArsRateBodySchema = z.object({
  usdArsRate: z
    .number({
      required_error: 'usdArsRate es obligatorio',
      invalid_type_error: 'usdArsRate debe ser un número',
    })
    .finite({ message: 'usdArsRate debe ser un número finito' })
    .positive({ message: 'usdArsRate debe ser un número positivo' })
    .lt(1_000_000, { message: 'usdArsRate supera el límite técnico permitido' }),
})

export type UpdateUsdArsRateBody = z.infer<typeof UpdateUsdArsRateBodySchema>
