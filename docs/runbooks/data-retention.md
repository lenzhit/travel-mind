# Retención local de datos

Política académica del entorno de simulación; no establece un plazo legal de conservación ni acredita cumplimiento normativo.

`pnpm workflows:run` ejecuta la limpieza con las mismas credenciales de la base local configurada. No se instala una tarea programada. El endpoint interno existente requiere su token de servicio; una sesión de administrador no lo sustituye. El mantenimiento rechaza modos distintos de `demo`.

Cada ejecución aplica una transacción y cuatro lotes independientes de hasta 100 filas, ordenados desde la más antigua y con `FOR UPDATE SKIP LOCKED` para admitir ejecuciones concurrentes:

- Sesiones de cuenta vencidas (incluye el instante exacto de vencimiento): elimina el hash del token, no la cuenta.
- Sesiones administrativas antiguas vencidas: elimina credenciales retiradas; no reactiva el acceso separado.
- Sesiones de visitante vencidas: elimina únicamente las que no tienen sesiones de cuenta ni cotizaciones vinculadas. Las sesiones que documentan propiedad de cotizaciones permanecen.
- Nombre del responsable: sustituye por NULL al cumplirse 30 días desde la creación de la reserva, incluso cuando el caso siga pendiente. No altera estados ni el historial financiero.

La respuesta de mantenimiento incluye `retention` con cuatro contadores. No incluye hashes, nombres o identificadores de cuenta. Ejecutar nuevamente procesa los lotes restantes; el progreso depende de invocar el mantenimiento. Las pruebas no ejecutan limpieza sobre la base principal.

Se conservan cuentas, cotizaciones/versiones, consentimientos, decisiones, eventos, pagos, intentos del proveedor y outbox. No existe borrado automático del ledger, de cuentas ni una interfaz de solicitud de borrado. Una política de eliminación completa requiere definir sus dependencias, obligaciones aplicables y pruebas de integridad antes de habilitarla. El operador debe gestionar el volumen de la base y las copias locales; no hay garantía de almacenamiento ilimitado.

Una revisión manual con pago pendiente, creado o verificado sin reversión completada conserva su estado aunque venza la cotización. Sigue bloqueada para iniciar otro pago o renovar aceptación, salvo el recorrido ya existente de cambio de precio. Una revisión sin pago pendiente/verificado sí puede vencer; no se fuerza una confirmación por vencimiento.

Las notas de case_actions se conservan con la auditoría del ledger. Son visibles únicamente para admin o el agente actualmente asignado cuando el caso está en la cola. El formulario desaconseja PII; todavía no hay anonimización automática del texto libre ni exportación/borrado de cuentas.
