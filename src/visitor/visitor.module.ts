import { Module } from '@nestjs/common';
import { RedisModule } from 'src/common/redis/redis.module';
import { VisitorService } from './visitor.service';
import { VisitorController } from './visitor.controller';
import { VisitorRepository } from './visitor.repository';
import { SupabaseModule } from 'src/common/supabase/supabase.module';

@Module({
  imports: [RedisModule, SupabaseModule],
  providers: [VisitorService, VisitorRepository, VisitorModule],
  controllers: [VisitorController],
})
export class VisitorModule {}
