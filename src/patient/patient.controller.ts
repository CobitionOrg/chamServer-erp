import { Body, Controller, Get, Logger, Post, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';
import { PatientService } from './patient.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { PatientNoteDto } from './Dto/patientNote.dto';
import { GetListDto } from 'src/erp/Dto/getList.dto';

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
        this.logger.log('환자 특이사항 입력');
        const res = await this.patientService.patientNote(patientNoteDto);

        return res;
    }

    @ApiOperation({summary:'환자 검색'})
    @Get('/search')
    async search(@Query() getListDto: GetListDto) {
        this.logger.log('환자 검색');
        const res = await this.patientService.search(getListDto);

        return res; 
    }
    

}
 