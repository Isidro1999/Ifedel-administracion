# Diseño: Módulo de Cuentas por Cobrar (v1)

Documento de diseño e integración propuesta. **No incluye migraciones ni UI**; solo modelo y flujo de negocio para cerrar el criterio contable/funcional antes de implementar.

---

## 1. Recomendación general de modelado

- **Una cuenta por cobrar por venta (1:1 con Sale)** en esta primera versión. Cada venta confirmada puede tener como máximo una cuenta por cobrar; la cuenta por cobrar referencia a una única venta.
- **Montos y saldo en la moneda de la venta**: la cuenta por cobrar replica `currency` y `totalAmount` alineados con la venta; el saldo pendiente (`balance`) y lo cobrado (`amountPaid`) se mantienen en la misma moneda. Conversión a otra moneda (ej. caja en ARS) se deja para la capa de caja.
- **Saldo y monto cobrado desnormalizados en la entidad**: se guardan `amountPaid` y `balance` en la cuenta por cobrar para listados e informes rápidos; la fuente de verdad serán los futuros registros de cobro. Al registrar un cobro se actualizará la cuenta por cobrar en la misma transacción (actualizar `amountPaid`, `balance` y `status`).
- **Cliente**: reutilizar la relación con `Customer` vía `customerId` (la venta ya tiene `customerId` y snapshot). Opcionalmente se puede añadir snapshot en la cuenta por cobrar para reportes históricos sin depender de la venta; en v1 basta con `customerId` y consultas vía `sale.customer` o join.
- **Estados explícitos y “vencido” derivado**: estados almacenados: `PENDING`, `PARTIAL`, `PAID`, `CANCELLED`. “Vencido” (overdue) no se persiste como estado; se calcula en consultas cuando `dueDate < hoy` y `status` es `PENDING` o `PARTIAL`. Así se evita un job que actualice estados y se mantiene una única fuente de verdad para el estado de pago.

---

## 2. Nombre de la entidad recomendado

**`Receivable`** (singular).

- Una fila = una cuenta por cobrar (un derecho de cobro asociado a una venta).
- El módulo se llama “cuentas por cobrar” (plural); la entidad en singular es consistente con `Sale`, `Quote`, `Customer`.
- Evita nombres largos como `AccountsReceivable` o `AccountReceivable` en el código.
- En reportes y UI se puede seguir usando “Cuenta por cobrar” o “Cuentas por cobrar” según el contexto.

---

## 3. Schema Prisma propuesto

A continuación el modelo y la relación futura con cobros. **No aplicar todavía**; es la propuesta para revisión.

```prisma
/// Cuenta por cobrar asociada a una venta (1:1).
/// Base para cobros parciales o totales y proyección de ingresos.
/// OVERDUE no se persiste: se calcula cuando dueDate < hoy y status in (PENDING, PARTIAL).
model Receivable {
  id     Int @id @default(autoincrement())
  saleId Int @unique
  sale   Sale @relation(fields: [saleId], references: [id], onDelete: Restrict)

  /// Cliente: FK + snapshot mínimo (legibilidad histórica y reporting).
  customerId      Int?
  customer        Customer? @relation(fields: [customerId], references: [id])
  customerName    String?
  customerCompany String?

  /// Total a cobrar (debe coincidir con sale.totalWithDiscount en creación).
  totalAmount Float
  currency    String   @default("USD")

  /// Cobrado hasta la fecha. Suma de los futuros ReceivablePayment.amount.
  amountPaid Float @default(0)
  /// Saldo pendiente: totalAmount - amountPaid. Se mantiene en sync al registrar cobros.
  balance    Float

  dueDate  DateTime
  issuedAt DateTime @default(now())

  /// PENDING: sin cobros | PARTIAL: cobro parcial | PAID: totalmente cobrado | CANCELLED: anulada
  status String @default("PENDING")

  notes String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  /// Futuro: cobros aplicados a esta cuenta.
  payments ReceivablePayment[]

  @@map("receivables")
  @@index([customerId])
  @@index([status])
  @@index([dueDate])
}

/// Cobro aplicado a una cuenta por cobrar (fase posterior).
/// No implementar en la primera migración.
model ReceivablePayment {
  id           Int @id @default(autoincrement())
  receivableId Int
  receivable   Receivable @relation(fields: [receivableId], references: [id], onDelete: Restrict)

  amount   Float    /// Monto cobrado en la moneda de la receivable
  paidAt   DateTime @default(now())
  reference String? /// Referencia externa (transferencia, cheque, etc.)

  createdAt DateTime @default(now())

  @@map("receivable_payments")
  @@index([receivableId])
}
```

**Cambios en modelos existentes:**

- **Sale**: añadir relación 1:1 opcional con la cuenta por cobrar.
- **Customer**: añadir relación con receivables (para aging por cliente).

```prisma
// En model Sale, agregar:
  receivable Receivable?

// En model Customer, agregar:
  receivables Receivable[]
```

---

## 4. Relación con Sale y con futuros cobros

| Entidad           | Relación con Receivable |
|-------------------|--------------------------|
| **Sale**          | 1:1. `Sale.receivable?` (opcional); `Receivable.sale` obligatorio. Una venta puede tener o no una cuenta por cobrar; una cuenta por cobrar siempre pertenece a una venta. |
| **ReceivablePayment** (futuro) | N:1. Muchos cobros pueden aplicarse a una misma `Receivable`. Al crear un `ReceivablePayment` se actualiza en la misma transacción: `Receivable.amountPaid += amount`, `Receivable.balance -= amount`, y `Receivable.status` según reglas (PARTIAL / PAID). |

No se modela aún la “caja” (movimiento de efectivo/banco); los cobros se aplican solo a la cuenta por cobrar. La vinculación cobro → caja se hará en una etapa posterior.

---

## 5. Estados recomendados

| Estado     | Significado |
|-----------|-------------|
| **PENDING** | Creada, sin cobros. `amountPaid == 0`, `balance == totalAmount`. |
| **PARTIAL** | Cobro parcial. `0 < amountPaid < totalAmount`, `balance > 0`. |
| **PAID**    | Totalmente cobrada. `amountPaid >= totalAmount`, `balance <= 0`. |
| **CANCELLED** | Anulada (ej. venta anulada, nota de crédito). No se esperan más cobros. |

**Overdue (vencido)**  
No es un estado almacenado. En consultas e informes: “vencido” cuando `dueDate < fecha_hoy` y `status IN ('PENDING', 'PARTIAL')`. Permite reportes de aging sin jobs ni actualizaciones masivas de estado.

---

## 6. Flujo de negocio recomendado

### Cuándo se crea la cuenta por cobrar

- **Opción recomendada:** Crear la cuenta por cobrar **automáticamente** cuando se confirma la venta (por ejemplo al convertir Quote → Sale). Así toda venta confirmada tiene su cuenta por cobrar y el listado de “pendientes de cobro” está completo sin pasos manuales.
- **Alternativa:** Crear la cuenta por cobrar con una acción explícita desde el detalle de la venta (“Crear cuenta por cobrar”). Da más control pero exige recordar el paso; en v1 la recomendación es automático.

### Si al crear una Sale debe crearse automáticamente la cuenta por cobrar

- **Sí.** En el mismo flujo donde se crea la `Sale` (p. ej. al convertir una cotización en venta), dentro de la misma transacción o justo después, crear el `Receivable` con:
  - `saleId` = id de la venta creada
  - `customerId` = `sale.customerId`
  - `totalAmount` = `sale.totalWithDiscount`
  - `currency` = `sale.currency`
  - `amountPaid` = 0, `balance` = `totalAmount`
  - `dueDate` = regla de negocio (ej. `sale.issuedAt` + 30 días; luego se puede hacer configurable)
  - `issuedAt` = `now()`
  - `status` = `PENDING`

Con esto, listados y proyección de ingresos pueden apoyarse en `Receivable` sin pasos extra.

### Flujo resumido

1. Usuario convierte Quote → Sale (acción existente).
2. Se crea la Sale (CONFIRMED) y, en la misma transacción o inmediatamente después, se crea el Receivable (PENDING) asociado.
3. Más adelante: desde la vista de la venta o de la cuenta por cobrar, el usuario registra cobros (futuro `ReceivablePayment`). Cada cobro actualiza `amountPaid`, `balance` y `status` del `Receivable`.
4. Reportes: “Cuentas por cobrar pendientes”, “Vencidas”, “Por cliente”, etc., se resuelven consultando `Receivable` (y opcionalmente `dueDate` para vencidas).

---

## 7. Riesgos o trade-offs

- **Saldo desnormalizado:** Si hubiera un bug al aplicar cobros, `balance`/`amountPaid` podrían desincronizarse con la suma de `ReceivablePayment`. Mitigación: actualizar siempre en transacción; opcionalmente un job o función que recalcule `amountPaid` desde pagos y detecte diferencias.
- **1:1 estricto Sale–Receivable:** Si más adelante se necesitan varias cuentas por cobrar por venta (ej. distintos plazos por factura), el modelo habría que ampliar (ej. quitar `saleId` unique y permitir varias receivables por sale). Para v1, 1:1 es más simple y cubre el caso principal.
- **DueDate fijo al crear:** Si el negocio requiere cambiar la fecha de vencimiento después, habría que permitir edición de `Receivable.dueDate` (solo si no hay cobros o según regla de negocio).
- **Cancelación:** Si se anula una venta (`Sale.status = CANCELLED`), conviene actualizar la cuenta por cobrar a `Receivable.status = CANCELLED` para no contarla en pendientes. Si se cancela la cuenta por cobrar sin anular la venta, definir regla (ej. solo si amountPaid == 0).

---

## 8. Orden recomendado de implementación

1. **Migración y modelo**  
   - Añadir `Receivable` (y en `Sale`/`Customer` las relaciones).  
   - No añadir todavía `ReceivablePayment` si se quiere una primera migración mínima.

2. **Creación automática al confirmar venta**  
   - En el flujo que crea la Sale (p. ej. server action “convertir en venta”), crear el `Receivable` en la misma transacción con la regla de `dueDate` (ej. +30 días).

3. **Datos existentes**  
   - Si ya hay ventas sin cuenta por cobrar, script o comando único que cree `Receivable` para cada Sale CONFIRMED que aún no tenga uno.

4. **UI mínima**  
   - Listado de cuentas por cobrar (filtros por estado, vencidas, cliente).  
   - Detalle de Receivable (y enlace a Sale).  
   - Sin registro de cobros todavía.

5. **Modelo y lógica de cobros**  
   - Añadir `ReceivablePayment`, endpoint o server action para “Registrar cobro”, actualizando `Receivable.amountPaid`, `balance` y `status`.

6. **Caja**  
   - Más adelante: modelo de movimientos de caja y vínculo cobro → movimiento de caja.

---

*Documento solo de diseño. No incluye migraciones ni cambios en la UI actual.*
