import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid'; // UUID로 세션 ID 생성
import { RedisService } from '../common/redis/redis.service'; // Redis 서비스 사용

@Injectable()
export class AuthService {
  constructor(private readonly redisService: RedisService) {}

  // 세션을 생성하고 Redis에 저장하는 메서드
  async createSession(user: any): Promise<{ sessionId: string }> {
    const sessionId = uuidv4(); // 세션 ID 생성

    // 사용자 세션 정보를 Redis에 저장 (세션 ID를 키로 사용)
    await this.redisService.set(sessionId, JSON.stringify(user), 600); // 10분 동안 유지

    return { sessionId };
  }

  // 세션 ID로 Redis에서 사용자 정보를 가져오는 메서드
  async getSession(sessionId: string): Promise<any> {
    const user = await this.redisService.get(sessionId);

    if (user) {
      return JSON.parse(user);
    }
  }

  // 세션 ID로 Redis에서 사용자 정보를 삭제하는 메서드
  async deleteSession(sessionId: string): Promise<void> {
    await this.redisService.del(sessionId);
  }
}
