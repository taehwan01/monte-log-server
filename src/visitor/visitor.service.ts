import { Injectable } from '@nestjs/common';
import { VisitorRepository } from './visitor.repository';
import { RedisService } from 'src/common/redis/redis.service';

@Injectable()
export class VisitorService {
  constructor(
    private readonly visitorRepository: VisitorRepository,
    private readonly redisService: RedisService,
  ) {}

  // 방문 기록 메서드
  async logVisit(userKey: string, visitDate: string): Promise<void> {
    const cacheKey = `visitor:${userKey}:${visitDate}`;
    const alreadyVisited = await this.redisService.get(cacheKey);

    // Redis에서 이전 방문이 확인되지 않으면 방문 실행
    if (!alreadyVisited) {
      await this.visitorRepository.addVisit(userKey, visitDate);
      await this.redisService.set(cacheKey, '1', 86400);
    }
  }

  // 방문 통계 조회 메서드
  async getStats(): Promise<{ totalVisitors: number; todayVisitors: number }> {
    const visitDate = new Date().toISOString().split('T')[0];

    const totalVisitors = await this.visitorRepository.getTotalVisitors();
    const todayVisitors =
      await this.visitorRepository.getTodayVisitors(visitDate);

    return { totalVisitors, todayVisitors };
  }
}
