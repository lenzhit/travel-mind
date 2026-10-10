---
name: accessibility-audit
description: >-
  Revisa pantallas de TravelMind contra WCAG 2.2 AA, teclado, foco, contraste
  y nombres accesibles. Usar al crear o modificar UI, formularios, chat,
  checkout o tablas admin.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Auditoría de accesibilidad

## Propósito

Comprobar que un flujo de TravelMind se puede completar con teclado y que el estado (error, demo, aprobación, precio) se entiende sin depender solo del color. El objetivo del MVP es WCAG 2.2 AA en las pantallas tocadas, no un certificado.

## Cuándo activar

- Al añadir una página, un diálogo, un formulario, el chat, el desglose de precio o una tabla admin.
- Al cambiar colores en `src/app/globals.css` o el foco de `src/components/ui/button.tsx`.
- Antes de dar por cerrada una pantalla de reserva o pago.

## Precondiciones

- Tokens vigentes en `globals.css`. No aprobar un hex nuevo sin medir contraste sobre su fondo real.
- UI en español. Controles con nombre visible o `aria-label` en español.
- Revisar el flujo en el navegador. Una captura no basta.

## Procedimiento

1. Listar los controles nuevos y el camino: llegar, completar, corregir un error, salir.
2. Recorrer solo con teclado desde el enlace de saltar o desde el primer control. El orden sigue el orden visual. No hay trampa de foco. El foco usa `focus-visible:ring-ring` (token `--ring: #123A63`).
3. Cada input tiene `label` asociado. El error se enlaza con `aria-describedby` o un live region `polite`, en español, y no solo con el borde `danger`.
4. El banner de simulación es texto, no un color. Un estado `pending_approval` o `confirmed_demo` no se comunica únicamente con verde o ámbar; hay texto.
5. Contraste: texto `#142335` sobre `#F7FAFC` y sobre `#FFFFFF`; texto blanco sobre `#123A63`, `#0E8F88`, `#B45309` y `#B42318`. Si se añade un par nuevo, calcular la relación y no usar el par si queda bajo 4.5:1 para texto normal o 3:1 para texto grande y componentes de UI.
6. Iconos de Lucide decorativos con `aria-hidden`. Iconos que son el único contenido del botón (size `icon`) tienen nombre accesible.
7. Chat: los mensajes nuevos se anuncian sin robar el foco en cada token. La pregunta que bloquea el precio es un control de formulario, no un párrafo clicable.
8. Tablas de admin: encabezados de columna, y acciones con nombre que incluye el objeto ("Aprobar reserva …"), no "Aprobar" repetido sin contexto.
9. Viewport 320 px: no se pierde el total, el aviso demo ni el botón de enviar. Sin scroll horizontal del documento.
10. Anotar fallos con criterio (por ejemplo 2.4.7 Focus Visible, 1.4.3 Contrast, 4.1.2 Name, Role, Value) y corregir los de la pantalla tocada en la misma tarea si el arreglo es local.

## Herramientas permitidas y restricciones

- Permitido: teclado en el navegador, inspección de roles, reglas ya instaladas.
- Prohibido: dar por auditada una pantalla no abierta; depender de un servicio SaaS de accesibilidad de pago.
- No añadir un overlay de accesibilidad de terceros.

## Buenas prácticas

- El loader tiene fin y un texto "Buscando paquetes". Si falla Ollama, el mensaje dice que se usó el catálogo o que hay que reintentar.
- Moneda y fecha están en el texto, no solo en un gráfico.
- `Button` type `button` dentro de formularios cuando no envía. El de envío es `submit`.
- Respetar `prefers-reduced-motion` si se añade animación. No hacer parpadear el precio.

## Validaciones y criterios de aceptación

- [ ] El flujo principal y el error se completan con teclado.
- [ ] El foco es visible en los controles nuevos.
- [ ] Precio, error y simulación tienen texto.
- [ ] Los icon-button tienen nombre.
- [ ] A 320 px se puede operar la acción principal.
- [ ] Los fallos que queden están listados con el criterio WCAG, no ocultos.

## Errores frecuentes

- Quitar el anillo de foco por estética.
- Usar `div` con `onClick` para una tarjeta que navega.
- Anunciar el éxito de pago solo con el token `success`.
- Poner `aria-label` en inglés en una UI `es-PE`.

## Entregables

Resultado del recorrido de teclado, problemas corregidos y los que siguen abiertos con criterio WCAG. Decir qué viewport se comprobó.

## Ejemplo

El botón de pagar es un `button` con texto "Pagar simulación", foco visible, y el error "La cotización venció" sale en un párrafo asociado al formulario, no solo en un borde rojo.
