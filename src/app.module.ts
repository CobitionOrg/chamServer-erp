import { Logger, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { ConfigModule } from '@nestjs/config';
import { SurveyModule } from './survey/survey.module';
import { AdminModule } from './admin/admin.module';
import { ErpModule } from './erp/erp.module';
import { LogModule } from './log/log.module';
import { ExchangeModule } from './exchange/exchange.module';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './filter/httpExceptionFilter';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksModule } from './tasks/tasks.module';
import { TalkModule } from './talk/talk.module';
import { VisitModule } from './visit/visit.module';
import { PatientModule } from './patient/patient.module';
@Module({

  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    UserModule,
    SurveyModule,
    AdminModule,
    ErpModule,
    LogModule,
    ExchangeModule,
    TasksModule,
    TalkModule,
    VisitModule,
    PatientModule
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    Logger, 
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },   
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
