# ADR 0001: Inicialización y Fundamentos del Sistema (Fase 0)

- **Estado:** Aceptado
- **Fecha:** 2026-10-10
- **Contexto:** Inicio del proyecto TravelMind, enfocado en recomendación, cotización y reserva turística mediante agentes de IA bajo presupuesto cero (USD 0).

---

## 1. Contexto y Problema

TravelMind es un proyecto de investigación académica que requiere una base técnica sólida, escalable, tipada y con costo económico nulo en licencias y consumo de APIs de pago. Se requiere establecer el andamiaje del proyecto (Fase 0) sin sobrecargar el repositorio con dependencias innecesarias, preservando la documentación previa (`AGENTS.md` y `docs/cost-matrix.md`), y habilitando flujos de calidad automatizados.

## 2. Decisiones Tomadas

### 2.1 Pila de Frontend y API (BFF)
- **Next.js 16 con App Router:** Proporciona renderizado del lado del servidor (SSR), rutas de API (`/api/*`), optimización integrada y compatibilidad completa con React 19.
- **TypeScript 5 (modo estricto):** Asegura contratos de datos sólidos en interfaces, DTOs y validación de tipos entre cliente y servidor.
- **pnpm v10 como gestor de paquetes:** Eficiencia de almacenamiento mediante hard links y tiempos reducidos de instalación en CI y desarrollo local.

### 2.2 Sistema de Diseño y Tokens Visuales
- **Tailwind CSS v4 + Radix UI Primitives:** Adopción de tokens de color y radios definidos en `AGENTS.md`:
  - `primary`: `#123A63` (Azul corporativo TravelTech)
  - `accent`: `#0E8F88` (Verde azulado para acentos y estados demo)
  - `background`: `#F7FAFC`
  - `surface`: `#FFFFFF`
  - `text`: `#142335`
  - `warning`: `#B45309`
  - `danger`: `#B42318`
  - Radios: `0.75rem` (12px, dentro del rango 8–16px)
- **Lucide Icons:** Conjunto de iconos Open Source (MIT) consistentes y ligeros.

### 2.3 Arquitectura Modular (`src/`)
Separación arquitectónica estricta:
- `src/app/`: Rutas, layouts y controladores HTTP (BFF).
- `src/components/ui/`: Componentes accesibles atómicos basados en variantes CVA.
- `src/components/shared/`: Componentes reutilizables como cabecera responsive, pie de página y aviso explícito de modo demostración.
- `src/features/`: Módulos de dominio (`catalog`, `quotes`, `reservations`).
- `src/server/`: Abstracciones de backend, servicios y contratos de proveedores (`MockTravelProvider`, `MockPaymentProvider`).
- `src/lib/`: Utilidades comunes (`cn`, variables de entorno tipadas).
- `src/types/`: Tipos transversales del dominio.

### 2.4 Suite de Calidad y Pruebas
- **Vitest + JSDOM + Testing Library:** Motor de pruebas unitarias y de componentes ultrarrápido con soporte nativo ESM y alias `@/*`.
- **ESLint 9 + `eslint-config-next`:** Análisis estático integrado con reglas de Next.js y React.
- **TypeScript Check (`tsc --noEmit`):** Validación exhaustiva del sistema de tipos sin emitir artefactos JS.

### 2.5 Endpoint de Diagnóstico y Contratos de API
- `GET /api/health`: Expone estado HTTP 200, versión del servicio, timestamp ISO, modo configurado (`demo`) y comprobación de políticas (`budgetPolicy: USD_0`), con cabeceras `Cache-Control: no-store, max-age=0`.
- Tipado del sobre estándar para fases futuras (`ApiSuccessResponse<T>` con `data` y `meta`, `ApiErrorResponse` con `code`, `message` en español y `correlationId`).

### 2.6 Formato Financiero y Accesibilidad (WCAG 2.2 AA)
- Formateo de dinero estrictamente desde enteros de unidad menor (`priceMinor / 100`) usando `Intl.NumberFormat("es-PE")` con moneda ISO explícita, bloqueando operaciones con flotantes.
- Fechas con zona horaria IANA explícita (`America/Lima`) y textos en español.
- Enlace de salto accesible (skip link) en el layout para bypass de bloques (WCAG 2.4.1) e iconos decorativos con `aria-hidden="true"`.

## 3. Consecuencias

### Positivas
- Inicio de desarrollo local en cuestión de segundos con `pnpm dev`.
- Garantía de presupuesto cero (USD 0) sin dependencias SaaS o cuentas en la nube.
- Trazabilidad y accesibilidad desde el primer incremento.
- Suite de pruebas y validación estática funcionando en local.

### Mitigaciones
- Next.js 16 requiere variables estables o renderizado en cliente para funciones temporales en prerenderizado; se fijaron constantes para el pie de página.
- El aviso de modo demostración se incluye en el layout para evitar cualquier ambigüedad sobre transacciones o reservas ficticias.
