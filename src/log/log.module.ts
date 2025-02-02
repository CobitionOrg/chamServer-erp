import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LogController } from './log.controller';
import { LogService } from './log.service';
import { LogRepository } from './log.repository';

@Module({
    imports:[
        JwtModule.registerAsync({
          inject:[ConfigService],
          global: true,
          useFactory:(config:ConfigService) => ({
            secret: config.get<string>('jwtConstant'),
            signOptions: { expiresIn: '1d' },
          }),
         
        }),
      ],
    providers:[PrismaService,LogService,LogRepository], 
    controllers: [LogController]
})

export class LogModule {}
 