import { Body, Controller, Logger, Post, Headers, Get, UseGuards, Param, Patch, Head, UseFilters } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsertQuestionDto } from './Dto/question.dto';
import { getToken } from 'src/util/token';
import { AuthGuard } from 'src/auth/auth.guard';
import { PermitListDto } from './Dto/permitUser.dto';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';
import { LogService } from 'src/log/log.service';
import { PatchDeliveryVolumeDto } from './Dto/patchDeliveryVolume.dto';

@Controller('admin')
@UseGuards(AuthGuard)
@UseFilters(new HttpExceptionFilter())
@ApiTags('admin api')
export class AdminController {
    constructor(
        private adminService : AdminService,
        private logService: LogService
    ){}
    private readonly logger = new Logger(AdminController.name);

    @ApiOperation({summary:'질문 생성'})
    @Post('/question')
    async insertQuestion(@Body() questionDto : InsertQuestionDto, @Headers() header){
        this.logger.log('질문 생성');
        return await this.adminService.insertQuestion(questionDto,getToken(header));
    }

    @ApiOperation({summary:'관리자 체크'})
    @Get('/checkAdmin')
    async checkAdmin(@Headers() header){
        this.logger.log('관리자 체크');
        return await this.adminService.checkAdmin(getToken(header));
    }
    
    @ApiOperation({summary:'유저 허용'})
    @Patch('/permit')
    async permitUser(@Headers() header, @Body() body:PermitListDto){
        this.logger.log('유저 허용');
        await this.logService.createLog(
            '유저 허용',
            '관리자 페이지',
            header
        );
        return await this.adminService.permitUser(getToken(header), body);
    }

    @ApiOperation({summary:'미등록 유저 리스트'})
    @Get('/permit')
    async permitList(@Headers() header){
        this.logger.log('미등록 유저 리스트');
        return await this.adminService.permitList(getToken(header));
    }

    @ApiOperation({summary:'유저 리스트 조회'})
    @Get('/userList')
    async getUserList(@Headers() header){
        this.logger.log('유저 리스트 조회');
        return await this.adminService.getUserList(getToken(header));
    }

    @ApiOperation({summary:'근태 조회'})
    @Get('/attendance/:id')
    async getAttendance(@Headers() header,@Param('id') id:number){
        this.logger.log('근태 기록 조회');
        return await this.adminService.getAttendance(getToken(header),id);
    }

    @ApiOperation({summary:'유저 계정 삭제'})
    @Patch('/delete/:id')
    async deleteUser(@Headers() header, @Param("id") id: number){
        this.logger.log('유저 계정 삭제');
        const res = await this.adminService.deleteUser(id, getToken(header));

        if(res.success) {
            await this.logService.createLog(
                `${id}번 계정 삭제`,
                '관리자 페이지',
                header
            )
        }
        return res;
    }

    @ApiOperation({ summary: '요일별 발송량 전체 조회' })
    @Get('/daily-delivery-volume')
    async getAllDeliveryVolume(@Headers() header) {
        this.logger.log('요일별 발송량 전체 조회');
        return await this.adminService.getAllDeliveryVolume(getToken(header));
    }

    @ApiOperation({ summary: '요일별 발송량 전체 수정' })
    @Patch('/daily-delivery-volume')
    async patchAllDeliveryVolume(
        @Headers() header,
        @Body() patchDeliveryVolumeDto: PatchDeliveryVolumeDto,
      ) {
        this.logger.log('요일별 발송량 전체 수정');
        const res = await this.adminService.patchChangedDeliveryVolume(
          getToken(header),
          patchDeliveryVolumeDto,
        );

        if(res.success) {
            await this.logService.createLog(
                `발송량 수정`,
                '관리자 페이지',
                header
            )
        }
        return res;
    }
}
 