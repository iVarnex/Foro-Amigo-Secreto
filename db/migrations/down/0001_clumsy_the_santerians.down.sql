-- Camino de bajada de 0001_clumsy_the_santerians.sql
-- drizzle-kit no genera migraciones inversas: este archivo se escribe a mano y
-- se aplica con `psql "$DATABASE_URL" -f db/migrations/down/0001_clumsy_the_santerians.down.sql`.
-- Después hay que borrar la fila correspondiente de "drizzle"."__drizzle_migrations"
-- para que `drizzle-kit migrate` vuelva a aplicarla.
-- No es destructiva: solo quita un índice, ninguna fila se pierde.
DROP INDEX IF EXISTS "comentarios_creado_en_idx";
