import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

type Fuente = "body" | "params" | "query";

export function validate(schema: AnyZodObject, fuente: Fuente = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[fuente]);
      (req as any)[fuente] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const detalles = err.issues.map((i) => ({
          campo: i.path.join("."),
          mensaje: i.message,
        }));
        return next(
          ApiError.badRequest("Datos de entrada inválidos", detalles)
        );
      }
      next(err);
    }
  };
}
