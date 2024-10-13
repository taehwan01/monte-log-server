import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private supabase;

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });

    // Supabase 클라이언트 설정
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails } = profile;
    const email = emails[0].value;

    // 환경 변수에서 ADMIN_EMAIL 가져오기
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');

    // 이메일이 ADMIN_EMAIL과 일치하지 않으면 UnauthorizedException 발생
    if (email !== adminEmail) {
      return done(
        new UnauthorizedException('권한 없음. 로그인을 거부합니다.'),
        false,
      );
    }

    // Supabase에서 email로 memberId 조회
    const { data, error } = await this.supabase
      .from('member')
      .select('member_id')
      .eq('email', email)
      .single(); // 단일 결과 가져오기

    if (error || !data) {
      return done(
        new UnauthorizedException('정보 없음. 로그인을 거부합니다.'),
        false,
      );
    }

    // name = { familyName, givenName }에서 givenName만 추출
    const user = { memberId: data.member_id, email, name: name.givenName };

    done(null, user); // 이메일이 일치하면 로그인 허용
  }
}
