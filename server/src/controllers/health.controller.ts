import { Request, Response } from 'express';
import { HealthStatusResponse } from '../types';

export const getHealth = (_req: Request, res: Response<HealthStatusResponse>): void => {
  res.status(200).json({
    status: 'POLARIS API running',
  });
};
