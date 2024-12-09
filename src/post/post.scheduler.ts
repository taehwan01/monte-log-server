import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PostService } from './post.service';

@Injectable()
export class PostScheduler {
  constructor(private readonly postService: PostService) {}

  @Cron('0 0 * * * *') // 매분 0초마다 실행
  async refreshPostCache() {
    await this.postService.refreshPostCache();
    console.log('Redis posts_page_1 캐시 갱신');
  }
}
