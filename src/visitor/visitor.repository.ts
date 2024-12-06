import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VisitorRepository {
  private supabase;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // 방문 기록 삽입
  async addVisit(userKey: string, visitDate: string): Promise<void> {
    const { error } = await this.supabase.from('visitor').insert([
      {
        user_key: userKey,
        visited_date: visitDate,
      },
    ]);

    if (error && error.code !== '23505') {
      // 23505는 중복 키 예외 (PostgreSQL)
      throw new Error(`Failed to add visit: ${error.message}`);
    }
  }

  // 총 방문자 수 조회
  async getTotalVisitors(): Promise<number> {
    const { data, error } = await this.supabase
      .from('visitor')
      .select('user_key', { count: 'exact', distinct: true });

    if (error) {
      throw new Error(`Failed to get total visitors: ${error.message}`);
    }

    return data.length || 0;
  }

  // 오늘 방문자 수 조회
  async getTodayVisitors(visitDate: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('visitor')
      .select('user_key', { count: 'exact', distinct: true })
      .eq('visited_date', visitDate);

    if (error) {
      throw new Error(`Failed to get today's visitors: ${error.message}`);
    }

    return data.length || 0;
  }
}