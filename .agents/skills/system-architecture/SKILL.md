---
name: system-architecture
description: >-
  Propone capas, contratos y ADR de TravelMind sin mover el control de negocio
  fuera de Next.js. Usar al añadir un módulo, un proveedor, n8n, RAG o una
  decisión que cambie límites entre UI, BFF, PostgreSQL y mocks.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Arquitectura del sistema

## Propósito

Fijar dónde vive una decisión antes de codificarla. Next.js es la API pública y la fuente de reglas. PostgreSQL es el registro. n8n orquesta eventos. Los proveedores mock ejecutan catálogo, pago y mensajería de demostración. El LLM propone; los servicios persisten.

## Cuándo activar

- Al crear un módulo en `src/features/`, `src/server/` o `src/app/api/`.
- Al introducir ORM, pgvector, Ollama, n8n, Mailpit o un adaptador nuevo.
- Al dudar si una regla va en el cliente, en un workflow o en el servidor.

## Precondiciones

- Leer `docs/adr/0001-fase-0-fundamentos-y-stack.md` y la estructura real de `src/`. No crear carpetas vacías para imitar el árbol objetivo de `AGENTS.md`.
- Estado actual: Next.js 16.4, React 19, TypeScript estricto, Tailwind 4, Vitest. Interfaces mínimas en `src/server/providers/index.ts`. Sin Prisma, Drizzle, Zod ni `docker-compose.yml` todavía.
- Pasar cualquier componente nuevo por `zero-budget-resource-audit` antes de adoptarlo.

## Procedimiento

1. Escribir el flujo en una frase: quién llama, qué valida, qué se persiste, qué adaptador responde y qué queda registrado si el adaptador falla.
2. Colocar cada responsabilidad:
   - `src/app/`: rutas, layouts y route handlers. Sin reglas de precio duplicadas en el cliente.
   - `src/features/<dominio>/`: casos de uso del dominio. Ya existen `catalog`, `quotes` y `reservations`.
   - `src/server/services/`: autorización, invariantes y transiciones. El LLM no escribe aquí por SQL directo.
   - `src/server/repositories/`: persistencia. Aún no existe; crearla solo con la migración de esa historia.
   - `src/server/providers/`: `TravelProvider` y `PaymentProvider`. Todo adaptador de demo expone `isMock: true`.
   - `src/lib/env/index.ts`: únicos defaults de proveedores. No leer `process.env` disperso en componentes.
   - `workflows/n8n/`: exportaciones sin secretos. n8n llama endpoints internos autenticados y no es la base de datos ni el único autorizador.
3. Elegir un ORM solo en la tarea que abra la persistencia. Prisma o Drizzle, uno solo, con migraciones locales. Registrar la elección en un ADR nuevo, no en los dos.
4. Si la decisión es difícil de revertir, crear `docs/adr/NNNN-titulo.md` siguiendo el formato del ADR 0001: estado, fecha, contexto, decisión, consecuencias. Numerar a partir de `0002`.
5. Dibujar el cambio como diagrama de texto (secuencia o flujo) con los límites de fallo: IA caída → búsqueda de catálogo; n8n caído → evento recuperable; proveedor caído → no confirmar; notificación caída → la reserva sigue consultable.
6. Comprobar que el modo demo no requiere red después de instalar dependencias y modelos.

## Herramientas permitidas y restricciones

- Permitido: lectura del código, ADR en `docs/adr/`, diagrama en el ADR o en la respuesta de la tarea.
- Prohibido: poner autorización solo en la UI, usar n8n como sistema de registro, confirmar reservas desde una respuesta del modelo, y añadir servicios de pago cloud al camino por defecto.

## Buenas prácticas

- Un adaptador por contrato. `MockTravelProvider` y `MockPaymentProvider` cumplen el mismo interfaz que un sandbox optativo.
- Idempotencia en el servicio de Next.js, no solo en el nodo de n8n.
- El cliente recibe DTO. No expone `DATABASE_URL`, prompts con datos de viajeros ni identificadores de PSP más allá del estado.
- Reutilizar `correlation_id` entre route handler, log, workflow y fila de auditoría.

## Validaciones y criterios de aceptación

- [ ] Cada regla de negocio citada tiene un único dueño en servidor.
- [ ] El diagrama muestra el mock como camino base y el externo como optativo.
- [ ] El ADR, si hace falta, no contradice el ADR 0001 ni la matriz de coste.
- [ ] No aparecen directorios creados solo para reservar el nombre.
- [ ] Un fallo de Ollama o de n8n no bloquea catálogo, cotización determinista ni consulta de reserva.

## Errores frecuentes

- Duplicar el umbral HITL en el prompt y olvidarlo en el servicio.
- Crear `src/app/(dashboard)/` vacío "porque el árbol objetivo lo nombra".
- Tratar `GET /api/health` como plantilla de todas las APIs. Ese endpoint es diagnóstico y no usa el sobre `{ data }`.
- Elegir Prisma y Drizzle a la vez.

## Entregables

Decisión de ubicación (rutas y módulos), diagrama breve, trade-off y, si la decisión es estructural, el ADR numerado. La implementación del código queda para la tarea que la pida.

## Ejemplo

Entrada: "n8n debe aprobar reservas grandes y guardar la reserva".

Salida: rechazo de ese diseño. n8n recibe el evento y recuerda al panel. `approver` decide en Next.js; la fila `approval_decisions` se escribe en PostgreSQL desde el servicio, con actor, timestamp y motivo. n8n no almacena el estado maestro.
