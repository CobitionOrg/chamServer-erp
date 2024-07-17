import { HttpException, HttpStatus } from '@nestjs/common';

export class CustomUnauthorizedException extends HttpException {
  constructor(response: any) {
    super(response, HttpStatus.UNAUTHORIZED);
  }
}