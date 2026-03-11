# Diseño: Módulo de Cobros (Receivable Payments)

Documento de diseño funcional y contable para registrar cobros sobre cuentas por cobrar. **No incluye migraciones ni UI**; solo modelo, reglas de negocio y flujo recomendado.

---

## 1. Recomendación general de modelado

- **Un registro por cobro**: cada evento de cobro (un pago recibido aplicado a una cuenta por cobrar) se guarda como una fila independiente. Así se mantiene trazabilidad, auditoría y posibilidad de conciliar con medios de pago (transferencia, cheque, etc.).
- **Relación N:1 con Receivable**: una Receivable tiene muchos cobros; cada cobro pertenece a una sola Receivable. La suma de los montos de los cobros debe coincidir con `Receivable.amountPaid` (se mantiene en sync en la misma transacción al registrar cada cobro).
- **Receivable sigue siendo la fuente de saldo**: `amountPaid` y `balance` se actualizan en la Receivable en cada cobro; los registros de cobro son la desagregación (detalle) de ese total.
- **Moneda**: las Receivables están en ARS; los cobros se registran en la misma moneda (ARS). No se modela conversión en esta etapa.
- **Sin caja todavía**: el cobro solo “aplica” a la cuenta por cobrar. La vinculación cobro → movimiento de caja (ingreso en banco/efectivo) se deja para una fase posterior.

---

## 2. Nombre recomendado de la entidad

**`ReceivablePayment`**

- Un registro = un pago (cobro) aplicado a una cuenta por cobrar.
- Nombre explícito: deja claro que es un pago *sobre* una Receivable, no un pago genérico.
- Consistente con el dominio: Receivable ya existe; ReceivablePayment es su complemento natural.
- Evita nombres genéricos como `Payment` o `Collection` que podrían confundirse con otros conceptos (pagos a proveedores, cobranza como proceso, etc.).

---

## 3. Schema Prisma propuesto

Añadir el modelo y la relación en Receivable. **No aplicar migraciones todavía**; es la propuesta para revisión.

```prisma
/// Cobro aplicado a una cuenta por cobrar. Un registro por cada pago recibido.
model ReceivablePayment {
  id           Int   @id @default(autoincrement())
  receivableId Int
  receivable   Receivable @relation(fields: [receivableId], references: [id], onDelete: Restrict)

  /// Monto cobrado, en la moneda de la Receivable (ARS).
  amount   Float   @default(0)

  /// Fecha en que se recibió el cobro.
  paidAt   DateTime @default(now())

  /// Referencia opcional: número de cheque, transferencia, recibo, etc.
  reference String?

  notes String?

  createdAt DateTime @default(now())

  @@map("receivable_payments")
  @@index([receivableId])
  @@index([paidAt])
}
```

**Cambio en el modelo Receivable existente** (añadir la relación inversa):

```prisma
// Dentro de model Receivable, agregar:
  payments ReceivablePayment[]
```

---

## 4. Relación con Receivable

| Entidad            | Relación |
|--------------------|----------|
| **Receivable**     | 1:N. Una Receivable tiene muchos `ReceivablePayment`. |
| **ReceivablePayment** | N:1. Cada cobro pertenece a una sola `Receivable`. |

Invariante contable:  
`Receivable.amountPaid` = suma de `ReceivablePayment.amount` para esa `receivableId`.  
Se mantiene actualizando `Receivable` en la misma transacción en que se crea cada `ReceivablePayment`.

---

## 5. Reglas de negocio recomendadas

### 5.1 Validaciones al registrar un cobro

1. **Receivable existe** y está cargada correctamente.
2. **Receivable.status ≠ CANCELLED**. No se permiten cobros sobre cuentas anuladas.
3. **amount > 0**. No admitir cobros nulos ni negativos.
4. **amount ≤ Receivable.balance**. No permitir que el cobro supere el saldo pendiente (recomendación explícita: **bloquear** el cobro si excede el balance; ver sección 5.2).
5. **Receivable.balance > 0**. Si ya está saldada (balance 0), no tiene sentido registrar otro cobro sobre esa cuenta (opcional: se puede rechazar con mensaje claro).

### 5.2 Cobro que excede el balance (sobrepago)

**Recomendación: bloquear.**

- **Motivo**: Mantener una sola interpretación contable: el saldo de la Receivable es siempre “lo que falta cobrar”. Si se permite sobrepago, el saldo pasaría a negativo y habría que definir qué significa (anticipo, crédito a favor, etc.), lo que complica reportes y caja.
- **Comportamiento**: Si `amount > Receivable.balance`, rechazar el cobro con un mensaje del tipo: “El monto no puede superar el saldo pendiente (X).”
- **Alternativa** (no recomendada en v1): Permitir el cobro y dejar balance negativo o un campo “saldo a favor”; exige reglas claras de uso y reportes adicionales.

### 5.3 Actualización de Receivable al registrar un cobro

En la **misma transacción** que la creación del `ReceivablePayment`:

1. **amountPaid** = `Receivable.amountPaid` + `amount` del nuevo cobro.
2. **balance** = `Receivable.totalAmount` - nuevo `amountPaid` (equivalente a `balance - amount`).
3. **status**:
   - Si `balance` resultante ≤ 0 (o `amountPaid` ≥ `totalAmount`): **PAID**.
   - Si no: **PARTIAL** (o mantener PENDING si antes era PENDING; en la práctica con al menos un cobro pasa a PARTIAL).

Recomendación: considerar “saldada” cuando `amountPaid >= totalAmount` (o `balance <= 0` con tolerancia de redondeo). Si por redondeo queda un centavo, se puede en una regla futura permitir un cobro “de ajuste” igual al balance restante.

### 5.4 Resumen de reglas

| Regla | Acción |
|-------|--------|
| Receivable CANCELLED | Rechazar cobro. |
| amount ≤ 0 | Rechazar cobro. |
| amount > balance | Rechazar cobro (no permitir sobrepago). |
| balance ya 0 | Rechazar cobro (opcional, mensaje claro). |
| Tras cobro válido | Crear ReceivablePayment; actualizar amountPaid, balance y status en Receivable. |

---

## 6. Flujo recomendado de registro de cobro

1. Usuario indica: Receivable (id), monto a registrar, fecha del cobro (opcional, default hoy), referencia/notas (opcional).
2. **Validar**:
   - Receivable existe.
   - status ≠ CANCELLED.
   - amount > 0.
   - amount ≤ balance actual.
3. **Transacción**:
   - `INSERT ReceivablePayment` (receivableId, amount, paidAt, reference, notes).
   - `UPDATE Receivable` SET amountPaid = amountPaid + amount, balance = totalAmount - (amountPaid + amount), status = … WHERE id = receivableId.
4. Devolver éxito y, si aplica, el nuevo balance o estado (PAID/PARTIAL) para refrescar la UI.

La lógica puede vivir en una **server action** (por ejemplo `registerReceivablePayment(receivableId, amount, paidAt?, reference?)`) o en un endpoint `POST /api/receivables/[id]/payments`; en ambos casos la transacción debe ser atómica.

---

## 7. Riesgos o trade-offs

- **Redondeo**: Operar con Float puede dejar diferencias de centavos. Mitigación: redondear a 2 decimales al guardar y al comparar; o en el “cierre” considerar PAID si balance &lt; 0.01.
- **Concurrencia**: Dos cobros simultáneos sobre la misma Receivable. Mitigación: toda la validación y actualización dentro de una transacción DB; leer balance con lock si el motor lo permite (ej. `SELECT ... FOR UPDATE`) o al menos actualizar con condición `WHERE balance >= :amount` para evitar sobrepagos por carrera.
- **Anulación de cobros**: No se modela en v1. Si más adelante se necesita “revertir” un cobro, habría que definir: borrado lógico, registro de reversión, o ajuste manual con auditoría. No implementar ahora.
- **Múltiples monedas**: Hoy todo es ARS. Si en el futuro el cobro se registra en otra moneda, haría falta tipo de cambio y posiblemente un monto equivalente en ARS; queda fuera de este diseño.

---

## 8. Orden sugerido de implementación

1. **Migración**: Crear tabla `receivable_payments` y añadir en `Receivable` la relación `payments ReceivablePayment[]`.
2. **Lógica de negocio**: Implementar la función/acción que valida y registra un cobro (crear ReceivablePayment + actualizar Receivable en una transacción).
3. **UI mínima**: En el detalle de una Receivable, formulario para “Registrar cobro” (monto, fecha, referencia) y listado de cobros ya registrados.
4. **Ajustes**: Manejo de redondeo y mensajes de error claros (saldo insuficiente, cuenta cancelada, etc.).
5. **Opcional**: Trazabilidad (createdByUserId) en ReceivablePayment y/o integración futura con caja.

---

*Documento solo de diseño. No incluye migraciones ni cambios en la UI actual.*
