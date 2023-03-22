import { HttpException } from '@nestjs/common';
import type { ErrorCode } from '@saasforge/shared';

export class AppError extends HttpException {
  readonly code: ErrorCode;

  constructor(statusCode: number, code: ErrorCode, message: string) {
    super({ statusCode, code, message }, statusCode);
    this.code = code;
  }
}
