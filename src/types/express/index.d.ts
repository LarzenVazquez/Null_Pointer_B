// Extiende el tipo Request de Express para incluir al usuario autenticado
// que el middleware de auth adjunta tras validar el JWT.

export interface UsuarioAutenticado {
  id: number;
  email: string;
  nombre: string;
  roles: string[];
  permisos: string[];
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

export {};
