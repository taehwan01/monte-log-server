import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service'; // Redis 서비스 가져오기
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    const sessionIdKey = this.configService.get<string>('SESSION_ID_KEY');
    const sessionId = request.cookies[sessionIdKey]; // 쿠키에서 세션 ID 가져오기

    if (!sessionId) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }

    const user = await this.redisService.get(sessionId); // Redis에서 세션 조회

    if (!user) {
      throw new UnauthorizedException('세션이 만료되었거나 유효하지 않습니다.');
    }

    request.user = JSON.parse(user); // 요청에 사용자 정보 저장 (추가 가능)
    return true;
  }
}
