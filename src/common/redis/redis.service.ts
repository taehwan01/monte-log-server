/* monte-log-server/src/common/redis/redis.service.ts */
import { Injectable } from '@nestjs/common';
import { createClient } from 'redis';

@Injectable()
export class RedisService {
  private client;
  private isConnected: boolean;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL, // Redis 연결 URL
      password: process.env.REDIS_PASSWORD, // Redis 비밀번호
    });

    this.client
      .connect()
      .then(() => {
        this.isConnected = true;
        console.log('Redis 연결 성공');
      })
      .catch((err) => {
        this.isConnected = false;
        console.error('Redis 연결 오류:', err);
      });
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis가 연결되지 않았습니다.');
      }
      await this.client.set(key, value, { EX: ttl });
    } catch (err) {
      console.error(`Redis set 오류: ${err.message}`);
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis가 연결되지 않았습니다.');
      }
      return await this.client.get(key);
    } catch (err) {
      console.error(`Redis get 오류: ${err.message}`);
      return null; // 캐시가 없다고 가정하고 null 반환
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis가 연결되지 않았습니다.');
      }
      await this.client.del(key);
    } catch (err) {
      console.error(`Redis del 오류: ${err.message}`);
      // Redis가 실패해도 계속 진행
    }
  }

  async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, matchedKeys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== '0');

    return keys;
  }
}
