import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Logger, Post, UseGuards,Request,Headers,Patch, Param } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UserService } from './user.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BcryptUtilClass } from 'src/util/bcrypt.util';
import { SignUpDto } from './Dto/signUp.dto';
import { LoginDto } from './Dto/login.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { AttendanceDto } from './Dto/attendance.dto';
import { getToken } from 'src/util/token';
import { LeaveWorkDto } from './Dto/leaveWork.dto';

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
    @Post('/attendance')
    async attendence(@Body() loginDto : AttendanceDto){
        this.logger.log('로그인 및 출근 체크');
        return await this.userService.attendance(loginDto);
    }

    @ApiOperation({summary:'퇴근'})
    @HttpCode(HttpStatus.OK)
    @Patch('/leaveWork')
    async leaveWork(@Body() leaveWork : LeaveWorkDto, @Headers() header){
        this.logger.log('퇴근 체크');
        return await this.userService.leaveWork(getToken(header),leaveWork);
    }

    @ApiOperation({summary:'유저 정보 불러오기'})
    @HttpCode(HttpStatus.OK)
    @Get('/userData')
    async userData(@Headers() header){
        this.logger.log('유저 정보 가져오기');
        return await this.userService.getUserData(getToken(header));
    }

    @ApiOperation({summary:'유저 권한 허용'})
    @HttpCode(HttpStatus.OK)
    @Patch('/updUser/:id')
    async updUser(@Headers() header,@Param('id') id:number){
        this.logger.log('유저 권한 허용하기');
        return await this.userService.userFlagUpd(getToken(header),id);
    }
}
