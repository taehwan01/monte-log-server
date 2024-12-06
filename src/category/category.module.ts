import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { RedisModule } from 'src/common/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [CategoryService],
  controllers: [CategoryController],
})
export class CategoryModule {}
