import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { VisitorService } from './visitor.service';

@Injectable()
export class VisitorScheduler {
  constructor(private readonly visitorService: VisitorService) {}

  @Cron('0 0 * * *') // 매일 자정 실행
  async resetDailyVisits(): Promise<void> {
    await this.visitorService.clearAllDailyVisits();
    console.log('방문 기록 초기화 완료');
  }
}
