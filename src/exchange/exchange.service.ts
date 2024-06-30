import { HttpException, HttpStatus, Injectable, Logger, UseFilters } from '@nestjs/common';
import { ExchangeRepository } from './exchange.repository';
import { CreateExchangeDto } from './Dto/createExchange.dto';
import { PrismaService } from 'src/prisma.service';
import { ExOrderObjDto } from './Dto/exOrderObj.dto';
import { ExOrderItemObjDto } from './Dto/exOrderItemObj.dto';
import { ExOrderBodyTypeDto } from './Dto/exOrderBodyType.dto';
import { GetListDto } from 'src/erp/Dto/getList.dto';
import { CompleteRefundDto } from './Dto/completeRefund.dto';
import { Crypto } from 'src/util/crypto.util';

@Injectable()
export class ExchangeService {
    constructor(
        private readonly exchangeRepository : ExchangeRepository,
        private prisma: PrismaService,
        private crypto: Crypto,
    ){}

    private readonly logger = new Logger(ExchangeService.name);

    /**
     * 교환,누락,환불 건 오더 생성
     * @param createExchangeDto 
     * @returns {success:boolean, status:HttpStatus,msg:string}
     */
    async createExchange(createExchangeDto : CreateExchangeDto){
        const res = await this.prisma.$transaction(async (tx) => {
            const exOrder = await this.exchangeRepository.getExOrder(createExchangeDto.id,tx);

            console.log(exOrder);
            // 기존 데이터가 없을 때
            if(exOrder == null){
                return {success:false,status:HttpStatus.NO_CONTENT,msg:'해당 데이터가 존재하지 않습니다'};
            }

            const objOrder:ExOrderObjDto = {
                route: exOrder.route,
                message: exOrder.message,
                cachReceipt: exOrder.cachReceipt,
                typeCheck: exOrder.typeCheck,
                consultingTime: exOrder.consultingTime,
                payType: exOrder.payType,
                tallWeight : exOrder.tallWeight,
                essentialCheck: exOrder.essentialCheck,
                isFirst:exOrder.isFirst,
                outage: exOrder.outage,
                patientId: exOrder.patientId,
                price: exOrder.price,
                remark: exOrder.remark,
                addr: exOrder.addr
            };

            const objOrderItems: Array<ExOrderItemObjDto> = exOrder.orderItems;

            const objOrderBodyType: ExOrderBodyTypeDto = exOrder.orderBodyType;

            // console.log(objOrder);
            // console.log(objOrderItems);
            // console.log(objOrderBodyType);

            //오더 생성
            const newOrder = await this.exchangeRepository.insertOrder(tx, objOrder, createExchangeDto.orderSortNum);
            //오더 아이템 생성
            const newOrderItem = await this.exchangeRepository.insertOrderItems(tx,objOrderItems,newOrder.id);
            //오더 바디 타입 생성
            
            const newOrderBodyType = await this.exchangeRepository.insertOrderBodyType(tx,objOrderBodyType,newOrder.id, objOrder.isFirst);

            // console.log(newOrder);
            // console.log(newOrderBodyType);
            // console.log(newOrderItem);

            if(!newOrder.success || !newOrderItem.success || !newOrderBodyType.success){
                return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR,msg:'서버 내부 에러 발생'};
            }

            return {success:true, status:HttpStatus.CREATED};

        });
        console.log('----------------');
        console.log(res);

        return res;
    }

    /**
     * 교환,누락,환불 리스트 가져오기
     * @returns {success:boolean,list,msg:string}
     */
    async getExchangeList(getListDto: GetListDto){
        let orderConditions = {};

        if(getListDto.date === undefined) {
            //날짜 조건 X
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



        const res = await this.exchangeRepository.getExchangeList(orderConditions,patientConditions);

        if(!res.success){
            return {success:false,status:res.status,msg:''};
        }

        
        for (let row of res.list) {
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
     * 환불 완료 처리
     * @param id 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
            msg: string;
        }>
     */
    async completeRefund(completeRefundDto:CompleteRefundDto){
        if(completeRefundDto.orderSortNum !== -4) {
            return {success:false, status:HttpStatus.BAD_REQUEST,msg:'환불 주문만 완료 처리 가능합니다'};
        }
        const res = await this.exchangeRepository.completeRefund(completeRefundDto.orderId);
        return res;
    }
}



 