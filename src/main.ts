import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { winstonLogger } from './util/winston.util';
import { ValidationPipe } from '@nestjs/common';
async function bootstrap() {
  const app = await NestFactory.create(AppModule,{
    cors:true,
    logger:winstonLogger
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist : true,  //유효성이 안맞으면 접근이 안되게
      forbidNonWhitelisted : true, //이상한걸 보내면 아예 막아버림
      transform : true, //유저가 보낸 데이터를 우리가 원하는 타입으로 바꿔줌 개꿀임
      
    })  //유효성을 검사하기 위한 일종의 미들웨어 api에서 받은걸 타입을 맞춰줌
  );
  
  const config = new DocumentBuilder()
    .setTitle('참명인 한의원 ERP api server')
    .setDescription('한의원 서버')
    .setVersion('1.0')
    .addTag('cham')
    .build();

 
  const document = SwaggerModule.createDocument(app,config);
  SwaggerModule.setup('api',app, document);
  await app.listen(3000);
}
bootstrap();
