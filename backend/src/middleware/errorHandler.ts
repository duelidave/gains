import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../errors/ApiError';

export { ApiError };

const STATUS_TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

export function sendProblem(
  res: Response,
  status: number,
  detail: string,
  instance: string,
): void {
  res
    .status(status)
    .contentType('application/problem+json')
    .json({
      type: 'about:blank',
      title: STATUS_TITLES[status] || 'Error',
      status,
      detail,
      instance,
    });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err instanceof ApiError ? err.status : 500;
  const detail = status === 500 ? 'Internal server error' : err.message;

  console.error(`Error [${status}]:`, err.message);

  sendProblem(res, status, detail, req.originalUrl);
}
