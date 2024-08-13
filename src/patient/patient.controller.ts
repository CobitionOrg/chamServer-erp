import { Body, Controller, Get, Logger, Param, Patch, Post, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';
import { PatientService } from './patient.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { PatientNoteDto } from './Dto/patientNote.dto';
import { GetListDto } from 'src/erp/Dto/getList.dto';
import { patientBodyType } from '@prisma/client';
import { UpdatePatientDto } from './Dto/updatePatient.dto';
import { UpdateNoteDto } from './Dto/updateNote.dto';
import { CreatePatientDto } from './Dto/createPatient.dto';

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

    @ApiOperation({summary:'환자 정보 수정'})
    @Patch('/')
    async updatePatient(@Body() updatePatientDto: UpdatePatientDto) {
        this.logger.log('환자 정보 수정');
        const res = await this.patientService.updatePatient(updatePatientDto);

        return res;
    } 


    @ApiOperation({summary:'환자 검색'})
    @Get('/search')
    async search(@Query() getListDto: GetListDto) {
        this.logger.log('환자 검색');
        const res = await this.patientService.search(getListDto);

        return res; 
    }


    @ApiOperation({summary:'처리 미처리 여부 수정'})
    @Patch('/note')
    async updateNote(@Body() updateNoteDto: UpdateNoteDto) {
        this.logger.log('처리 미처리 여부 수정');
        const res = await this.patientService.updateNote(updateNoteDto);

        return res;
    }
    
    @ApiOperation({summary:"환자 데이터 생성"})
    @Post('/create')
    async createPatient(@Body() createPatientDto: CreatePatientDto) {
        this.logger.log('환자 데이터 생성');
        const res = await this.patientService.createPatient(createPatientDto);

        return res;
    }
    
}
 