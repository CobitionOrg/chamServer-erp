import { Controller, Logger, UseFilters } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';
import { TalkService } from './talk.service';

@Controller('talk')
@UseFilters(new HttpExceptionFilter())
@ApiTags('카톡 발송 관련 엑셀 api')
export class TalkController {
    constructor(
        private readonly talkService: TalkService
    ){}

    private readonly logger = new Logger(TalkController.name);
}
