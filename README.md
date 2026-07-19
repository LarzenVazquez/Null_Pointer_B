# Backend de Autenticación y Autorización — Prácticas 9 y 10

Sistema de autenticación con **roles y permisos (RBAC)** sobre **Node.js +
Express + TypeScript + Prisma + PostgreSQL**, más una API pública para la
barra de **temas de evento por tiempo** (Navidad, Año Nuevo, Día de
Muertos, Halloween, San Valentín).

---

## 1. Requisitos

- Node.js 18+
- PostgreSQL 14+ corriendo localmente (o accesible por red)
- Una base de datos vacía creada, ej: `nullpointer_bd`

## 2. Instalación

```bash
npm install

# copia y ajusta tus variables de entorno
cp .env.example .env

# crea las tablas en PostgreSQL a partir del schema de Prisma
npx prisma migrate dev --name init

# genera el cliente de Prisma (tipado)
npx prisma generate

# siembra roles, permisos y el usuario administrador por defecto
npx prisma db seed

# levanta el servidor en modo desarrollo (con recarga automática)
npm run dev
```

El servidor queda escuchando en `http://localhost:3000` (o el `PORT` que
hayas configurado). Puedes verificar que está vivo con:

```bash
curl http://localhost:3000/health
```

### Usuario administrador por defecto (creado por el seed)

```
email:    [email protected]
password: Admin123!
```

---

## 3. Arquitectura del backend

```
src/
├── server.ts                 # entry point: levanta Express, conecta a la BD
├── app.ts                    # configuración de Express (CORS, helmet, rutas)
├── config/env.ts             # lectura y validación de variables de entorno
├── lib/prisma.ts             # instancia única de PrismaClient
├── types/express/index.d.ts  # extiende Request con `req.usuario`
├── utils/
│   ├── ApiError.ts           # errores tipados con status HTTP
│   ├── asyncHandler.ts       # wrapper para controllers async
│   ├── jwt.utils.ts          # firma/verifica access tokens (JWT)
│   └── refreshToken.utils.ts # genera/hashea refresh tokens opacos
├── middlewares/
│   ├── auth.middleware.ts    # requireAuth / optionalAuth (valida JWT)
│   ├── rbac.middleware.ts    # requireRole / requirePermission / requireSelfOrRole
│   ├── rateLimit.middleware.ts # bloqueo temporal tras fuerza bruta en login
│   ├── validate.middleware.ts  # valida body/params/query con Zod
│   └── error.middleware.ts   # 404 + manejo centralizado de errores
├── validators/                # esquemas Zod (auth, usuarios)
├── services/                  # lógica de negocio (auth, usuarios, eventos)
├── controllers/                # controllers HTTP (delgados, delegan a services)
└── routes/                     # definición de endpoints por módulo
```

**Flujo de una petición protegida:**
`request → CORS/helmet → express.json → requireAuth (valida JWT) →
requireRole/requirePermission (RBAC) → validate (Zod) → controller →
service → Prisma → PostgreSQL`

Cualquier error lanzado en cualquier punto de esa cadena (`throw
ApiError...` o una excepción de Prisma) cae en `errorHandler`, que
responde siempre con el mismo formato:

```json
{ "ok": false, "mensaje": "...", "detalles": [] }
```

---

## 4. Modelo de datos (resumen)

| Tabla         | Propósito                                              |
|---------------|---------------------------------------------------------|
| `usuarios`    | credenciales (password ya hasheada con bcrypt) y datos básicos |
| `roles`       | Administrador, Editor, Usuario                          |
| `permisos`    | acciones granulares, ej. `usuarios.crear`, `salas.editar` |
| `usuario_rol` | relación N:M usuario ↔ rol                              |
| `rol_permiso` | relación N:M rol ↔ permiso                              |
| `sesiones`    | refresh tokens activos (permite invalidar sesiones)      |

El diagrama entidad-relación se genera fácilmente desde `prisma/schema.prisma`
con `npx prisma studio` (para explorarlo visualmente) o exportando el schema
a una herramienta como dbdiagram.io / draw.io para la evidencia del ERD.

---

## 5. Seguridad implementada (Parte 4 de la práctica)

- **Hash de contraseñas**: bcrypt con salt (`BCRYPT_SALT_ROUNDS`, 10 por defecto). Nunca se guarda ni se devuelve la contraseña en texto plano.
- **Access token (JWT) de corta vida** (15 min) enviado en `Authorization: Bearer <token>`, con roles y permisos incrustados para no golpear la BD en cada request.
- **Refresh token opaco** (no JWT) de 256 bits, guardado **hasheado (sha256)** en la tabla `sesiones`, entregado al cliente en una **cookie httpOnly, sameSite=lax** — inaccesible desde JavaScript, mitigando robo por XSS.
- **Rotación de refresh tokens**: cada `/api/auth/refresh` invalida el token usado y emite uno nuevo. Permite además "logout en todos los dispositivos" (`/api/auth/logout-todos`).
- **Validación de sesiones**: cada refresh se valida contra la tabla `sesiones` (existe, `valida = true`, no expiró, usuario sigue `activo`).
- **Protección contra acceso directo por URL**: todas las rutas sensibles pasan por `requireAuth` + `requireRole`/`requirePermission` en el propio backend — no dependen de que el frontend "esconda" un botón o una ruta. Aunque alguien golpee la URL directo con curl/Postman sin sesión válida, recibe 401/403.
- **Manejo adecuado de errores de autenticación**: mensajes genéricos que no revelan si falló el email o el password; sin stack traces ni errores internos de Prisma expuestos al cliente; rate limiting anti fuerza bruta en `/api/auth/login`.
- **Cabeceras HTTP seguras** vía `helmet` y **CORS restringido** al origen exacto del frontend.

---

## 6. Endpoints

### 6.1 Autenticación — `/api/auth`

| Método | Ruta                  | Auth | Descripción |
|--------|-----------------------|------|-------------|
| POST   | `/api/auth/registro`  | No   | Crea un usuario nuevo con rol `Usuario` |
| POST   | `/api/auth/login`     | No   | Valida credenciales, retorna `accessToken` + cookie de refresh |
| POST   | `/api/auth/refresh`   | Cookie | Rota el refresh token, emite un nuevo access token |
| POST   | `/api/auth/logout`    | Cookie | Invalida la sesión actual |
| POST   | `/api/auth/logout-todos` | Bearer | Invalida TODAS las sesiones del usuario |
| GET    | `/api/auth/perfil`    | Bearer | Datos del usuario autenticado + roles/permisos |
| PUT    | `/api/auth/perfil`    | Bearer | Autoedición: el usuario cambia SU propio `nombre`/`telefono` (no roles) |

```bash
# Registro
curl -X POST http://localhost:3000/api/auth/registro \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Juan Pérez","email":"[email protected]","password":"Clave123"}'

# Login (guarda cookies para poder usar refresh/logout después)
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"[email protected]","password":"Admin123!"}'

# Perfil (usa el accessToken devuelto por el login)
curl http://localhost:3000/api/auth/perfil \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# Refrescar el access token usando la cookie
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/auth/refresh

# Logout
curl -b cookies.txt -X POST http://localhost:3000/api/auth/logout
```

### 6.2 Usuarios (RBAC) — `/api/usuarios` (todo requiere Bearer token)

| Método | Ruta                    | Permiso/Rol requerido      |
|--------|-------------------------|------------------------------|
| GET    | `/api/usuarios`         | permiso `usuarios.ver`      |
| GET    | `/api/usuarios/:id`     | permiso `usuarios.ver`      |
| POST   | `/api/usuarios`         | permiso `usuarios.crear`    |
| PUT    | `/api/usuarios/:id`     | permiso `usuarios.editar`   |
| DELETE | `/api/usuarios/:id`     | permiso `usuarios.eliminar` |
| PATCH  | `/api/usuarios/:id/rol` | rol `Administrador`         |

```bash
curl http://localhost:3000/api/usuarios \
  -H "Authorization: Bearer <ACCESS_TOKEN_ADMIN>"

curl -X PATCH http://localhost:3000/api/usuarios/3/rol \
  -H "Authorization: Bearer <ACCESS_TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"rol":"Editor"}'
```

### 6.3 Módulos de ejemplo (evidencia directa de control de acceso) — `/api/modulos`

| Método | Ruta                    | Rol requerido |
|--------|-------------------------|----------------|
| GET    | `/api/modulos/administrador` | Administrador |
| GET    | `/api/modulos/editor`        | Administrador, Editor |
| GET    | `/api/modulos/usuario`       | Administrador, Editor, Usuario (cualquiera autenticado) |

Ideal para tus capturas: loguéate con cada rol y muestra el `200 OK` para
su módulo permitido y el `403 Forbidden` al intentar entrar a uno que no
le corresponde.

```bash
# Con token de un usuario con rol "Usuario" intentando entrar al panel de Admin
curl -i http://localhost:3000/api/modulos/administrador \
  -H "Authorization: Bearer <ACCESS_TOKEN_USUARIO>"
# -> 403 Forbidden
```

### 6.4 Eventos estacionales (barra de temas) — `/api/eventos` (público, sin auth)

| Método | Ruta                     | Descripción |
|--------|--------------------------|-------------|
| GET    | `/api/eventos`           | Lista todos los temas configurados |
| GET    | `/api/eventos/activo?fecha=YYYY-MM-DD` | Evento activo para esa fecha (o "hoy" si se omite) |
| GET    | `/api/eventos/:tipo`     | Detalle de un tema puntual (`navidad`, `halloween`, etc.) |

```bash
# Evento activo hoy
curl http://localhost:3000/api/eventos/activo

# Simular la barra "Simular fecha" -> botón "Navidad"
curl "http://localhost:3000/api/eventos/activo?fecha=2026-12-25"

# Simular botón "Halloween"
curl "http://localhost:3000/api/eventos/activo?fecha=2026-10-31"

# Listado completo (para pintar los botones de la barra)
curl http://localhost:3000/api/eventos
```

Esto reemplaza la lógica que antes vivía únicamente en
`evento-calendario.service.ts` del frontend (hardcodeada en el cliente),
permitiendo que la barra "Simular fecha" consuma un endpoint real. Ver
`docs/integracion-frontend.md` para cómo conectarla desde Angular sin
romper la app actual.

---

## 7. Roles y permisos sembrados por `prisma/seed.ts`

| Rol             | Permisos |
|------------------|----------|
| **Administrador** | todos los permisos |
| **Editor**        | `usuarios.ver`, `salas.ver`, `salas.crear`, `salas.editar`, `reservas.ver`, `reservas.crear` |
| **Usuario**        | `salas.ver`, `reservas.ver`, `reservas.crear` |

---

## 8. Evidencias sugeridas para la entrega

1. **Código fuente**: esta carpeta completa (`prisma/` + `src/`).
2. **Modelo entidad-relación**: `npx prisma studio` o exporta el `schema.prisma` a un diagramador.
3. **Capturas de funcionamiento**: usa los `curl` de arriba (o Postman/Insomnia) mostrando:
   - Registro y login exitoso.
   - Login fallido (credenciales incorrectas) → mensaje genérico.
   - Acceso a `/api/usuarios` sin token → 401.
   - Acceso a `/api/modulos/administrador` con rol `Usuario` → 403.
   - Acceso exitoso a cada módulo con el rol correcto.
   - `GET /api/eventos/activo?fecha=2026-12-25` mostrando el tema de Navidad.
4. **Video demostrativo (máx. 5 min)**: recorre el flujo — registro → login → ver perfil → intentar entrar a un módulo restringido (falla) → loguearte como admin → cambiar el rol de un usuario → mostrar la barra de eventos cambiando de tema.
