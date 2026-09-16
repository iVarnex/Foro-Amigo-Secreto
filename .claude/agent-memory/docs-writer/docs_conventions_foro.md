---
name: docs-conventions-foro
description: Convenciones de documentación del repo Foro (Directorio de Amigo Secreto/Dulce) — voz, formato de ADR, dónde viven las cosas.
metadata:
  type: project
---

El repo `C:\Users\JuanG\Desktop\Foro` no tenía ninguna documentación real al
2026-09-15 (README era el boilerplate de `create-next-app`, sin `docs/`).

- **Voz**: español, igual que `PLANIFICACION.md` y los comentarios del código
  (nombres de funciones/variables en español: `crearFicha`, `verificarCodigo`,
  etc.). El README y los ADR de este repo se escriben en español.
- **ADR**: no existía convención previa. Se estableció `docs/adr/000N-slug.md`
  (numeración secuencial con prefijo de 4 dígitos), con secciones Estado /
  Fecha / Contexto / Decisión / Consecuencias / Alternativas consideradas.
  El primero es `docs/adr/0001-stack-inicial.md`.
- **Fuente de verdad para decisiones ya evaluadas**: `PLANIFICACION.md` en la
  raíz documenta el análisis de stack (Next.js+Vercel, Neon vs Supabase vs
  SQLite/Turso, Clerk) hecho *antes* de implementar. Es la fuente correcta
  para la sección "Alternativas consideradas" de un ADR, pero hay que
  contrastarla contra el código real: el plan es anterior a la
  implementación y algunos nombres/archivos cambiaron en el camino (p. ej.
  `middleware.ts` → `proxy.ts` en Next.js 16, documentado en el propio
  `proxy.ts`).
- **No hay CHANGELOG ni LICENSE** en la raíz — no inventar ninguno de los dos
  sin que se pida explícitamente.
- Sin generador de sitio de docs (no hay MkDocs/Docusaurus/etc.) — la
  documentación vive como Markdown plano en la raíz y en `docs/`.

Ver también [[permisos-env-example-foro]].
