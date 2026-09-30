export interface UsuarioAutenticado {
  id: number;
  email: string;
  nombre: string;
  roles: string[];
  permisos: string[];
}

/** Reloj autenticado mediante el header X-Device-Token. */
export interface DispositivoAutenticado {
  id: number;
  usuarioId: number;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
      dispositivo?: DispositivoAutenticado;
    }
  }
}

export {};
