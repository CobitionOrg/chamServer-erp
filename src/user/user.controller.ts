import { Body, Controller, Get, HttpException, Logger, Post } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UserService } from './user.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BcryptUtilClass } from 'src/util/bcrypt.util';
import { SignUpDto } from './Dto/signUp.dto';

@Controller('user')
@ApiTags('user api')
export class UserController {
    constructor(
        private userService : UserService,
    ){}
    private readonly logger = new Logger(UserController.name);

    @Get('/')
    async get(){
        return await this.userService.findUserById('test');
    }

    @ApiOperation({summary:'회원가입'})
    @Post('/signUp')
    async signUp(@Body() signUpDto : SignUpDto){
        this.logger.log('회원가입');
        const res = await this.userService.signUp(signUpDto);
        if(!res.success) throw new HttpException(res.success,res.status);
        else return res;
    }

}
