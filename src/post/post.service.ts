import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { CreatePostDto } from './create-post.dto';
import { RedisService } from 'src/common/redis/redis.service';

@Injectable()
export class PostService {
  private supabase;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    // 환경 변수에서 Supabase URL과 API 키를 불러옴
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // async getPosts() {
  //   const { data, error } = await this.supabase.from('post').select('*');
  //   if (error) {
  //     throw new Error(error.message);
  //   }
  //   return data;
  // }
  // 게시글 페이징 조회 메서드 추가
  async getPosts(page: number, limit: number) {
    const offset = (page - 1) * limit;

    // 전체 게시물 수 캐시 확인
    const cachedTotalCount = await this.redisService.get('total_post_count');
    let totalCount: number;

    if (cachedTotalCount) {
      totalCount = Number(cachedTotalCount); // 캐시된 전체 게시물 수가 있으면 사용
    } else {
      // 캐시된 값이 없으면 DB에서 전체 게시물 수 조회 후 캐싱
      const { count } = await this.supabase
        .from('post')
        .select('post_id', { count: 'exact' });

      totalCount = count;

      await this.redisService.set(
        'total_post_count',
        String(totalCount),
        86400,
      ); // 24시간 TTL로 캐싱
    }

    const totalPages = Math.ceil(totalCount / limit);

    // 페이지 1인 경우, 캐시된 게시물 목록을 먼저 확인
    if (page === 1) {
      const cachedPostsPage1 = await this.redisService.get('posts_page_1');
      if (cachedPostsPage1) {
        return {
          posts: JSON.parse(cachedPostsPage1),
          totalPages, // 전체 페이지 수 반환
        };
      }
    }

    // 캐시가 없는 경우 DB에서 게시물 가져오기
    const { data, error } = await this.supabase
      .from('post')
      .select(
        `
        post_id,
        title,
        preview_content,
        created_at,
        thumbnail,
        category:category(name)  -- 카테고리 이름 포함하여 조회
      `,
      )
      .range(offset, offset + limit - 1); // 페이지 번호와 페이지당 게시글 수로 조회

    if (error) {
      throw new Error(error.message);
    }

    // 1페이지 데이터 캐싱 (24시간)
    if (page === 1) {
      await this.redisService.set('posts_page_1', JSON.stringify(data), 86400); // 24시간 캐싱
    }

    return {
      posts: data,
      totalPages,
    };
  }

  async createPost(createPostDto: CreatePostDto, memberId: number) {
    const categoryId = await this.ensureCategoryExists(createPostDto.category);

    const { data, error } = await this.supabase
      .from('post')
      .insert([
        {
          title: createPostDto.title,
          content: createPostDto.content,
          preview_content: createPostDto.preview_content,
          thumbnail: createPostDto.thumbnail,
          member_id: memberId,
          category_id: categoryId,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    console.log('data', data);

    return data;
  }

  private async ensureCategoryExists(category: string): Promise<number> {
    const { data: existingCategory, error: findError } = await this.supabase
      .from('category')
      .select('category_id')
      .eq('name', category)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      // 만약 검색 중 오류가 발생했는데, 그 오류가 카테고리 존재하지 않는 에러가 아니라면 에러 발생
      throw new Error(findError.message);
    }

    if (existingCategory) {
      // 카테고리가 존재하면 category_id 반환
      return existingCategory.category_id;
    }

    // 카테고리가 존재하지 않으면 새로 생성
    const { data: newCategory, error: insertError } = await this.supabase
      .from('category')
      .insert([{ name: category }])
      .select('category_id')
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return newCategory.category_id; // 새로 생성된 카테고리의 ID 반환
  }

  async getPostWithCategoryById(id: number) {
    const { data, error } = await this.supabase
      .from('post')
      .select(
        `
        post_id,
        title,
        content,
        created_at,
        category:category(name)  -- 카테고리 이름 포함하여 조회
      `,
      )
      .eq('post_id', id)
      .single(); // 단일 게시물 조회

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async getPostById(id: number) {
    const { data, error } = await this.supabase
      .from('post')
      .select('*')
      .eq('post_id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  // 좋아요 여부 확인
  async hasLikedPost(postId: number, likeKey: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('likes')
      .select('*')
      .eq('post_id', postId)
      .eq('like_key', likeKey)
      .single();

    if (error) {
      return false; // 에러가 발생하거나 존재하지 않으면 false
    }

    return !!data; // 데이터가 있으면 true, 없으면 false
  }

  async likePost(postId: number, likeKey: string) {
    // 이미 해당 likeKey로 좋아요가 눌렸는지 확인
    const { data: existingLike } = await this.supabase
      .from('likes')
      .select('*')
      .eq('post_id', postId)
      .eq('like_key', likeKey)
      .single();

    if (existingLike) {
      throw new Error('이미 좋아요를 눌렀습니다.');
    }

    // 좋아요 추가
    const { error } = await this.supabase
      .from('likes')
      .insert([{ post_id: postId, like_key: likeKey }]);

    if (error) {
      throw new Error(error.message);
    }
  }

  async cancelLikePost(postId: number, likeKey: string) {
    const { data: existingLike, error } = await this.supabase
      .from('likes')
      .select('*')
      .eq('post_id', postId)
      .eq('like_key', likeKey)
      .single();

    if (!existingLike || error) {
      throw new Error('좋아요를 누른 적이 없습니다.');
    }

    const { error: deleteError } = await this.supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('like_key', likeKey);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  // 좋아요 수를 가져오는 메서드 추가
  async getLikeCount(postId: number) {
    const { count, error } = await this.supabase
      .from('likes')
      .select('*', { count: 'exact' }) // 정확한 카운트 요청
      .eq('post_id', postId);

    if (error) {
      throw new Error(error.message);
    }

    return count;
  }
}
