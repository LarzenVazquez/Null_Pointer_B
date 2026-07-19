# Integración con el frontend Angular

**Estado: implementada.** El frontend (`frontend-angular.zip`) ya está conectado
a este backend vía HTTP real. Resumen de lo que se hizo:

- `AuthService` (`core/services/auth.service.ts`) llama a `/api/auth/login`,
  `/api/auth/registro`, `/api/auth/refresh`, `/api/auth/logout`,
  `/api/auth/perfil` con `HttpClient`. El access token vive en `localStorage`
  (lo lee `auth.interceptor.ts` y lo manda como `Authorization: Bearer`); el
  refresh token vive en la cookie httpOnly que pone el backend.
- Al arrancar la app, `AuthService` intenta un refresh silencioso contra
  `/api/auth/refresh` para restaurar la sesión si la cookie sigue viva.
- `models/user.model.ts` usa los 3 roles reales (`Administrador`, `Editor`,
  `Usuario`) e `id: number`, igual que el backend.
- `services/evento-calendario.service.ts` consume `/api/eventos`,
  `/api/eventos/activo?fecha=` y `/api/eventos/:tipo` — la barra "Simular
  fecha" del home ahora llama al backend en cada clic.
- El panel `/admin` acepta tanto Administrador como Editor; las secciones
  sensibles (Usuarios, Mensajes, Eventos, Reportes) quedan restringidas
  solo a Administrador vía `roleGuard('Administrador')` en `app.routes.ts`
  — control de acceso "de cortesía" en el cliente, el real lo hace el
  backend en cada endpoint.

## Cómo correr ambos proyectos juntos

**Terminal 1 — backend:**
```bash
cd backend-auth
npm install
cp .env.example .env   # ajusta DATABASE_URL si hace falta
npx prisma migrate dev
npx prisma generate
npx prisma db seed
npm run dev             # http://localhost:3000
```

**Terminal 2 — frontend:**
```bash
cd frontend-angular
npm install
npm start                # ng serve, http://localhost:4200
```

Con ambos corriendo, entra a `http://localhost:4200`, inicia sesión con
`[email protected]` / `Admin123!` (usuario sembrado por el seed) y prueba
el flujo completo: registro, login, panel según rol, cambio de rol desde
`/admin/usuarios`, y la barra de eventos en el home.

## Notas / limitaciones conocidas

- `recoverPassword()` en el frontend sigue siendo un stub: no hay envío
  real de correo (el backend no tiene ese endpoint). Queda fuera del
  alcance de la práctica de autenticación con roles/permisos.
- Los módulos de **reservas, salas, favoritos y mensajes** siguen siendo
  mocks en `localStorage` (no forman parte del alcance de la práctica);
  por eso sus IDs de usuario se convierten con `String(...)` al leer
  `auth.currentUser()?.id`, ya que ese módulo espera IDs tipo `string`
  mientras que el usuario real del backend usa `id: number`.
