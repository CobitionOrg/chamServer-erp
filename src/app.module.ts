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
@Module({
  
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UserModule,
    SurveyModule,
    AdminModule,
    ErpModule
  ],
  controllers: [AppController ],
  providers: [AppService,Logger],
})
export class AppModule implements NestModule{
    configure(consumer:MiddlewareConsumer){
      consumer.apply(LoggerMiddleware).forRoutes('*');
    }
}
