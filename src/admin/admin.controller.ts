import { Body, Controller, Logger, Post, Headers, Get, UseGuards, Param, Patch, Head } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsertQuestionDto } from './Dto/question.dto';
import { getToken } from 'src/util/token';
import { AuthGuard } from 'src/auth/auth.guard';
import { PermitListDto } from './Dto/permitUser.dto';

@Controller('admin')
@ApiTags('admin api')
export class AdminController {
    constructor(
        private adminService : AdminService,
    ){}
    private readonly logger = new Logger(AdminController.name);

    @ApiOperation({summary:'질문 생성'})
    @UseGuards(AuthGuard)
    @Post('/question')
    async insertQuestion(@Body() questionDto : InsertQuestionDto, @Headers() header){
        this.logger.log('질문 생성');
        return await this.adminService.insertQuestion(questionDto,getToken(header));
    }

    @ApiOperation({summary:'관리자 체크'})
    @UseGuards(AuthGuard)
    @Get('/checkAdmin')
    async checkAdmin(@Headers() header){
        this.logger.log('관리자 체크');
        return await this.adminService.checkAdmin(getToken(header));
    }
    
    @ApiOperation({summary:'유저 허용'})
    @UseGuards(AuthGuard)
    @Patch('/permit')
    async permitUser(@Headers() header, @Body() body:PermitListDto){
        this.logger.log('유저 허용');
        return await this.adminService.permitUser(getToken(header), body);
    }

    @ApiOperation({summary:'미등록 유저 리스트'})
    @UseGuards(AuthGuard)
    @Get('/permit')
    async permitList(@Headers() header){
        this.logger.log('미등록 유저 리스트');
        return await this.adminService.permitList(getToken(header));
    }

    @ApiOperation({summary:'유저 리스트 조회'})
    @UseGuards(AuthGuard)
    @Get('/userList')
    async getUserList(@Headers() header){
        this.logger.log('유저 리스트 조회');
        return await this.adminService.getUserList(getToken(header));
    }

    @ApiOperation({summary:'근태 조회'})
    @UseGuards(AuthGuard)
    @Get('/attendance/:id')
    async getAttendance(@Headers() header,@Param('id') id:number){
        this.logger.log('근태 기록 조회');
        return await this.adminService.getAttendance(getToken(header),id);
    }

}
 