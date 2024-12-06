import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PostModule } from './post/post.module';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CategoryModule } from './category/category.module';
import { VisitorModule } from './visitor/visitor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 모든 모듈에서 환경 변수를 사용할 수 있도록 전역 설정
    }),
    PostModule, // 포스트 관련 모듈 임포트
    CategoryModule,
    VisitorModule,
    AuthModule, // 인증 관련 모듈 임포트
    ScheduleModule.forRoot(), // 스케줄러 모듈 임포트
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
