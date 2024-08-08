import { Injectable, Logger } from '@nestjs/common';
import { VisitRepository } from './visit.repository';
import { GetListDto } from 'src/erp/Dto/getList.dto';
import { Crypto } from 'src/util/crypto.util';
import { checkSend } from 'src/util/getOrderPrice';

@Injectable()
export class VisitService {
    constructor(
        private visitRepository: VisitRepository,
        private crypto: Crypto,

    ){}

    private readonly logger = new Logger(VisitService.name);

    /**
     * 방문수령으로 설정
     * @param id 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
        }>
     */
    async visitOrder(id: number) {
        const order = await this.visitRepository.getOrder(id);
       
        let price = order.price;
        console.log(order.orderItems);

        const checkSendTax = checkSend(order.orderItems);
        
        console.log(checkSendTax);
        if(checkSendTax) {
            price-=3500;
        }
        return await this.visitRepository.visitOrder(id,price);
    }

    /**
     * 방문수령 리스트 불러오기
     * @param getListDto 
     * @returns 
     */
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
            patientConditions = { patient: { name: { contains: getListDto.searchKeyword } } };
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

    /**
     * 방문 수령 계좌 결제 처리
     * @param id 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
            msg: string;
        }>
     */
    async accountPay(id: number){
        return await this.visitRepository.accountPay(id);
    }

    
    /**
     * 방문 수령 방문 결제 처리
     * @param id 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
            msg: string;
        }>
     */
    async visitPay(id: number) {
        return await this.visitRepository.visitPay(id);
    }
}
