import { Body, Controller, Logger, Post, Headers } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsertQuestionDto } from './Dto/question.dto';
import { getToken } from 'src/util/token';

@Controller('admin')
@ApiTags('admin api')
export class AdminController {
    constructor(
        private adminService : AdminService,
    ){}
    private readonly logger = new Logger(AdminController.name);

    @ApiOperation({summary:'질문 생성'})
    @Post('/question')
    async insertQuestion(@Body() questionDto : InsertQuestionDto, @Headers() header){
        this.logger.log('질문 생성');
        return await this.adminService.insertQuestion(questionDto,getToken(header));
    }
}
 