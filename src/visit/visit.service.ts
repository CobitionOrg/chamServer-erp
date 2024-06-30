import { Injectable, Logger } from '@nestjs/common';
import { VisitRepository } from './visit.repository';
import { GetListDto } from 'src/erp/Dto/getList.dto';
import { Crypto } from 'src/util/crypto.util';

@Injectable()
export class VisitService {
    constructor(
        private visitRepository: VisitRepository,
        private crypto: Crypto,

    ){}

    private readonly logger = new Logger(VisitService.name);

    async visitOrder(id: number) {
        return await this.visitRepository.visitOrder(id);
    }

    async visitList(getListDto: GetListDto) {
        let orderConditions = {};

        if(getListDto.date === undefined) {
            //날짜 조건 x
            orderConditions = {
                consultingType: false,
                isComplete: false
            };
        }else {
            const gmtDate = new Date(getListDto.date);
            const kstDate = new Date(gmtDate.getTime() + 9 * 60 * 60 * 1000);

            const startDate = new Date(kstDate.setHours(0,0,0,0));
            const endDate = new Date(kstDate.setHours(23,59,59,999));
            orderConditions = {
                consultingType: false,
                isComplete: false,
                date: {
                    gte: startDate,
                    lt: endDate,
                }
            }
        }

        let patientConditions = {};

        if(getListDto.searchKeyword !== "") {
            if(getListDto.searchCategory === "all") {
                patientConditions = {
                    OR : [
                        { patient: { name: { contains: getListDto.searchKeyword } } },
                        { patient: { phoneNum: { contains: getListDto.searchKeyword } } },
                    ]
                }
            } else if (getListDto.searchCategory === "name") {
                patientConditions = {
                    patient: { name: { contains: getListDto.searchKeyword } }
                }
            } else if (getListDto.searchCategory === "num") {
                patientConditions = {
                    patient: { phoneNum: { contains: getListDto.searchKeyword } }
                }
            }
        }

        const res = await this.visitRepository.visitList(orderConditions,patientConditions);

        
        if(!res.success){
            return {success:false,status:res.status,msg:''};
        }

        for(let row of res.list) {
            const encryptedAddr = this.crypto.decrypt(row.addr);
            const encryptedPhoneNum = this.crypto.decrypt(row.patient.phoneNum);
            const encryptedPaitientAddr = this.crypto.decrypt(row.patient.addr);
            row.addr = encryptedAddr;
            row.patient.phoneNum = encryptedPhoneNum;
            row.patient.addr = encryptedPaitientAddr;

        }

        return res;

    }
}
