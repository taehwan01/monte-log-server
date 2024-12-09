import { Injectable } from '@nestjs/common';
import { VisitorRepository } from './visitor.repository';
import { RedisService } from 'src/common/redis/redis.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class VisitorService {
  constructor(
    private readonly visitorRepository: VisitorRepository,
    private readonly redisService: RedisService,
  ) {}

  async logVisit(userKey: string, visitDate: string): Promise<void> {
    const cacheKey = `visitor:${userKey}:${visitDate}`;
    const alreadyVisited = await this.redisService.get(cacheKey);

    if (!alreadyVisited) {
      await this.visitorRepository.addVisit(userKey, visitDate);
      await this.redisService.set(cacheKey, '1', 86400);
    }
  }

  async getStats(): Promise<{ totalVisitors: number; todayVisitors: number }> {
    const visitDate = new Date().toISOString().split('T')[0];

    const totalVisitors = await this.visitorRepository.getTotalVisitors();
    const todayVisitors =
      await this.visitorRepository.getTodayVisitors(visitDate);

    return { totalVisitors, todayVisitors };
  }

  async clearAllDailyVisits(): Promise<void> {
    const keys = await this.redisService.scanKeys('visitor:*');
    for (const key of keys) {
      await this.redisService.del(key);
    }
  }
}
