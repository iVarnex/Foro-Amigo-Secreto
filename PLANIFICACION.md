# Directorio de Amigo Secreto / Amigo Dulce — Planificación y Arquitectura

> Documento de planificación. No contiene código de producción. Pendiente de
> tu revisión y aprobación antes de pasar a construir.

## Supuestos declarados

Detecté tres ambigüedades. Una (hosting) te la pregunté porque cambiaba el
stack de forma sustancial; las otras dos no son bloqueantes, así que asumo lo
siguiente y lo dejo explícito:

1. **Hosting**: confirmaste que ya tienes cuenta en **Vercel** pero ninguna
   base de datos provisionada. El stack de abajo está armado sobre eso.
2. **Códigos de los comentarios**: asumo que los comentarios reciben el
   **mismo mecanismo de código de 5 dígitos** que las fichas (para poder
   editar/borrar un comentario propio sin login), por consistencia y porque
   la app no tiene ningún otro control de propiedad para contenido anónimo.
3. **Volumen esperado**: asumo un uso **pequeño-mediano** (un grupo familiar,
   de amigos o de oficina — decenas a un par de cientos de fichas, no miles),
   típico de un evento de temporada. Esto es lo que hace viable el tier
   gratuito de la base de datos. Si esperas un volumen mucho mayor o uso
   recurrente todo el año, dímelo y ajusto la recomendación de base de datos.

---

## 1. Stack tecnológico recomendado

| Capa | Elección | Por qué |
|---|---|---|
| Frontend + Backend | **Next.js (App Router) + React + TypeScript**, desplegado en **Vercel** | Ya tienes cuenta de Vercel; Next.js permite un solo repo con UI, API routes/Server Actions y despliegue sin configuración extra. |
| Estilos / UI | **Tailwind CSS + shadcn/ui** | Mobile-first rápido de maquetar, componentes accesibles listos (formularios, diálogos, badges de alerta para alergias) sin reinventar UI. |
| Base de datos | **Neon Postgres** (Marketplace de Vercel) + **Drizzle ORM** | Postgres serverless, se provisiona con `vercel integration add neon` e inyecta las variables de entorno automáticamente en tu proyecto. Tiene tier gratuito adecuado al volumen esperado. Relacional porque fichas↔comentarios es una relación 1→N clásica. |
| Autenticación Admin + 2FA | **Clerk** (Marketplace de Vercel) | Integración nativa (`vercel integration add clerk`), login usuario/contraseña + **2FA/TOTP incluido de fábrica**, sin construir un sistema de auth a mano. Se restringe a una sola cuenta admin (invitación manual, sin sign-up público). |
| Código de 5 dígitos (fichas/comentarios) | Generado en el servidor, **guardado con hash (bcrypt)** en la base de datos, mostrado en claro **una sola vez** al usuario al crear su ficha/comentario | No es una sesión ni un login: es un secreto de un solo uso que el usuario debe guardar. Igual que una contraseña, nunca se guarda en texto plano. |
| Hosting | **Vercel** (ya lo tienes) | Despliegue directo del repo, Functions para la API, dominio gratuito de Vercel o el tuyo propio. |

### Alternativas consideradas

- **Supabase** en vez de Neon+Clerk: combina Postgres + Auth en un solo
  proveedor. Trade-off: su módulo de Auth está pensado para usuarios con
  cuenta, no encaja tan limpio con "un solo admin con 2FA + público
  anónimo"; terminarías usando su Postgres pero armando el 2FA aparte de
  todos modos. Clerk es más directo para este caso de un admin único.
- **SQLite/Turso** en vez de Neon: más liviano, pero Neon ya es nativo del
  Marketplace de Vercel, tiene tier gratuito suficiente para el volumen
  esperado y evita depender de un proveedor adicional.
- **Recomendación final**: Next.js + Vercel + Neon (Drizzle) + Clerk.

---

## 2. Estructura de carpetas y archivos

```
foro/
├── app/
│   ├── page.tsx                     # Listado principal de fichas (home)
│   ├── fichas/
│   │   ├── nueva/page.tsx           # Formulario de creación de ficha
│   │   └── [id]/page.tsx            # Ficha individual + comentarios
│   ├── admin/
│   │   ├── layout.tsx               # Layout protegido (requiere sesión Clerk)
│   │   ├── login/page.tsx           # Login admin (usuario/contraseña + 2FA, vía Clerk)
│   │   └── page.tsx                 # Panel: listado de fichas/comentarios a moderar
│   └── api/
│       ├── fichas/route.ts          # POST crear ficha, GET listar
│       ├── fichas/[id]/route.ts     # GET detalle, PATCH/DELETE (requiere código)
│       ├── comentarios/route.ts     # POST crear comentario
│       ├── comentarios/[id]/route.ts# PATCH/DELETE (requiere código)
│       └── admin/                   # Endpoints de moderación (requieren sesión Clerk)
├── components/
│   ├── ficha-card.tsx               # Tarjeta resumen en el listado
│   ├── alergia-badge.tsx            # Badge destacado de alergias (reutilizado en toda la app)
│   ├── comentario-list.tsx
│   ├── codigo-reveal.tsx            # Modal/pantalla que muestra el código de 5 dígitos una vez
│   └── ui/                          # Componentes shadcn/ui
├── db/
│   ├── schema.ts                    # Definición de tablas Drizzle (fichas, comentarios)
│   ├── index.ts                     # Conexión lazy a Neon (getDb())
│   └── migrations/                  # Migraciones generadas por drizzle-kit
├── lib/
│   ├── codigo.ts                    # Generar código de 5 dígitos + hash/verificación
│   └── auth.ts                      # Helpers de sesión admin (Clerk)
├── middleware.ts                    # Protege /admin/* con Clerk
├── .env.example                     # Variables de entorno de ejemplo (sin valores reales)
├── drizzle.config.ts
└── package.json
```

---

## 3. Arquitectura general

### Piezas y su relación

- **Ficha**: creada de forma anónima. Al guardarse, el servidor genera un
  código aleatorio de 5 dígitos, lo devuelve **una sola vez** en la
  respuesta (no se puede recuperar después) y guarda solo su hash.
- **Comentario**: cuelga de una ficha (`ficha_id`). Sigue el mismo patrón de
  código de 5 dígitos que la ficha (ver supuesto #2).
- **Admin**: cuenta separada, gestionada por Clerk, con 2FA obligatorio.
  No usa el mecanismo de código de 5 dígitos; su edición/eliminación de
  contenido ajeno se autoriza por sesión, no por código.

### Modelo conceptual de datos

**`fichas`**
| campo | tipo | notas |
|---|---|---|
| id | uuid/serial | PK |
| nombre | text | nombre de quien publica |
| gustos | text | qué le gusta |
| no_gustos | text | qué evitar regalarle |
| alergias | text | **prioridad visual absoluta** en toda la UI |
| codigo_hash | text | hash del código de 5 dígitos, nunca el valor plano |
| creado_en | timestamp | |

**`comentarios`**
| campo | tipo | notas |
|---|---|---|
| id | uuid/serial | PK |
| ficha_id | uuid/serial | FK → fichas.id |
| autor_nombre | text (opcional) | quien comenta puede dejar un nombre o quedar anónimo |
| contenido | text | pregunta o comentario |
| codigo_hash | text | hash del código de 5 dígitos de este comentario |
| creado_en | timestamp | |

**Admin**: no requiere tabla propia; Clerk gestiona la cuenta e identidad.
Si en el futuro hace falta un log de auditoría de moderación, se agregaría
una tabla `moderacion_log` — no incluida ahora por no ser parte del pedido.

### Flujo típico de una petición

1. Alguien entra al listado principal (enlace compartido por WhatsApp) →
   `GET /` renderiza fichas desde Neon.
2. Crea su ficha → `POST /api/fichas` → el servidor genera el código de 5
   dígitos, guarda el hash, responde con el código en claro → el frontend lo
   muestra una única vez con aviso de "guárdalo, no lo podrás ver de nuevo".
3. Otra persona anónima entra a esa ficha y deja un comentario →
   `POST /api/comentarios` → mismo patrón de código de 5 dígitos.
4. Si el dueño de la ficha quiere editarla/borrarla, ingresa su código de 5
   dígitos → el servidor lo compara contra el hash guardado → si coincide,
   autoriza el cambio.
5. Si hay contenido inapropiado o un error, el **Admin** entra por
   `/admin/login` (usuario/contraseña + 2FA vía Clerk) → desde el panel
   puede editar o eliminar cualquier ficha o comentario sin necesitar el
   código de 5 dígitos (autorización por sesión, verificada en
   `middleware.ts` y en cada endpoint de `/api/admin/*`).

---

## 4. Boceto de diseño (wireframe, mobile-first)

### 4.1 Listado principal de fichas (`/`)

```
┌─────────────────────────────┐
│ 🎁 Amigo Secreto             │
│ [+ Crear mi ficha]           │
├─────────────────────────────┤
│ ┌───────────────────────┐   │
│ │ María G.               │   │
│ │ ⚠️ ALERGIA: maní        │   │ ← franja roja fija, siempre visible
│ │ Le gusta: café, libros  │   │   sin necesidad de abrir la ficha
│ │ 3 comentarios →         │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ Juan P.                 │   │
│ │ (sin alergias)          │   │ ← estado explícito, no un vacío ambiguo
│ │ Le gusta: plantas       │   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

### 4.2 Ficha individual + comentarios (`/fichas/[id]`)

```
┌─────────────────────────────┐
│ ← Volver                     │
│ María G.                     │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ ⚠️ ALERGIAS / NO REGALAR ┃ │ ← bloque propio, arriba de todo,
│ ┃ Maní, mariscos           ┃ │   color de alerta, ícono, nunca
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━┛ │   mezclado con "no le gusta"
│ Le gusta: café, libros de... │
│ No le gusta: perfumes fuertes│
├─────────────────────────────┤
│ [✏️ Editar/borrar mi ficha]  │ ← pide el código de 5 dígitos
├─────────────────────────────┤
│ Comentarios (3)              │
│ ┌───────────────────────┐   │
│ │ Anónimo: ¿Chocolate    │   │
│ │ oscuro o con leche?    │   │
│ │            [✏️ / 🗑️]    │   │ ← pide código de 5 dígitos propio
│ └───────────────────────┘   │
│ [Escribir un comentario…]    │
└─────────────────────────────┘
```

### 4.3 Formulario de creación de ficha (`/fichas/nueva`)

```
┌─────────────────────────────┐
│ Crear mi ficha               │
│ Nombre: [____________]       │
│ Me gusta: [___________]      │
│ No me gusta: [_________]     │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ ⚠️ Alergias / intoler.   ┃ │ ← campo separado, siempre visible,
│ ┃ [___________________]   ┃ │   no colapsable, con texto de ayuda
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━┛ │   ("escribe 'ninguna' si no aplica")
│        [Publicar ficha]      │
└─────────────────────────────┘

  ↓ al publicar:

┌─────────────────────────────┐
│ ✅ ¡Ficha creada!             │
│                               │
│   Tu código: 4 8 2 1 9        │
│                               │
│ Guárdalo: es la única forma  │
│ de editar o borrar tu ficha  │
│ más adelante. No se puede    │
│ recuperar si lo pierdes.     │
│        [Copiar código]       │
│        [Entendido, listo]    │
└─────────────────────────────┘
```

### 4.4 Panel de Admin (`/admin`)

```
┌─────────────────────────────┐
│ 🔒 Admin — login             │
│ Usuario: [___________]       │
│ Contraseña: [___________]    │
│        [Continuar]           │
└─────────────────────────────┘
          ↓
┌─────────────────────────────┐
│ 🔒 Verificación en 2 pasos   │
│ Código de tu app de 2FA:     │
│ [_ _ _ _ _ _]                │
│        [Verificar]           │
└─────────────────────────────┘
          ↓ (sesión admin activa)
┌─────────────────────────────┐
│ Panel de moderación           │
│ [Fichas] [Comentarios]        │
│ ┌───────────────────────┐   │
│ │ María G. — 3 coment.   │   │
│ │        [Editar][Borrar]│   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ 💬 "spam spam spam"    │   │
│ │ en ficha de Juan P.    │   │
│ │        [Editar][Borrar]│   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

**Regla de diseño transversal**: la alergia nunca comparte bloque visual con
"no le gusta". Va primero, con su propio color de alerta (rojo/naranja),
ícono ⚠️ y, si está vacía, dice explícitamente "sin alergias registradas" en
vez de omitirse — para que nunca se confunda "no completó el campo" con
"confirmó que no tiene alergias".

---

## Siguiente paso

Si apruebas este plan, la siguiente fase sería:
1. `vercel integration add neon` + `vercel integration add clerk` en el proyecto.
2. Scaffold de Next.js + Drizzle según el árbol de arriba.
3. Implementar primero el flujo anónimo (fichas + código), luego comentarios, luego admin+2FA.

¿Apruebas el stack y la estructura, o quieres ajustar algo antes de seguir?
