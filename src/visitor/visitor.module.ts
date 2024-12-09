import { Module } from '@nestjs/common';
import { RedisModule } from 'src/common/redis/redis.module';
import { VisitorService } from './visitor.service';
import { VisitorController } from './visitor.controller';
import { VisitorRepository } from './visitor.repository';

@Module({
  imports: [RedisModule],
  providers: [VisitorService, VisitorRepository, VisitorModule],
  controllers: [VisitorController],
})
export class VisitorModule {}
