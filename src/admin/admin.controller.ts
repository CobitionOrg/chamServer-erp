import { Body, Controller, Logger, Post } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsertQuestionDto } from './Dto/question.dto';

@Controller('admin')
@ApiTags('admin api')
export class AdminController {
    constructor(
        private adminService : AdminService,
    ){}
    private readonly logger = new Logger(AdminController.name);

    @ApiOperation({summary:'질문 생성'})
    @Post('/question')
    async insertQuestion(@Body() questionDto : InsertQuestionDto){
        this.logger.log('질문 생성');
        console.log(questionDto);
    }
}
 