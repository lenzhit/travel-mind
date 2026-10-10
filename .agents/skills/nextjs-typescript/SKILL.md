---
name: nextjs-typescript
description: >-
  Implementa páginas, route handlers y componentes de TravelMind en Next.js 16
  App Router, React 19 y TypeScript estricto. Usar al escribir o modificar
  src/app, src/features, src/components o src/lib.
compatibility: >-
  Next.js 16.4 App Router, React 19.3, TypeScript estricto, alias @/*, pnpm.
  Leer node_modules/next/dist/docs antes de usar una API de Next que pueda
  haber cambiado.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Next.js y TypeScript

## Propósito

Añadir UI y BFF sin mezclar el modelo de Next.js anterior con el del repo. La app usa App Router, `cacheComponents` y `partialPrefetching` en `next.config.ts`, alias `@/*` → `src/*`, y `strict: true`. El único route handler existente es `src/app/api/health/route.ts`.

## Cuándo activar

- Al crear una página, un layout, un route handler o un componente de servidor/cliente.
- Al tocar `next.config.ts`, `tsconfig.json` o imports `@/`.
- Cuando una API de Next no coincida con el recuerdo del modelo: comprobar la guía en `node_modules/next/dist/docs/` antes de escribirla.

## Precondiciones

- Inspeccionar el archivo vecino y seguir su estilo. No reestructurar `src/` por simetría con `AGENTS.md`.
- Zod está decidido como validador, pero no está en `package.json`. No instalarlo dentro de un arreglo de UI. Si la tarea pide contratos, usar la skill `api-contract-design` y auditar la dependencia antes.
- Variables de entorno de producto salen de `src/lib/env/index.ts`.

## Procedimiento

1. Confirmar si el módulo puede ser Server Component. Añadir `"use client"` solo si hay estado, eventos o APIs de navegador. No marcar la página entera como cliente para un botón.
2. Colocar la ruta en `src/app/`. Route handlers en `src/app/api/<recurso>/route.ts`, exportando `GET`, `POST` u otro método HTTP en mayúsculas.
3. Validar la entrada en el servidor. Rechazar cuerpos inesperados con el sobre de error de `api-contract-design`. El health check es la excepción: responde el DTO de `HealthCheckResponse` y `Cache-Control: no-store`.
4. No leer secretos ni armar reglas de precio en un componente cliente. El cliente pide un DTO ya autorizado.
5. Tipos compartidos en `src/types/` o en el `index.ts` del feature. `PackageSummary.priceMinor` es entero. No introducir `any` para saltar un error de `tsc`.
6. Respetar `cacheComponents`. No llamar `new Date()` o `Math.random()` durante el prerender de una página. En un route handler dinámico, como health, la hora de la respuesta sí es válida.
7. Imports con alias `@/`. Iconos desde `lucide-react`. Clases con `cn` de `@/lib/utils`.
8. Cerrar con `pnpm typecheck` y `pnpm lint`. Si la pantalla cambió, recorrer el flujo en el navegador.

## Herramientas permitidas y restricciones

- Permitido: `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, y la documentación de Next incluida en `node_modules/next/dist/docs/`.
- Prohibido: Pages Router, `getServerSideProps`, desactivar `strict`, exponer `env` privado con el prefijo `NEXT_PUBLIC_`, y llamar a un proveedor de pago desde el navegador.
- No añadir `experimental` flags no usados por el ADR 0001 sin una decisión escrita.

## Buenas prácticas

- El layout raíz conserva el banner de demo y el idioma de la UI.
- Un route handler no importa el proveedor mock y también repite la regla de negocio. Delega en `src/server/services` cuando la regla exista.
- Errores de usuario en español. Códigos y nombres de función en inglés.
- Listas de catálogo paginadas en el servidor. No traer el catálogo completo al cliente para filtrarlo.
- Server Actions, si se usan, siguen siendo código de servidor: Zod o validación equivalente, RBAC y sin efectos externos no idempotentes.

## Validaciones y criterios de aceptación

- [ ] `pnpm typecheck` y `pnpm lint` pasan.
- [ ] No hay `"use client"` innecesario.
- [ ] Ningún componente cliente importa `src/lib/env` para leer secretos, ni `src/server/`.
- [ ] La ruta nueva tiene un caso de prueba o, si es UI, verificación del flujo en el navegador.
- [ ] La API usada existe en la documentación de Next 16 del `node_modules` local, no solo en memoria.

## Errores frecuentes

- Copiar `export async function get()` o un handler de Pages API.
- Asumir que `cookies()`, `headers()` o `params` se usan como en Next 14. Leer la guía local.
- Importar un Server Component dentro de un cliente.
- Corregir un error de tipos con un cast a `any`.
- Poner `NEXT_PUBLIC_PAYMENT_PROVIDER` o la URL interna de n8n en el bundle.

## Entregables

Archivos de ruta o componente, tipos estrictos, y el resultado de typecheck, lint y la verificación de UI que corresponda. No dejar `console.log` con cuerpos de reserva o viajeros.

## Ejemplo

Un `POST` de cotización vive en `src/app/api/quote/route.ts`, valida el cuerpo en el servidor, llama al servicio de pricing y responde `{ data, meta }`. La página que lo muestra permanece como Server Component y solo el formulario interactivo, si hace falta, es cliente.
