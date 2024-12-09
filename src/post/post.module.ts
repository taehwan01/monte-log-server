import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { RedisModule } from 'src/common/redis/redis.module';
import { PostScheduler } from './post.scheduler';

@Module({
  imports: [RedisModule],
  providers: [PostService, PostScheduler],
  controllers: [PostController],
})
export class PostModule {}
