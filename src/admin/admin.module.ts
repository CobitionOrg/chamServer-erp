import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from 'src/auth/constants';
import { AdminController } from './admin.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  imports:[
    JwtModule.register({
      global:true,
      secret:jwtConstants.secret,
      signOptions:{expiresIn:'60s'}
    }),
  ],
  controllers:[AdminController],
  providers: [AdminService,PrismaService]
})
export class AdminModule {}
