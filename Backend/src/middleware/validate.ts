import { NextFunction, Request, Response } from 'express';

export const isPositiveInt = (value: unknown) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 && n <= 2_147_483_647;
};

/** router.param handler: reject non-numeric doctor ids with 400 instead of a database error. */
export const validateDoctorIdParam = (_req: Request, res: Response, next: NextFunction, value: string) => {
    if (!isPositiveInt(value)) return res.status(400).json({ error: 'Invalid doctor id' });
    next();
};
