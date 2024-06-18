import { Logger, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './user/user.controller';
import { UserModule } from './user/user.module';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { ConfigModule } from '@nestjs/config';
import { SurveyModule } from './survey/survey.module';
import { AdminController } from './admin/admin.controller';
import { AdminModule } from './admin/admin.module';
import { ErpController } from './erp/erp.controller';
import { ErpService } from './erp/erp.service';
import { ErpModule } from './erp/erp.module';
import { LogService } from './log/log.service';
import { LogModule } from './log/log.module';
import { ExchangeController } from './exchange/exchange.controller';
import { ExchangeModule } from './exchange/exchange.module';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './filter/httpExceptionFilter';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks/tasks.service';
import { TasksModule } from './tasks/tasks.module';
import { TalkController } from './talk/talk.controller';
import { TalkService } from './talk/talk.service';
import { TalkModule } from './talk/talk.module';
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
    TalkModule
  ],
  controllers: [AppController ],
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
