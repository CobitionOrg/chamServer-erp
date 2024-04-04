import { Controller, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UserService } from './user.service';
@Controller('user')
export class UserController {
    constructor(
        private userService : UserService,
    ){}
    @Get('/')
    async get(){
        return await this.userService.findUserById('test');
    }

}
