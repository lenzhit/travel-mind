# ADR 0002: Base de Datos Local con PostgreSQL, Drizzle ORM y Catálogo Turístico (Fase 1A)

- **Estado:** Aceptado
- **Fecha:** 2026-10-10
- **Contexto:** Implementación de la persistencia de datos y el catálogo turístico para TravelMind con presupuesto cero (USD 0).

---

## 1. Contexto y Problema

Para habilitar la exploración y posterior recomendación/cotización de paquetes turísticos, TravelMind requiere persistencia relacional estructurada con soporte vectorial (`pgvector`). Siguiendo `AGENTS.md` y `docs/cost-matrix.md`, era necesario evaluar y seleccionar el ORM (entre Prisma y Drizzle ORM) y modelar las entidades iniciales (`destinations`, `packages`, `package_variants`) con dinero en enteros de unidad menor y validación estricta en servidor.

## 2. Decisiones Tomadas

### 2.1 Adopción de Drizzle ORM y Driver postgres
- **Drizzle ORM (Apache-2.0):** Se seleccionó sobre Prisma debido a su ligereza, tipado nativo sin generación de artefactos binarios pesados (`drizzle-kit`), soporte transparente para `pgvector` y compatibilidad directa con el modelo Server Components / Turbopack de Next.js 16.
- **Driver `postgres` (porsager/postgres):** Driver puro, eficiente y con pooling local.

### 2.2 Infraestructura Local Reproducible (Docker Compose)
- **Imagen `pgvector/pgvector:pg16`:** Contenedor local con PostgreSQL 16 y la extensión `pgvector` habilitada, sin costo de licencias ni dependencias cloud.
- **Persistencia:** Volumen nombrado `travelmind_postgres_data`.
- **Healthcheck:** Verificación con `pg_isready` para inicialización ordenada.

### 2.3 Modelado de Datos
- **Entidades:** `destinations`, `packages`, `package_variants` con identificadores UUID, claves foráneas e índices en columnas de búsqueda y ordenación (`slug`, `destination_id`, `category`, `base_price_minor`, `status`).
- **Invariante Financiero:** Todos los precios se modelan como enteros de unidad menor (`base_price_minor`, `price_minor`) en céntimos, con moneda ISO 4217 (`USD`), prohibiendo el uso de floats.
- **Contenido Detallado:** Inclusiones, exclusiones e itinerarios modelados como `jsonb` fuertemente tipados.

### 2.4 Validación con Zod
- Esquemas de validación de consulta `packageQuerySchema` en `src/features/catalog/schemas.ts` para filtros de búsqueda, categorías permitidas, límites de paginación y ordenamiento.

### 2.5 Arquitectura en Capas
- Separación estricta:
  - Repositorio (`src/server/repositories/package.repository.ts`): Consultas SQL con Drizzle.
  - Servicio (`src/server/services/package.service.ts`): Reglas de negocio y metadatos de paginación.
  - Controladores HTTP (`src/app/api/packages/`): Validación Zod, sobres estándar `{ data, meta }` y `{ error }`.
  - Presentación (`src/app/packages/`, `src/components/features/catalog/`): UI modular y streaming con `<Suspense>`.

## 3. Consecuencias y Verificación

- **Presupuesto USD 0:** Cumplimiento total con código abierto MIT/Apache-2.0.
- **Rendimiento:** Compilación en Next.js 16 con Partial Prerendering (`◐ /packages`).
- **Pruebas:** 22 pruebas automatizadas en Vitest cubriendo repositorio, endpoints y flujo E2E del catálogo.
