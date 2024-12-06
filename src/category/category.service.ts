import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { RedisService } from 'src/common/redis/redis.service';

@Injectable()
export class CategoryService {
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

  async getAllCategories() {
    try {
      const cachedCategories = await this.redisService.get('categories');
      if (cachedCategories) {
        return {
          categories: JSON.parse(cachedCategories),
        };
      }

      const { data, error } = await this.supabase.from('category').select('*');
      if (error) {
        throw new Error(`Category 목록 가져오기 실패: ${error.message}`);
      }
      await this.redisService.set('categories', JSON.stringify(data), 86400); // 1일 TTL
      return {
        categories: data,
      };
    } catch (error) {
      console.error(error.message);
      throw new Error(`getAllCategories() 실패`);
    }
  }
}
