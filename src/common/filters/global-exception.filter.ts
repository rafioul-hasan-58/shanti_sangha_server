import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

interface ErrorMessage {
  path: string;
  message: string;
}
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong';
    let errorMessages: ErrorMessage[] = [];

    if (exception instanceof ZodError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Validation Error';
      errorMessages = exception.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = this.mapPrismaError(exception);
      statusCode = mapped.statusCode;
      message = mapped.message;
      errorMessages = mapped.errorMessages;
    } else if (exception instanceof MulterError) {
      if (exception.code === 'LIMIT_FILE_SIZE') {
        statusCode = HttpStatus.PAYLOAD_TOO_LARGE;
        message = 'File size exceeds 2 MB limit';
        errorMessages = [{ path: 'file', message }];
      } else {
        statusCode = HttpStatus.BAD_REQUEST;
        message = exception.message;
        errorMessages = [{ path: 'file', message }];
      }
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const resObj = res as Record<string, unknown>;
        if (typeof resObj.message === 'string') {
          message = resObj.message;
        } else if (Array.isArray(resObj.message)) {
          message = resObj.message.join(', ');
        } else {
          message = exception.message;
        }
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errorMessages,
      timestamp: new Date().toISOString(),
    });
  }
  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError) {
    console.log('exception', exception);
    switch (exception.code) {
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          errorMessages: [{ path: '', message: 'Record not found' }],
        };
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Unique constraint failed',
          errorMessages: [
            {
              path: (exception.meta?.target as string[])?.join(', ') ?? '',
              message: 'Already exists',
            },
          ],
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Foreign key constraint failed',
          errorMessages: [
            { path: '', message: 'Related record constraint violated' },
          ],
        };
      case 'P2023':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid ID format',
          errorMessages: [{ path: '', message: 'Invalid MongoDB ObjectId' }],
        };
      default:
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Database request error',
          errorMessages: [{ path: '', message: exception.message }],
        };
    }
  }
}
