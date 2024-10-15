import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { CreatePostDto } from './create-post.dto';

@Injectable()
export class PostService {
  private supabase;

  constructor(private configService: ConfigService) {
    // 환경 변수에서 Supabase URL과 API 키를 불러옴
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getPosts() {
    const { data, error } = await this.supabase.from('post').select('*');
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async createPost(createPostDto: CreatePostDto, memberId: number) {
    const categoryId = await this.ensureCategoryExists(createPostDto.category);

    const { data, error } = await this.supabase
      .from('post')
      .insert([
        {
          title: createPostDto.title,
          content: createPostDto.content,
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
