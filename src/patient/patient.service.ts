import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PatientRepository } from './patient.repository';
import { Crypto } from 'src/util/crypto.util';
import { PatientNoteDto } from './Dto/patientNote.dto';

@Injectable()
export class PatientService {
    constructor(
        private patientRepository: PatientRepository,
        private crypto: Crypto,
    ){}

    private readonly logger = new Logger(PatientService.name);

    /**
     * 환자 데이터 리스트 가져오기
     * @returns {success:boolean, list: Array}
     */
    async getPatientList() {
        const patientList = await this.patientRepository.getPatientList();

        for (let row of patientList) {
            const decryptedAddr = this.crypto.decrypt(row.addr);
            const decryptedPhoneNum = this.crypto.decrypt(row.phoneNum);
            const decryptedSocialNum = this.crypto.decrypt(row.socialNum);

            const birth = decryptedSocialNum.slice(0, 6);
            const other = decryptedSocialNum.slice(6, 7);

            const markedSocialNum = `${birth}-${other}******`

            row.addr = decryptedAddr;
            row.phoneNum = decryptedPhoneNum;
            row.socialNum = markedSocialNum;
        }

        return { success: true, list: patientList, status:HttpStatus.OK };
    }

    /**
     * 특이사항 관련
     * @param patientNoteDto 
     * @returns {success:boolean, status:HttpStatus }
     */
    async patientNote(patientNoteDto: PatientNoteDto) {
        let res;

        if(patientNoteDto.id == undefined) {
            //특이사항이 없을 때
            res = await this.patientRepository.patientCreateNote(patientNoteDto);
        }else{
            //특이 사항이 있을 때
            res = await this.patientRepository.patientUpdateNote(patientNoteDto);
        }

        if(res.success){
            return {success:true, status:HttpStatus.CREATED};
        }else{
            return {success:false, status:500}
        }

    }
}
