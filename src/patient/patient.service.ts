import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PatientRepository } from './patient.repository';
import { Crypto } from 'src/util/crypto.util';
import { PatientNoteDto } from './Dto/patientNote.dto';
import { GetListDto } from 'src/erp/Dto/getList.dto';
import { UpdatePatientDto } from './Dto/updatePatient.dto';
import { UpdateNoteDto } from './Dto/updateNote.dto';
import { CreatePatientDto } from './Dto/createPatient.dto';

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
            //console.log(row);
            const decryptedAddr = this.crypto.decrypt(row.addr);
            const decryptedPhoneNum = this.crypto.decrypt(row.phoneNum);
            const decryptedSocialNum = this.crypto.decrypt(row.socialNum);

            const birth = decryptedSocialNum.slice(0, 6);
            const other = decryptedSocialNum.slice(6, 7);

            const markedSocialNum = `${birth}-${other}******`

            row.addr = decryptedAddr;
            row.phoneNum = decryptedPhoneNum;
            row.socialNum = markedSocialNum;

            row.patientNotes.reverse(); 
        }

        return { success: true, list: patientList, status:HttpStatus.OK };
    }

    /**
     * 특이사항 관련
     * @param patientNoteDto 
     * @returns {success:boolean, status:HttpStatus }
     */
    async patientNote(patientNoteDto: PatientNoteDto) {
        let res = await this.patientRepository.patientCreateNote(patientNoteDto);;

        // if(patientNoteDto.id == undefined) {
        //     //특이사항이 없을 때
        //     res = await this.patientRepository.patientCreateNote(patientNoteDto);
        // }else{
        //     //특이 사항이 있을 때
        //     res = await this.patientRepository.patientUpdateNote(patientNoteDto);
        // }

        if(res.success){
            return {success:true, status:HttpStatus.CREATED};
        }else{
            return {success:false, status:500}
        }

    }

    /**
     * 환자 정보 업데이트
     * @param updatePatientDto 
     * @returns {success:boolean, status:HttpStatus }
     */
    async updatePatient(updatePatientDto: UpdatePatientDto) {
        const encryptedAddr = this.crypto.encrypt(updatePatientDto.patient.addr);
        const encryptedPhoneNum = this.crypto.encrypt(updatePatientDto.patient.phoneNum);

        updatePatientDto.patient.addr = encryptedAddr;
        updatePatientDto.patient.phoneNum = encryptedPhoneNum;

        console.log(updatePatientDto);
        
        const res = await this.patientRepository.updatePatient(updatePatientDto);

        if(res.success) return {success:true, status:HttpStatus.CREATED};
        else return {success:false, status: HttpStatus.INTERNAL_SERVER_ERROR};
    }


    /**
     * 환자 검색
     * @param getListDto 
     * @returns 
     */
    async search(getListDto: GetListDto) {
        let patientConditions = {};
        
        console.log(getListDto.searchCategory);
        if(getListDto.searchKeyword !== ''){
            if(getListDto.searchCategory === 'name') {
                patientConditions = {name: {contains:getListDto.searchKeyword}};
            }
        }

        let list = await this.patientRepository.search(patientConditions);
        

        for (let row of list) {
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

        //번호 검색
        if(getListDto.searchCategory === 'num') {
            list = list.filter(i => i.phoneNum.includes(getListDto.searchKeyword));
        }

        return {success:true, list};
    }


    /**
     * 처리 미처리 여부 수정
     * @param updateNoteDto 
     * @returns {success:boolean}
     */
    async updateNote(updateNoteDto: UpdateNoteDto) {
        const res = await this.patientRepository.updateNote(updateNoteDto);
        return res;
    }

    /**
     * 환자 정보 생성
     * @param createPatientDto 
     * @returns {success:boolean}
     */
    async createPatient(createPatientDto: CreatePatientDto) {
        const encryptedPhoneNum = this.crypto.encrypt(createPatientDto.phoneNum);
        const encryptedAddr = this.crypto.encrypt(createPatientDto.addr);
        const encryptedSocialNum = this.crypto.encrypt(createPatientDto.socialNum);

        createPatientDto.phoneNum = encryptedPhoneNum;
        createPatientDto.addr = encryptedAddr;
        createPatientDto.socialNum = encryptedSocialNum;

        const res = await this.patientRepository.createPatient(createPatientDto);

        return res;
    }

    async deletePatient(id: number){
        const res = await this.patientRepository.deletePatient(id);
        return res;
    }
    
}
