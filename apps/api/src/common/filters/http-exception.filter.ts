import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const rawResponse =
      exception instanceof HttpException ? exception.getResponse() : "Internal server error";

    const message = this.normalizeMessage(rawResponse, status);

    response.status(status).json({
      error: {
        statusCode: status,
        code: this.codeFromStatus(status),
        message
      },
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    });
  }

  private normalizeMessage(rawResponse: unknown, status: number) {
    if (typeof rawResponse === "string") {
      return rawResponse;
    }

    if (rawResponse && typeof rawResponse === "object") {
      const candidate = rawResponse as { message?: string | string[] };
      if (Array.isArray(candidate.message)) {
        return candidate.message.join(", ");
      }
      if (typeof candidate.message === "string") {
        return candidate.message;
      }
    }

    return status === HttpStatus.INTERNAL_SERVER_ERROR ? "Internal server error" : "Request failed";
  }

  private codeFromStatus(status: number) {
    if (status === HttpStatus.UNAUTHORIZED) {
      return "UNAUTHORIZED";
    }
    if (status === HttpStatus.FORBIDDEN) {
      return "FORBIDDEN";
    }
    if (status === HttpStatus.NOT_FOUND) {
      return "NOT_FOUND";
    }
    if (status === HttpStatus.BAD_REQUEST) {
      return "BAD_REQUEST";
    }
    return "REQUEST_FAILED";
  }
}
