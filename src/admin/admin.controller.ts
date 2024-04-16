import { Controller, Logger } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('admin')
@ApiTags('admin api')
export class AdminController {
    constructor(
        private adminService : AdminService,
    ){}
    private readonly logger = new Logger(AdminController.name);
}
