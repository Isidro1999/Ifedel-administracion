# Respaldo del historial de migraciones SQLite

Este directorio contiene el historial **original** de Prisma generado para **SQLite** (`provider = "sqlite"`), archivado al migrar el proyecto a **PostgreSQL**.

- No se reutilizan estos SQL en Postgres (dialecto distinto).
- El historial activo vive en `../migrations/` y usa `migration_lock.toml` con `postgresql`.
- Para consultar el esquema histórico en SQLite, podés abrir estas carpetas o restaurar temporalmente el lock antiguo en una rama solo de lectura.

**No borrar** este respaldo hasta validar despliegues y backups de datos.
