import { Body, Controller, Get, Logger, Post, UseFilters, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';
import { PatientService } from './patient.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { PatientNoteDto } from './Dto/patientNote.dto';

@Controller('patient')
@UseFilters(new HttpExceptionFilter())
@ApiTags('patient')
@UseGuards(AuthGuard)
export class PatientController {
    constructor(
        private readonly patientService: PatientService
    ){}

    private readonly logger = new Logger(PatientController.name);

    @ApiOperation({summary:'환자 데이터 리스트'})
    @Public()
    @Get('/')
    async getPatientList(){
        this.logger.log('환자 데이터 리스트');
        const res = await this.patientService.getPatientList();

        return res;
    }

    @ApiOperation({summary:'환자 특이사항 입력'})
    @Post('/')
    async patientNote(@Body() patientNoteDto: PatientNoteDto) {
        
    }
    

}
