import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { CreatePostDto } from './create-post.dto';
import { RedisService } from 'src/common/redis/redis.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class PostService {
  private supabase;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    // 환경 변수에서 Supabase URL과 API 키를 불러옴
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // 게시글 페이징 조회 메서드 추가
  async getPosts(page: number, limit: number) {
    const offset = (page - 1) * limit;

    // Redis 연결 상태 확인
    // const isRedisConnected = this.redisService.

    let cachedTotalCount: string | null = null;
    let totalCount: number;

    // Redis가 연결된 경우에만 캐시 시도
    // if (isRedisConnected) {
    try {
      cachedTotalCount = await this.redisService.get('total_post_count');
    } catch (err) {
      console.error('Redis에서 total_post_count 가져오기 실패:', err.message);
    }
    // }

    if (cachedTotalCount) {
      totalCount = Number(cachedTotalCount); // 캐시된 전체 게시물 수가 있으면 사용
    } else {
      // 캐시된 값이 없으면 DB에서 전체 게시물 수 조회 후 캐싱
      const { count, error } = await this.supabase
        .from('post')
        .select('post_id', { count: 'exact' });

      if (error) {
        throw new Error(`게시물 수 조회 오류: ${error.message}`);
      }

      totalCount = count;

      // Redis가 연결된 경우에만 캐싱
      // if (isRedisConnected) {
      try {
        await this.redisService.set(
          'total_post_count',
          String(totalCount),
          3600,
        ); // 1시간 TTL로 캐싱
      } catch (err) {
        console.error('Redis에 total_post_count 캐싱 실패:', err.message);
      }
      // }
    }

    const totalPages = Math.ceil(totalCount / limit);

    // 페이지 1인 경우, Redis가 연결된 경우에만 캐시된 게시물 목록 확인
    if (page === 1) {
      let cachedPostsPage1: string | null = null;

      try {
        cachedPostsPage1 = await this.redisService.get('posts_page_1');
      } catch (err) {
        console.error('Redis에서 posts_page_1 가져오기 실패:', err.message);
      }

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
        category:category(name),
        like_count:likes(count)[0]
      `,
      )
      .order('post_id', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`게시물 조회 오류: ${error.message}`);
    }

    // 페이지 1인 경우, Redis가 연결된 경우에만 캐싱
    if (page === 1) {
      try {
        await this.redisService.set('posts_page_1', JSON.stringify(data), 3600); // 1시간 TTL로 캐싱
      } catch (err) {
        console.error('Redis에 posts_page_1 캐싱 실패:', err.message);
      }
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

    // 게시글 생성하고 Redis 캐시 삭제
    try {
      await this.redisService.del('posts_page_1');
      await this.redisService.del('total_post_count');
    } catch (err) {
      console.error('Redis 캐시 갱신 실패:', err.message);
    }

    return data;
  }

  // 게시글 수정 메서드 추가
  async updatePost(
    postId: number,
    createPostDto: CreatePostDto,
    memberId: number,
  ) {
    const categoryId = await this.ensureCategoryExists(createPostDto.category);

    const { data, error } = await this.supabase
      .from('post')
      .update({
        title: createPostDto.title,
        content: createPostDto.content,
        preview_content: createPostDto.preview_content,
        thumbnail: createPostDto.thumbnail,
        category_id: categoryId,
      })
      .eq('post_id', postId)
      .eq('member_id', memberId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // 게시글 수정하고 Redis 캐시 삭제
    try {
      await this.redisService.del('posts_page_1');
    } catch (err) {
      console.error('Redis 캐시 갱신 실패:', err.message);
    }

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
        thumbnail,
        preview_content,
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

  // 스케줄러로 Redis 캐시 갱신
  @Cron('0 */1 * * *') // 매 시간 0분에 실행
  async refreshPostCache() {
    const page = 1;
    const limit = 7; // 프론트엔드에서 7개씩 보여주기로 했으므로 7로 설정
    const offset = (page - 1) * limit;

    console.log('Redis posts_page_1 캐시 갱신');

    try {
      const { data, error } = await this.supabase
        .from('post')
        .select(
          `
        post_id,
        title,
        preview_content,
        created_at,
        thumbnail,
        category:category(name),
        like_count:likes(count)[0]
      `,
        )
        .order('post_id', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`게시물 조회 오류: ${error.message}`);
      }

      await this.redisService.set('posts_page_1', JSON.stringify(data), 3600); // 1시간 TTL로 캐싱
    } catch (err) {
      console.error('Redis 캐시 갱신 실패:', err.message);
    }
  }
}
