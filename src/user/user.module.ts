import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from 'src/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../auth/constants';
import { ConfigService } from '@nestjs/config';

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
  controllers:[UserController],
  providers: [UserService,PrismaService]
})
export class UserModule {}


