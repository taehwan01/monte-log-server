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

  // 게시글 페이징 조회 API
  @Get()
  async getPosts(@Req() req: Request) {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    return this.postService.getPosts(page, limit);
  }

  // 게시글 생성 API
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
    const post = await this.postService.getPostWithCategoryById(id);
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    return post;
  }

  // 좋아요 여부 확인 API
  @Get(':id/like-status')
  async checkLikeStatus(@Param('id') postId: number, @Req() req: Request) {
    const post = await this.postService.getPostById(postId);
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    // IP 주소 가져오기
    const ipAddress =
      req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // User-Agent 정보 가져오기
    const userAgent = req.headers['user-agent'];

    // 고유한 likeKey 생성 (IP와 User-Agent 결합)
    const likeKey = `${ipAddress}-${userAgent}`;

    // 좋아요 여부 확인 서비스 호출
    const hasLiked = await this.postService.hasLikedPost(postId, likeKey);

    return { hasLiked }; // true/false 반환
  }

  // 게시글 좋아요 API
  @Post(':id/like')
  async likePost(@Param('id') postId: number, @Req() req: Request) {
    const post = await this.postService.getPostById(postId);
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    // IP 주소 가져오기
    const ipAddress =
      req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // User-Agent 정보 가져오기
    const userAgent = req.headers['user-agent'];

    // 고유한 likeKey 생성 (IP와 User-Agent 결합)
    const likeKey = `${ipAddress}-${userAgent}`;

    // 좋아요 처리 서비스 호출
    await this.postService.likePost(postId, likeKey);

    return { message: '좋아요가 반영되었습니다.' };
  }

  // 게시글 좋아요 취소 API
  @Post(':id/cancel-like')
  async cancelLikePost(@Param('id') postId: number, @Req() req: Request) {
    const post = await this.postService.getPostById(postId);
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    // IP 주소와 User-Agent 정보 가져오기
    const ipAddress =
      req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const likeKey = `${ipAddress}-${userAgent}`;

    // 좋아요 취소 처리
    await this.postService.cancelLikePost(postId, likeKey);

    return { message: '좋아요가 취소되었습니다.' };
  }

  @Get(':id/like-count')
  async getLikeCount(@Param('id') postId: number) {
    const post = await this.postService.getPostById(postId);
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    const likeCounts = await this.postService.getLikeCount(postId); // 좋아요 수 가져오기
    return { likeCounts };
  }
}
