import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isComboImageRequest =
      request.url.includes('/combos/') && request.url.includes('/image');
    const uploadEntityLabel = isComboImageRequest ? 'Combo' : 'Product';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse() as
        | string
        | { message?: string | string[] };
      message =
        typeof errorResponse === 'string'
          ? errorResponse
          : errorResponse.message ?? exception.message;
    } else if (typeof exception === 'object' && exception !== null) {
      const maybeUploadError = exception as { name?: string; code?: string };

      if (maybeUploadError.name === 'MulterError') {
        status = HttpStatus.BAD_REQUEST;
        message =
          maybeUploadError.code === 'LIMIT_FILE_SIZE'
            ? `${uploadEntityLabel} image must be 3 MB or smaller`
            : `${uploadEntityLabel} image upload is invalid`;
      }
    }

    response.status(status).json({
      success: false,
      error: {
        statusCode: status,
        message,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
