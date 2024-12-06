import { Controller, Get, Post, Req } from '@nestjs/common';
import { VisitorService } from './visitor.service';
import { Request } from 'express';

@Controller('visitor')
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  // 방문 기록 API
  @Post()
  async recordVisitor(@Req() req: Request): Promise<void> {
    const ipAddress =
      req.headers['x-forwarded-for'] || req.socket.remoteAddress; // IP 가져오기
    const userAgent = req.headers['user-agent'] || 'unknown'; // User-Agent 가져오기
    const userKey = `${ipAddress}-${userAgent}`; // user_key 생성
    const visitDate = new Date().toISOString().split('T')[0]; // 방문 날짜

    await this.visitorService.logVisit(userKey, visitDate);
  }

  // 방문 통계 조회 API
  @Get('stats')
  async getVisitorStats(): Promise<{
    totalVisitors: number;
    todayVisitors: number;
  }> {
    return await this.visitorService.getStats();
  }
}
