import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { winstonLogger } from './util/winston.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule,{
    cors:true,
    logger:winstonLogger
  });

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
