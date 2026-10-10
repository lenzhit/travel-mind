---
name: devops-release
description: >-
  Prepara el entorno local de TravelMind con Compose o Podman, migraciones y
  comprobaciones sin servicios de pago. Usar al añadir infraestructura local,
  variables de ejemplo, CI o el procedimiento de rollback.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Entrega y entorno local

## Propósito

Levantar la demo en la máquina del equipo sin cuentas cloud obligatorias. Hoy el repo tiene `pnpm` 10, Next.js y Vitest. No tiene `docker-compose.yml` ni workflow de GitHub Actions. Crearlos solo cuando la tarea de infraestructura lo pida, no como relleno.

## Cuándo activar

- Al definir Compose/Podman, `.env.example`, migraciones de arranque o CI.
- Al documentar cómo ejecutar catálogo, Ollama, n8n Community y Mailpit en local.
- Al revertir una migración o un cambio de entorno.

## Precondiciones

- Leer `docs/cost-matrix.md` y `src/lib/env/index.ts`.
- Docker Engine o Podman son las opciones admitidas. No exigir Docker Desktop de pago.
- GitHub Actions es optativo y tiene cuota en repos privados. El camino que siempre debe existir es correr `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` en local.

## Procedimiento

1. Servicios locales, en la tarea que los introduzca, solo los necesarios: PostgreSQL con pgvector, n8n Community, Mailpit. Puertos y credenciales de desarrollo explícitos y distintos de cualquier producción. Volúmenes locales. Sin imágenes que exijan login a un registry de pago.
2. `.env.example` refleja los defaults de `src/lib/env/index.ts` con placeholders. No copiar secretos desde un `.env` real. Incluir `APP_MODE=demo` y los proveedores mock.
3. Documentar requisitos mínimos de la demo (CPU, RAM, disco) como orden de magnitud medido o estimado y etiquetado. Ollama 7B no es obligatorio si 1.5B o el fallback determinista cubren el recorrido.
4. Migraciones: comando único hacia adelante y comando de rollback probado en una base local desechable. No apuntar el comando a un host que no sea localhost sin confirmación explícita de la persona.
5. CI, si se añade: el workflow usa los scripts del `package.json`, no descarga modelos de pago ni contacta Stripe. Si la cuota de Actions no alcanza, el README dice cómo correr los mismos comandos en local. No bloquear el MVP a un runner de pago.
6. Arranque de verificación: health `USD_0`, Postgres responde, Mailpit tiene UI local, n8n no está expuesto sin autenticación a la red del equipo. El editor de n8n no es la UI del cliente.
7. Rollback de aplicación: volver al commit anterior y aplicar down de la migración de esa entrega. Comprobar que el mock sigue siendo el proveedor por defecto.
8. No publicar a Vercel como paso necesario. Si alguien despliega el frontend en Hobby, dejar escrito que eso no incluye PostgreSQL, n8n ni Ollama.

## Herramientas permitidas y restricciones

- Permitido: Docker Engine, Podman, pnpm, scripts ya definidos.
- Prohibido: `docker push` a un registry de pago, secretos en la imagen, y bases gestionadas como dependencia.
- No ejecutar `down -v` ni borrar volúmenes sin pedido explícito: eso destruye datos locales.

## Buenas prácticas

- Pin de versión mayor de las imágenes (Postgres, n8n, Mailpit) escrita en el compose, no `latest` mudo.
- Healthchecks de compose para no arrancar n8n contra una API aún caída, con reintentos acotados.
- `.env` en `.gitignore`. Revisar que sigue ignorado al tocarlo.
- Un solo mecanismo de migración, el del ORM elegido en el ADR.

## Validaciones y criterios de aceptación

- [ ] Un arranque limpio llega a `GET /api/health` sin claves cloud.
- [ ] `.env.example` no tiene secretos reales.
- [ ] La migración nueva sube y baja en local, o se dice que aún no hay ORM.
- [ ] `pnpm test` pasa sin los contenedores que esa prueba no necesita.
- [ ] n8n y Mailpit quedan en localhost.

## Errores frecuentes

- Añadir Compose con una imagen de n8n Enterprise o `n8nio/n8n` más un plan cloud.
- Poner `DATABASE_URL` de un Postgres remoto en `.env.example`.
- Marcar el release como listo sin el rollback.
- Exigir GPU. La demo debe poder usar CPU o el fallback sin LLM.

## Entregables

Archivos de entorno pedidos por la tarea, comandos usados y el resultado del health o del test. Limitación explícita si Docker no estaba disponible en la sesión.

## Ejemplo

La tarea "añade Mailpit" crea el servicio en compose, documenta el puerto SMTP local y no cambia `EMAIL_PROVIDER` a un SMTP público. La prueba de reserva sigue pasando aunque el contenedor esté apagado si el código deja la notificación en `failed` recuperable.
