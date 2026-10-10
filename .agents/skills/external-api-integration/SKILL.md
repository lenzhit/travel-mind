---
name: external-api-integration
description: >-
  Integra proveedores turísticos, correo y mensajería de TravelMind empezando
  por mocks locales y Mailpit. Usar al implementar TravelProvider, email,
  WhatsApp o cualquier adaptador externo.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Integraciones externas

## Propósito

Cumplir el recorrido demo sin cuentas comerciales. El contrato vive en código; la implementación base es mock. Un proveedor real solo se enchufa detrás del mismo contrato, desactivado por defecto, y después de pasar `zero-budget-resource-audit`.

## Cuándo activar

- Al ampliar `src/server/providers/` más allá de las interfaces actuales (`name`, `isMock`).
- Al enviar correo, WhatsApp o al hablar con un GDS o Booking.com.
- Al configurar Mailpit, SMTP o un webhook saliente.

## Precondiciones

- Defaults en `src/lib/env/index.ts`: `TRAVEL_PROVIDER=mock`, `EMAIL_PROVIDER=mailpit`, `WHATSAPP_PROVIDER=mock`.
- Booking.com y otros GDS están fuera del MVP en `docs/cost-matrix.md`. No implementarlos "preparando el cliente" si eso obliga a credenciales.
- La interfaz prevista, cuando la historia la necesite: `searchPackages`, `getAvailability`, `quote`, `createBooking`, `getBookingStatus`, `cancelBooking` si existe cancelación.

## Procedimiento

1. Definir el contrato en `src/server/providers/` con errores tipados del dominio (`UNAVAILABLE`, `PRICE_CHANGED`, `NOT_FOUND`). El route handler no conoce el JSON del proveedor.
2. Implementar el mock con datos del seed o de fixtures en `tests/`. Cada respuesta lleva `isMock: true`. Los ids son estables para que los tests repitan.
3. `createBooking` del mock devuelve una referencia demo y nunca una reserva real. El servicio traduce eso a `confirmed_demo` solo si el resto de invariantes de `booking-domain-logic` ya pasó.
4. Mapear timeouts. Reintentos solo en lecturas idempotentes. `createBooking` y el pago no se reintentan sin la misma llave de idempotencia.
5. Correo: SMTP a Mailpit local. Plantilla en español, sin documento de identidad completo. Registrar `notification_deliveries` con estado `sent_demo` o `failed`. Si Mailpit está caído, la reserva sigue consultable y el envío queda reintentable.
6. WhatsApp: `MockWhatsAppProvider` escribe en un outbox visible en local. No hay llamada a la red. No instalar un SDK de pago por mensaje.
7. Para un adaptador optativo (SMTP real o Stripe, no Booking): flag apagado por defecto, credenciales solo en entorno, prueba que el suite usa el mock cuando el flag está off, y fila en `docs/cost-matrix.md`.
8. Validar URLs de webhook y de retorno para evitar SSRF. Allowlist de hosts locales en demo (`localhost`, servicio Compose). No seguir redirecciones hacia metadatos de cloud.
9. El E2E de aceptación corre con los tres mocks y Mailpit, sin internet, después de instaladas las dependencias.

## Herramientas permitidas y restricciones

- Permitido: Mailpit, fixtures, HTTP a localhost.
- Prohibido: Booking.com, claves de producción, scraping de sitios de viajes, y presentar la respuesta del mock como PNR real.
- No añadir un cliente HTTP "genérico" que reciba cualquier URL desde el modelo.

## Buenas prácticas

- El mock declara qué no sabe simular (cambios de horario de aerolínea, por ejemplo) y el servicio cae a `manual_review` en ese caso.
- Errores del proveedor se traducen. No devolver el body upstream al cliente.
- Deduplicar notificaciones por (`reservation_id`, plantilla, versión de estado).
- Reloj del mock inyectable en tests para la caducidad de 24 h.

## Validaciones y criterios de aceptación

- [ ] Con `TRAVEL_PROVIDER=mock` no hay socket hacia un host externo en el test de reserva.
- [ ] `getAvailability` vacío no se sustituye por un cupo inventado.
- [ ] El correo de prueba aparece en Mailpit o, si Mailpit no está, queda en `failed` sin tumbar la reserva. Decir cuál de los dos se ejecutó.
- [ ] El outbox de WhatsApp no llama a la red.
- [ ] Un adaptador optativo apagado no se instancia en el camino de `pnpm test`.

## Errores frecuentes

- Dejar `fetch("https://api.booking.com")` detrás de un `if` que en demo igual se evalúa.
- Usar el mock de disponibilidad como si fuera el documento RAG.
- Enviar el correo real al dominio del usuario de prueba.
- Reintentar `createBooking` cinco veces y crear cinco referencias.

## Entregables

Contrato, mock determinista, traducción de errores y prueba sin red. Si el adaptador real no se autorizó, no dejar credenciales ni URL productiva en `.env.example`.

## Ejemplo

`searchPackages({ destination: "Cusco" })` contra el mock devuelve solo paquetes seed. Si el seed no tiene Cusco, el resultado es lista vacía y el chat lo dice. No aparece un paquete armado en el adaptador.
