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
