CREATE TABLE "comentarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ficha_id" uuid NOT NULL,
	"autor_nombre" text,
	"contenido" text NOT NULL,
	"codigo_hash" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fichas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"gustos" text NOT NULL,
	"no_gustos" text DEFAULT '' NOT NULL,
	"alergias" text DEFAULT '' NOT NULL,
	"codigo_hash" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_ficha_id_fichas_id_fk" FOREIGN KEY ("ficha_id") REFERENCES "public"."fichas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comentarios_ficha_id_idx" ON "comentarios" USING btree ("ficha_id");--> statement-breakpoint
CREATE INDEX "fichas_creado_en_idx" ON "fichas" USING btree ("creado_en");