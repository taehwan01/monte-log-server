import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { RedisModule } from 'src/common/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [PostService],
  controllers: [PostController],
})
export class PostModule {}
