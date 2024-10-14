import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // 구글 로그인 시도
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    if (req.user) {
      const { sessionId } = await this.authService.createSession(req.user);
      const clientUrl = this.configService.get<string>('CLIENT_URL');

      const sessionIdKey = this.configService.get<string>('SESSION_ID_KEY');
      const domain = this.configService.get<string>('DOMAIN');

      res.cookie(sessionIdKey, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 600000,
        sameSite: process.env.NODE_ENV === 'production' && 'none',
        domain: process.env.NODE_ENV === 'production' && '.monte-log.com',
      });

      return res.redirect(`${clientUrl}`);
    }
  }

  @Get('status')
  async status(@Req() req) {
    const sessionIdKey = this.configService.get<string>('SESSION_ID_KEY');
    // SESSION_ID_KEY 쿠키가 있는지 확인
    // 세션 ID가 Redis에 있는지 확인
    // 있으면 isLoggedIn: true, 없으면 isLoggedIn: false 반환
    if (req.cookies[sessionIdKey]) {
      const sessionId = req.cookies[sessionIdKey];
      const user = await this.authService.getSession(sessionId);

      if (user) {
        return { isLoggedIn: true };
      }
    }

    return { isLoggedIn: false };
  }

  @Post('logout')
  async logout(@Req() req, @Res() res) {
    const sessionIdKey = this.configService.get<string>('SESSION_ID_KEY');
    const sessionId = req.cookies[sessionIdKey]; // 쿠키에서 sessionId 가져옴

    if (sessionId) {
      await this.authService.deleteSession(sessionId); // Redis에서 세션 삭제

      res.clearCookie(sessionIdKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      }); // 클라이언트 측 쿠키 삭제

      return res.status(200).json({ message: '로그아웃 성공' });
    }

    return res.status(400).json({ message: '이미 로그아웃 상태입니다.' });
  }
}
