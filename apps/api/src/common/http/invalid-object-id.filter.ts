import { ArgumentsHost, BadRequestException, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

/**
 * IDs malformados (ex.: `new Types.ObjectId('abc')` ou cast do Mongoose)
 * viravam 500 Internal Server Error. Normaliza para 400 Bad Request.
 */
@Catch()
export class InvalidObjectIdFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const name = (exception as Error | undefined)?.name;
    if (name === 'BSONError' || name === 'CastError') {
      super.catch(new BadRequestException('Identificador invalido.'), host);
      return;
    }

    super.catch(exception, host);
  }
}
