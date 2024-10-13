import { Injectable } from '@nestjs/common';
import { createClient } from 'redis';

@Injectable()
export class RedisService {
  private client;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL, // Redis 연결 URL
      password: process.env.REDIS_PASSWORD, // Redis 비밀번호
    });

    this.client
      .connect()
      .catch((err) => console.error('Redis 연결 오류:', err));
  }

  // 세션을 Redis에 저장
  async set(key: string, value: string, ttl: number): Promise<void> {
    await this.client.set(key, value, { EX: ttl }); // TTL (초 단위)
  }

  // 세션을 Redis에서 가져오기
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  // 세션을 Redis에서 삭제하기
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
