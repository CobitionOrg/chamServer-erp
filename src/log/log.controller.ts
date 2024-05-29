import { Controller, Logger } from '@nestjs/common';
import { LogService } from './log.service';

@Controller('log')
export class LogController {
    constructor(
      private readonly logSerive: LogService  
    ){}

    private readonly logger = new Logger(LogController.name);
}
