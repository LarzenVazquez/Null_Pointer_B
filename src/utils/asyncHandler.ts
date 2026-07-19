import { NextFunction, Request, Response } from "express";

type HandlerAsync = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

/**
 * Envuelve un controller async para capturar cualquier excepción
 * (incluidas las de promesas rechazadas) y pasarla a next(err),
 * donde el error middleware la maneja de forma centralizada.
 */
export const asyncHandler =
  (fn: HandlerAsync) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
