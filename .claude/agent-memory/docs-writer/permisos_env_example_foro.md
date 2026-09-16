---
name: permisos-env-example-foro
description: En el repo Foro, la herramienta Read no puede abrir .env.example por permisos del entorno — hay que documentar variables a partir del código, no del archivo.
metadata:
  type: reference
---

En `C:\Users\JuanG\Desktop\Foro`, intentar leer `.env.example` con la
herramienta Read falla con "File is in a directory that is denied by your
permission settings" (probado 2026-09-15). No es que el archivo no exista —
aparece en `git status` como `.env.example` sin trackear.

Para documentar variables de entorno en este repo, hay que derivarlas de
`process.env.*` en el código (grep `process\.env\.`) y del SDK usado (p. ej.
`@clerk/nextjs` espera `CLERK_SECRET_KEY` y
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` aunque el repo no las referencie
explícitamente como `process.env.*`, porque el SDK las lee internamente).
Marcar esas variables inferidas por convención de SDK (no confirmadas contra
`.env.example`) con un comentario `<!-- TODO - verificar -->` en vez de
darlas por buenas silenciosamente.

Ver también [[docs-conventions-foro]].
