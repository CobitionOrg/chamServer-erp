import { HttpException, HttpStatus, Injectable, Logger, UseFilters } from '@nestjs/common';
import { ExchangeRepository } from './exchange.repository';
import { CreateExchangeDto } from './Dto/createExchange.dto';
import { PrismaService } from 'src/prisma.service';
import { ExOrderObjDto } from './Dto/exOrderObj.dto';
import { ExOrderItemObjDto } from './Dto/exOrderItemObj.dto';
import { ExOrderBodyTypeDto } from './Dto/exOrderBodyType.dto';

@Injectable()
export class ExchangeService {
    constructor(
        private readonly exchangeRepository : ExchangeRepository,
        private prisma: PrismaService

    ){}

    private readonly logger = new Logger(ExchangeService.name);

    async createExchange(createExchangeDto : CreateExchangeDto){
        return await this.prisma.$transaction(async (tx) => {
            const exOrder = await this.exchangeRepository.getExOrder(createExchangeDto.id,tx);

            console.log(exOrder);
            if(exOrder == null){
                console.log('?')
                return {success:false,status:HttpStatus.NO_CONTENT,msg:'해당 데이터가 존재하지 않습니다'};
            }

            const objOrder:ExOrderObjDto = {
                route: exOrder.route,
                message: exOrder.message,
                cachReceipt: exOrder.cachReceipt,
                typeCheck: exOrder.typeCheck,
                consultingTime: exOrder.consultingTime,
                payType: exOrder.payType,
                essentialCheck: exOrder.essentialCheck,
                outage: exOrder.outage,
                patientId: exOrder.patientId,
                price: exOrder.price,
                remark: exOrder.remark
            };

            const objOrderItems: Array<ExOrderItemObjDto> = exOrder.orderItems;

            const objOrderBodyType: ExOrderBodyTypeDto = exOrder.orderBodyType;

            // console.log(objOrder);
            // console.log(objOrderItems);
            // console.log(objOrderBodyType);

            const newOrder = await this.exchangeRepository.insertOrder(tx, objOrder, createExchangeDto.orderSortNum);
            const newOrderItem = await this.exchangeRepository.insertOrderItems(tx,objOrderItems,newOrder.id);
            const newOrderBodyType = await this.exchangeRepository.insertOrderBodyType(tx,objOrderBodyType,newOrder.id);

            // console.log(newOrder);
            // console.log(newOrderBodyType);
            // console.log(newOrderItem);

            if(!newOrder.success || !newOrderItem.success || !newOrderBodyType.success){
                return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR,msg:'서버 내부 에러 발생'};
            }

            return {success:true, status:HttpStatus.OK};

        });

        

      
    }
}
 