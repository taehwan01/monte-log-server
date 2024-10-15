import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  NotFoundException,
  Param,
} from '@nestjs/common';
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

  // 상세 조회 API
  @Get(':id') // 게시물 ID로 조회
  async getPostById(@Param('id') id: number) {
    const post = await this.postService.getPostById(id);
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    return post;
  }
}
