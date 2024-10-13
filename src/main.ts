import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedRedirectFilter } from './common/UnauthorizedRedirectFilter';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService); // ConfigService 가져오기
  const clientUrl = configService.get<string>('CLIENT_URL'); // 환경 변수에서 CLIENT_URL 추출

  app.useGlobalFilters(new UnauthorizedRedirectFilter(configService));

  app.use(cookieParser());

  app.enableCors({
    origin: clientUrl, // Next.js가 실행되는 주소
    credentials: true, // 쿠키를 포함한 요청을 허용
  });

  const port = process.env.PORT || 3000;
  await app.listen(3000);
}
bootstrap();
