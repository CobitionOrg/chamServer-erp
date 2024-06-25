import { Module } from '@nestjs/common';
import { SurveyService } from './survey.service';
import { SurveyController } from './survey.controller';
import { PrismaService } from 'src/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Crypto } from 'src/util/crypto.util';

@Module({
  imports: [
    HttpModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      global: true,
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('orderUpdConstants'),
        signOptions: { expiresIn: '1h' },
      }),

    }),],
  controllers: [SurveyController],
  providers: [SurveyService, PrismaService, Crypto],
})
export class SurveyModule { }
