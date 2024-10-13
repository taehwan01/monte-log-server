import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Catch(UnauthorizedException)
export class UnauthorizedRedirectFilter implements ExceptionFilter {
  constructor(private readonly configService: ConfigService) {}

  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const clientUrl = this.configService.get<string>('CLIENT_URL');

    // UnauthorizedException 발생 시 리다이렉트
    response.redirect(`${clientUrl}/auth/login/failure`);
  }
}
