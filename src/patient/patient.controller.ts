import { Body, Controller, Get, Logger, Param, Patch, Post, Query, Headers, UseFilters, UseGuards, Head } from '@nestjs/common';
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
import { LogService } from 'src/log/log.service';

@Controller('patient')
@UseFilters(new HttpExceptionFilter())
@ApiTags('patient')
@UseGuards(AuthGuard)
export class PatientController {
    constructor(
        private readonly patientService: PatientService,
        private readonly logService: LogService
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
    async patientNote(@Body() patientNoteDto: PatientNoteDto, @Headers() header) {
        this.logger.log('환자 특이사항 입력');
        const res = await this.patientService.patientNote(patientNoteDto);

        if(res.success){
            await this.logService.createLog(
                `${patientNoteDto.patientId}번 환자 특이사항 입력`,
                '환자 리스트',
                header
            )
        }
        return res;
    }

    @ApiOperation({summary:'환자 정보 수정'})
    @Patch('/')
    async updatePatient(@Body() updatePatientDto: UpdatePatientDto, @Headers() header) {
        this.logger.log('환자 정보 수정');
        const res = await this.patientService.updatePatient(updatePatientDto);

        if(res.success) {
            await this.logService.createLog(
                `${updatePatientDto.patientId}번 환자 정보 수정`,
                '환자 리스트',
                header
            );
        }
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
    async updateNote(@Body() updateNoteDto: UpdateNoteDto, @Headers() header) {
        this.logger.log('처리 미처리 여부 수정');
        const res = await this.patientService.updateNote(updateNoteDto);

        if(res.success) {
            await this.logService.createLog(
                `${updateNoteDto.id}번 특이사항 처리 미처리 여부 수정`,
                '환자리스트',
                header
            );
        }
        return res;
    }
    
    @ApiOperation({summary:"환자 데이터 생성"})
    @Post('/create')
    async createPatient(@Body() createPatientDto: CreatePatientDto, @Headers() header) {
        this.logger.log('환자 데이터 생성');
        const res = await this.patientService.createPatient(createPatientDto);

        if(res.success) {
            await this.logService.createLog(
                '환자 데이터 생성',
                '환자리스트',
                header
            );
        }
        return res;
    }

    @ApiOperation({summary:'환자 정보 삭제'})
    @Patch('/delete/:id')
    async deletePatient(@Param("id") id: number, @Headers() header){
        this.logger.log('환자 정보 삭제');
        const res = await this.patientService.deletePatient(id);

        if(res.success) {
            await this.logService.createLog(
                `${id}번 환자 정보 삭제`,
                '환자리스트',
                header
            );
        }
        return res;
    }
    
}
 