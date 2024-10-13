import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Module({
  providers: [RedisService],
  exports: [RedisService], // 다른 모듈에서 사용할 수 있도록 exports
})
export class RedisModule {}
