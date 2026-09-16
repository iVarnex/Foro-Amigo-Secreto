-- Camino de bajada de 0000_closed_leper_queen.sql
-- drizzle-kit no genera migraciones inversas: este archivo se escribe a mano y
-- se aplica con `psql "$DATABASE_URL" -f db/migrations/down/0000_closed_leper_queen.down.sql`.
-- Después hay que borrar la fila correspondiente de "drizzle"."__drizzle_migrations"
-- (o la tabla entera si esta era la única migración) para que `drizzle-kit migrate`
-- vuelva a aplicarla.
DROP INDEX IF EXISTS "fichas_creado_en_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "comentarios_ficha_id_idx";--> statement-breakpoint
DROP TABLE IF EXISTS "comentarios";--> statement-breakpoint
DROP TABLE IF EXISTS "fichas";
