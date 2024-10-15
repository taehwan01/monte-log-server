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

  async getPostById(id: number) {
    const { data, error } = await this.supabase
      .from('post')
      .select('*')
      .eq('post_id', id)
      .single();

    if (error) {
      throw new Error(`Error fetching post with ID ${id} : ${error.message}`);
    }

    return data;
  }
}
