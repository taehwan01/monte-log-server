import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedRedirectFilter } from './common/UnauthorizedRedirectFilter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService); // ConfigService 가져오기
  const clientUrl = configService.get<string>('CLIENT_URL'); // 환경 변수에서 CLIENT_URL 추출
  const adminClientUrl = configService.get<string>('ADMIN_CLIENT_URL'); // 환경 변수에서 ADMIN_CLIENT_URL 추출

  app.useGlobalFilters(new UnauthorizedRedirectFilter(configService));

  app.use(cookieParser());

  app.enableCors({
    origin: [clientUrl, adminClientUrl], // Next.js가 실행되는 주소
    credentials: true, // 쿠키를 포함한 요청을 허용
    methods: 'GET,HEAD,POST,PUT,DELETE,OPTIONS',
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
}
bootstrap();
