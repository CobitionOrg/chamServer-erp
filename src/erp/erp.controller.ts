import { Controller, Logger, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { ErpService } from './erp.service';

@Controller('erp')
@UseGuards(AuthGuard)
@ApiTags('erp api')
export class ErpController {
    constructor(
        private erpService : ErpService,
    ){}

    private readonly logger = new Logger(ErpController.name);
}
