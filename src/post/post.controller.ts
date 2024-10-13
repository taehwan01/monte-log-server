import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './create-post.dto';
import { AuthGuard } from '../common/guard/auth.guard';
import { Request } from 'express';
import { User } from 'src/common/interface/user.interface';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  async getPosts() {
    return this.postService.getPosts();
  }

  @Post()
  @UseGuards(AuthGuard)
  async createPost(
    @Body() createPostDto: CreatePostDto,
    @Req() req: Request & { user: User },
  ) {
    const memberId = req.user.memberId;
    return this.postService.createPost(createPostDto, memberId); // 서비스에서 글 생성
  }
}

// todo: 상세 조회 페이지
