---
name: ui-design-system
description: >-
  Construye interfaz TravelMind con los tokens de src/app/globals.css, los
  componentes de src/components/ui y el aviso de simulación. Usar al crear o
  modificar pantallas, componentes, estados visuales o estilos.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Sistema de interfaz

## Propósito

Mantener una UI TravelTech sobria, en español (`es-PE`), que distinga exploración de catálogo, incertidumbre y simulación. Los tokens ya viven en `src/app/globals.css`. Los primitivos existentes son `Button`, `Badge` y `Card` en `src/components/ui/`. El aviso de demo está en `src/components/shared/demo-banner.tsx`.

## Cuándo activar

- Al añadir o cambiar un componente, una página, un estado vacío/error/carga o un desglose de precio.
- Al ajustar Tailwind, colores, radio, tipografía o iconos.
- Al mostrar reserva, pago, cotización o aprobación.

## Precondiciones

- Leer `src/app/globals.css`, `src/components/ui/button.tsx` y `src/lib/utils.ts` (`cn`).
- Tailwind 4 está cableado con `@theme inline` y el loader `@tailwindcss/turbopack` en `next.config.ts`. No reintroducir `tailwind.config.js` sin una tarea que lo justifique.
- No añadir kits de UI de pago ni imágenes de bancos premium.

## Procedimiento

1. Buscar un primitivo existente antes de crear otro. Extender variantes con `class-variance-authority`, como `button.tsx`, usando clases de token (`bg-primary`, `text-danger`) y no hex sueltos.
2. Colocar el componente:
   - atómico reutilizable → `src/components/ui/`
   - cabecera, pie, aviso demo → `src/components/shared/`
   - exclusivo de un caso de uso → `src/features/<dominio>/` junto a ese módulo
3. Cubrir el estado que la pantalla pueda mostrar de verdad: carga con fin comprensible, vacío, error, disponibilidad incierta, demo, aprobación pendiente, pago en proceso, `confirmed_demo`. No usar un loader infinito.
4. En cualquier vista de cotización, reserva o pago, mantener visible que es simulación: no se realizó cargo ni reserva externa. Reutilizar el banner de demo; no ocultarlo en el checkout.
5. Formatear dinero desde enteros de unidad menor (`priceMinor` en `PackageSummary`) con `Intl.NumberFormat("es-PE", { style: "currency", currency })`. Mostrar la moneda ISO. No renderizar un `number` de punto flotante como precio.
6. Fechas con zona IANA explícita y texto inequívoco (día, mes y año). El idioma visible por defecto es español.
7. Responsive desde 320 px. Iconos solo con `lucide-react`. Si una imagen no tiene licencia compatible ya registrada, no usarla; preferir el diseño sin foto antes que un destino falso presentado como real.
8. Verificar contraste de los tokens vigentes: primary `#123A63`, accent `#0E8F88`, background `#F7FAFC`, surface `#FFFFFF`, text `#142335`, warning `#B45309`, danger `#B42318`, success `#15803D`. Radio base `--radius: 0.75rem`.

## Herramientas permitidas y restricciones

- Permitido: componentes ya instalados (Radix Slot, CVA, clsx, tailwind-merge, Lucide) y el navegador para comprobar el flujo.
- Prohibido: shadcn CLI contra un registro que exija cuenta, fuentes de pago, e imágenes generadas presentadas como fotografía real del destino.
- Una dependencia visual nueva pasa antes por `zero-budget-resource-audit`.

## Buenas prácticas

- El acento `#0E8F88` señala estado demo o acción secundaria, no un "éxito de reserva real".
- `Badge` para estado; no colorear toda la página de verde al llegar a `confirmed_demo`.
- Botones con nombre accesible. El variant `destructive` usa el token `danger`.
- El desglose muestra subtotal, impuestos, tarifas, descuentos, total, moneda y vigencia de la cotización.
- No animar precios ni inventar "quedan 2 cupos" si el mock no envió disponibilidad.

## Validaciones y criterios de aceptación

- [ ] No hay hex nuevos fuera de `globals.css` salvo un token añadido ahí y mapeado en `@theme`.
- [ ] La pantalla tiene estado vacío y de error, no solo el caso feliz.
- [ ] Precio y fechas salen de datos, localizados en `es-PE`.
- [ ] La simulación es visible sin leer letra pequeña.
- [ ] Se recorre con teclado el control nuevo y el foco es visible (`focus-visible:ring-ring`).
- [ ] El cambio se comprobó en el navegador en el flujo real, no solo con una captura estática.

## Errores frecuentes

- Copiar un bloque shadcn que espera Tailwind 3 y `tailwind.config.ts`.
- Mostrar `priceMinor / 100` con aritmética floja y símbolo `$` fijo.
- Quitar el banner de demo "para que se vea más real".
- Usar `primary` como color de error.

## Entregables

Componente o pantalla integrada con tokens existentes, estados necesarios y verificación manual del flujo. Si se añade un token, actualizar `globals.css` y el ADR o la nota de la tarea solo si el cambio de marca es deliberado.

## Ejemplo

Un total de cotización de `186050` céntimos USD se muestra como moneda USD localizada, con la línea "Válida 24 h desde la emisión" tomada de `issued_at`, y un aviso de que la tarifa no reserva cupo hasta la reconfirmación.
