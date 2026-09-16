---
name: reglas-de-producto
description: Reglas absolutas del producto Amigo Secreto: nunca hay sorteo/emparejamiento y las alergias tienen prioridad visual propia
metadata:
  type: project
---

Dos reglas innegociables del producto:

1. La app **nunca** hace sorteo ni emparejamiento de amigo secreto. Solo publica
   fichas y comentarios; el emparejamiento ocurre fuera de la app.
2. Las alergias nunca comparten bloque visual con "no le gusta", van primero,
   con color de alerta propio, y si el campo está vacío se muestra
   explícitamente "sin alergias registradas" en vez de omitirse.

**Why:** la regla 1 la fijó el dueño del proyecto al encargar la primera
rebanada; la regla 2 está en PLANIFICACION.md como regla de diseño transversal
y existe para que no se confunda "no completó el campo" con "no tiene alergias".

**How to apply:** rechaza cualquier pedido de lógica de sorteo y revisa toda UI
nueva que muestre fichas contra la regla 2. Ver también
[[tooling-verificacion]].
