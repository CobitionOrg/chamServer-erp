import { Logger, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './user/user.controller';
import { UserModule } from './user/user.module';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { ConfigModule } from '@nestjs/config';
@Module({
  
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UserModule
  ],
  controllers: [AppController, ],
  providers: [AppService,Logger],
})
export class AppModule implements NestModule{
    configure(consumer:MiddlewareConsumer){
      consumer.apply(LoggerMiddleware).forRoutes('*');
    }
}
