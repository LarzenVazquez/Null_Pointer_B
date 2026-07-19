/**
 * Error de aplicación con código HTTP asociado.
 * Los controllers/services lanzan ApiError y el errorHandler central
 * se encarga de convertirlo en una respuesta JSON consistente,
 * sin filtrar detalles internos (stack, mensajes de Prisma, etc.).
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly detalles?: unknown;

  constructor(statusCode: number, message: string, detalles?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.detalles = detalles;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = "Solicitud inválida", detalles?: unknown) {
    return new ApiError(400, msg, detalles);
  }
  static noAutorizado(msg = "No autenticado") {
    return new ApiError(401, msg);
  }
  static prohibido(msg = "No tienes permisos para realizar esta acción") {
    return new ApiError(403, msg);
  }
  static noEncontrado(msg = "Recurso no encontrado") {
    return new ApiError(404, msg);
  }
  static conflicto(msg = "El recurso ya existe") {
    return new ApiError(409, msg);
  }
  static demasiadosIntentos(msg = "Demasiados intentos, inténtalo más tarde") {
    return new ApiError(429, msg);
  }
  static interno(msg = "Error interno del servidor") {
    return new ApiError(500, msg);
  }
}
