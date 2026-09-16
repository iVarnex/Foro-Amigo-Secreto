import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const fichas = pgTable(
  "fichas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    gustos: text("gustos").notNull(),
    noGustos: text("no_gustos").notNull().default(""),
    // Cadena vacía significa "sin alergias registradas"; la UI lo dice de forma
    // explícita para no confundir "no completó" con "confirmó que no tiene".
    alergias: text("alergias").notNull().default(""),
    codigoHash: text("codigo_hash").notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (tabla) => [index("fichas_creado_en_idx").on(tabla.creadoEn)],
);

export const comentarios = pgTable(
  "comentarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fichaId: uuid("ficha_id")
      .notNull()
      .references(() => fichas.id, { onDelete: "cascade" }),
    autorNombre: text("autor_nombre"),
    contenido: text("contenido").notNull(),
    codigoHash: text("codigo_hash").notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (tabla) => [
    index("comentarios_ficha_id_idx").on(tabla.fichaId),
    // El panel de moderación lista todos los comentarios por fecha descendente.
    index("comentarios_creado_en_idx").on(tabla.creadoEn),
  ],
);

export const fichasRelations = relations(fichas, ({ many }) => ({
  comentarios: many(comentarios),
}));

export const comentariosRelations = relations(comentarios, ({ one }) => ({
  ficha: one(fichas, {
    fields: [comentarios.fichaId],
    references: [fichas.id],
  }),
}));

export type Ficha = typeof fichas.$inferSelect;
export type NuevaFicha = typeof fichas.$inferInsert;
export type Comentario = typeof comentarios.$inferSelect;
export type NuevoComentario = typeof comentarios.$inferInsert;
