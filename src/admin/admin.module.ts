import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from 'src/auth/constants';
import { AdminController } from './admin.controller';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/user/user.service';
import { LogService } from 'src/log/log.service';
import { LogRepository } from 'src/log/log.repository';

@Module({
  imports:[
    JwtModule.register({
      global:true,
      secret:jwtConstants.secret,
      signOptions:{expiresIn:'60s'}
    }),
  ],
  controllers:[AdminController],
  providers: [AdminService,PrismaService,UserService,LogService,LogRepository]
})
export class AdminModule {}
