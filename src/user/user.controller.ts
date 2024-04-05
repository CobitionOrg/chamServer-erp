import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Logger, Post, UseGuards,Request, } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UserService } from './user.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BcryptUtilClass } from 'src/util/bcrypt.util';
import { SignUpDto } from './Dto/signUp.dto';
import { LoginDto } from './Dto/login.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { AttendanceDto } from './Dto/attendance.dto';

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
    @HttpCode(HttpStatus.CREATED)
    @Post('/signUp')
    async signUp(@Body() signUpDto : SignUpDto){
        this.logger.log('회원가입');
        const res = await this.userService.signUp(signUpDto);
        if(!res.success) throw new HttpException(res.success,res.status);
        else return res;
    }

    @ApiOperation({summary:'로그인'})
    @HttpCode(HttpStatus.OK)
    @Post('/login')
    async login(@Body() loginDto : LoginDto){
        this.logger.log('로그인');
        return await this.userService.signIn(loginDto);
        
    }

    @ApiOperation({summary:'출근'})
    @HttpCode(HttpStatus.OK)
    @Post('attendance')
    async attendence(@Body() loginDto : AttendanceDto){
        this.logger.log('로그인 및 출근 체크');
        return await this.userService.attendance(loginDto);
    }

}
