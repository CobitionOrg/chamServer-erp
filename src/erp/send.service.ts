import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { UpdateSurveyDto } from "./Dto/updateSurvey.dto";
import { error } from "winston";
import * as Excel from 'exceljs'
import { styleHeaderCell } from "src/util/excelUtil";
import { ErpService } from "./erp.service";
import { getItem } from "src/util/getItem";
import { SendOrder } from "./Dto/sendExcel.dto";
import { UpdateTitleDto } from "./Dto/updateTitle.dto";
import { GetOrderSendPrice } from "src/util/getOrderPrice";

//발송 목록 조회 기능
@Injectable()
export class SendService {
    constructor(
        private prisma : PrismaService,
        private erpService : ErpService
    ){}

    private readonly logger = new Logger(SendService.name);

      /**
     * 오더 테이블에서 발송 목록 가져오기
     * @returns 
     */
      async getSendOne() {
        try {
            const list = await this.prisma.order.findMany({
                where: {
                    isComplete: true
                },
                orderBy: {
                    orderSortNum: 'asc'
                },
                select: {
                    id: true,
                    route: true,
                    message: true,
                    cachReceipt: true,
                    typeCheck: true,
                    consultingTime: true,
                    payType: true,
                    essentialCheck: true,
                    outage: true,
                    consultingType: true,
                    phoneConsulting: true,
                    isComplete: true,
                    isFirst: true,
                    date: true,
                    orderSortNum: true,
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            addr: true,
                            phoneNum: true,
                        }
                    },
                    orderItems: {
                        select: {
                            item: true,
                            type: true,
                        }
                    }
                }
            });

            return { success: true, list };
        } catch (err) {
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 오더 테이블에서 발송목록 가져와서 tempOrder 테이블에 세팅하기
     * @returns 
     */
    async setSendList() {
        try {
            const sendList = await this.getSendOne(); //isComplete 된 리스트 가져오기

            const arr = [];

            //temp order에 데이터를 삽입해
            //order 수정 시에도 발송목록에서 순서가 변하지 않도록 조정
            sendList.list.forEach((e) => {
                const obj = {
                    route: e.route,
                    message: e.message,
                    cachReceipt: e.cachReceipt,
                    typeCheck: e.typeCheck,
                    consultingTime: e.consultingTime,
                    payType: e.payType,
                    essentialCheck: e.essentialCheck,
                    outage: e.outage,
                    consultingType: e.consultingType,
                    phoneConsulting: e.phoneConsulting,
                    isComplete: e.isComplete,
                    isFirst: e.isFirst,
                    date: e.date,
                    orderSortNum: e.orderSortNum,
                    patientId: e.patient.id,
                    orderId: e.id
                }

                arr.push(obj);
            });

            //tempOrder에 세팅
            await this.prisma.tempOrder.createMany({
                data: arr
            });

            return { success: true }

        } catch (err) {
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 발송목록(tempOrder)에서 가져오기
     * @returns 
     */
    async getOrderTempList(id:number) {
        try {
            const list = await this.prisma.tempOrder.findMany({
                where:{
                    sendListId:id
                },
                orderBy: {
                    //id: 'asc',
                    orderSortNum:'asc' //sortNum으로 order by 해야됨
                },
                select: {
                    id: true,
                    outage: true,
                    date: true,
                    isFirst: true,
                    orderSortNum: true,
                    sendNum:true,
                    payType: true,
                    addr:true,
                    patient: {
                        select: {
                            id: true,
                            phoneNum: true,
                            name: true,
                            //addr: true,
                        }
                    },
                    order: {
                        select: {
                            id: true,
                            message: true,
                            cachReceipt: true,
                            price:true,
                            orderItems: {
                                select: { item: true, type: true }
                            }
                        }
                    },
                    tempOrderItems:{
                        select:{
                            item:true
                        }
                    }
                }
            });

            return { success: true, list };
        } catch (err) {
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * tempOrder 테이블에서 하나만 조회
     * @param id 
     * @returns 
     */
    async getOrderTempOne(id:number){
        try {
            const list = await this.prisma.tempOrder.findFirst({
                where: {
                    id: id
                },
                select: {
                    id: true,
                    outage: true,
                    date: true,
                    isFirst: true,
                    orderSortNum: true,
                    patient: {
                        select: {
                            id: true,
                            phoneNum: true,
                            name: true,
                            addr: true,
                        }
                    },
                    order: {
                        select: {
                            id: true,
                            message: true,
                            cachReceipt: true,

                            orderItems: {
                                select: { item: true, type: true }
                            }
                        }
                    },
                    tempOrderItems:{
                        select:{
                            item:true
                        }
                    }  
                }
            });

            return { success: true, list };
        } catch (err) {
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 발송목록에서 오더 수정
     * @param surveyDto 
     * @returns 
     */
    async updateSendOrder(surveyDto:UpdateSurveyDto){
        try{
            const insertOrder = surveyDto.answers;
            const patientId = surveyDto.patientId;
            const orderId = surveyDto.orderId;

            const objPatient:any = {};
            const objOrder:any = {};
            const objOrderItem:any = [];

            //console.log(insertOrder);

            //테이블 별 객체로 분리
            insertOrder.forEach(e => {
                //console.log(e)
                if (e.orderType == 'order') {
                    objOrder[`${e.code}`] = e.answer;
                } else if (e.orderType == 'patient') {
                    objPatient[`${e.code}`] = e.answer;
                } else if (e.orderType == 'orderItem') {
                    const obj = {
                        item: e.answer,
                        type: e.code
                    }
                    objOrderItem.push(obj);
                } else {
                    throw error('400 error');
                }
            });

            const itemList = await this.erpService.getItems();
            const getOrderPrice = new GetOrderSendPrice(objOrderItem,itemList);
            const price = getOrderPrice.getPrice();

            await this.prisma.$transaction(async (tx) => {
                const patient = await tx.patient.update({
                    where:{
                        id:patientId
                    },
                    data:{
                        addr:objPatient.addr,
                        phoneNum:objPatient.phoneNum
                    }
                });

                const order = await tx.order.update({
                    where:{
                        id:orderId
                    },
                    data:{
                        cachReceipt:objOrder.cashReceipt,
                        price:price
                    }
                });

                console.log('----------------')
                console.log(objOrderItem)
                const items = [];
                objOrderItem.forEach((e) => {
                    if(e.type =='assistant'){
                        //assistant는 string
                        const obj = {
                            item:e.item,
                            type:e.type,
                            orderId:orderId
                        }
                        items.push(obj);
                    }else{
                        //나머지는 array
                        const arr = [...e.item];
                        arr.forEach((i) => {
                            const obj = {
                                item: i,
                                type: e.type,
                                orderId: orderId
                            }
    
                            items.push(obj);
                        });
                    }
                   
                });

                //기존 order items 제거
                await tx.orderItem.deleteMany({
                    where:{
                        orderId:orderId
                    }
                });

                //새 order items 생성
                const orderItem = await tx.orderItem.createMany({
                    data:items
                });
            });

            return { success: true, status: HttpStatus.CREATED };

        }catch(err){
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }

        }
    }

    /**
     * 송장번호 뽑는 엑셀 파일 만들기
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
            url: any;
        } 
     */
    async sendNumExcel(id:number){
        try{
            const send = await this.getOrderTempList(id);
            const list = send.list;

            const wb = new Excel.Workbook();
            const sheet = wb.addWorksheet("송장 시트");

            const headers = ['이름',' ','주소',' ','번호','1',' ','10','주문수량',' ','메세지','발송자','발송주소','번호'];
            const headerWidths = [16,3,40,3,20,4,3,4,40,3,20,20,35,35];

            const headerRow = sheet.addRow(headers);
            headerRow.height = 30.75;

            headerRow.eachCell((cell,colNum) => {
                styleHeaderCell(cell);
                sheet.getColumn(colNum).width = headerWidths[colNum - 1];
            });

            list.forEach((e) => {
                const { name,phoneNum } = e.patient; 
                const addr = e.addr;
                const message = e.order.message;
                const orderItemList = e.order.orderItems;
                let orderStr = '';
                
                for(let i = 0; i<orderItemList.length; i++){
                    let item = getItem(orderItemList[i].item);
                    if(item !== ''){
                        if(i==orderItemList.length-1) orderStr+=`${item}`
                        else orderStr+=`${item}+`
                    }
                }

                const rowDatas = [name, '', addr, '', phoneNum,'1','','10',orderStr,'',message,'참명인한의원','서울시 은평구 은평로 104 3층 참명인한의원','02-356-8870'];

                const appendRow = sheet.addRow(rowDatas);
            });

            const fileData = await wb.xlsx.writeBuffer();
            const url = await this.erpService.uploadFile(fileData);

            return { success:true, status:HttpStatus.OK, url };
        }catch(err){
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 송장번호 디비에 입력
     * @param sendExcelDto :Array<SendOrder>
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
        }
     */
    async setSendNum(sendExcelDto:SendOrder[]){
        try{
            console.log(sendExcelDto);
            const qryArr = [];

            sendExcelDto.forEach(async (e) => {
                console.log(e);
                const qry = this.prisma.tempOrder.update({
                    where: {
                        id: e.id
                    },
                    data: {
                        sendNum:e.sendNum
                    }
                });

                qryArr.push(qry);

            });

            await Promise.all([...qryArr]).then((value) =>{
                console.log(value);
                return {success:true,status:HttpStatus.OK};
            }).catch((err) => {
                this.logger.error(err);
                return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR};
            });

            return {success:true,status:HttpStatus.OK};

        }catch(err){
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 발송목록 리스트 가져오기
     * @returns Promise<{
            success: boolean;
            list: {
                id: number;
                title: string;
                amount: number;
                full: boolean;
                useFlag: boolean;
                date: Date;
            }[];
            status?: undefined;
        } | {
            success: boolean;
            status: HttpStatus;
            list?: undefined;
        }>
     */
    async getSendList(){
        try{
            const list = await this.prisma.sendList.findMany({
                where:{
                    useFlag:true
                },
                orderBy:{
                    title:'asc'
                }
            });

            return {success:true, list};
        }catch(err){
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 발송목록 완료 처리
     * @param id 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
        }> 
     */
    async completeSend(id:number){
        try{
            await this.prisma.sendList.update({
                where:{
                    id:id
                },
                data:{
                    useFlag:false
                }
            });

            return {success:true, status:HttpStatus.OK};
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 발송목록 고정
     * @param id 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
        }>
     */
    async fixSendList(id:number){
        try{
            await this.prisma.sendList.update({
                where:{
                    id:id
                },
                data:{
                    fixFlag:true,
                }
            });

            return {success:true, status:HttpStatus.OK};
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 발송목록 고정 해제
     * @param id 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
        }>
     */
    async cancelFix(id:number){
        try{
            await this.prisma.sendList.update({
                where:{
                    id:id
                },
                data:{
                    fixFlag:false
                }
            });

            return {success:true, status:HttpStatus.OK};
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 발송목록 타이틀 변경
     * @param updateTitleDto 
     * @returns {success:boolean; status:number}
     */
    async updateSendTitle(updateTitleDto: UpdateTitleDto){
        try{
            let check = await this.checkSendTitle(updateTitleDto.title);

            if(check.success){
                await this.prisma.sendList.update({
                    where:{
                        id:updateTitleDto.id
                    },
                    data:{
                        title:updateTitleDto.title
                    }
                });
    
                return {success:true, status:HttpStatus.OK};
            }else{
                return {success:false, status:HttpStatus.CONFLICT};
            }
           
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 해당 날짜에 다른 발송 목록이 있는지 체크
     * @param title :string
     * @returns {success:boolean}
     */
    async checkSendTitle(title:string){
        try{
            const response = await this.prisma.sendList.findMany({
                where:{title:title}
            });

            if(response.length == 0) return {success:true};
            else return {success:false};
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 발송목록 완료 안 된 전체 리스트 가져오기(입금상담목록에서 발송목록을 선택해서 넘기기)
     * @returns  Promise<{
            success: boolean;
            list: {
                id: number;
                title: string;
                amount: number;
            }[];
            status: HttpStatus;
        } | {
            success: boolean;
            status: HttpStatus;
            list?: undefined;
        }>
     */
    async getAllSendList(){
        //useFlag가 true인 것만 가져옵니다.false는 이미 발송 완료 처리 되었을 때 되기 때문에 발송 나간건 x
        try{
            const response = await this.prisma.sendList.findMany({
                where:{useFlag:true},
                select:{title:true, id:true, amount:true,fixFlag:true}
            }); 

            console.log(response);
            return {success:true, list:response, status:HttpStatus.OK};
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }

    /**
     * 완료 처리 된 발송목록 조회
     * @returns Promise<{
            success: boolean;
            list: {
                id: number;
                title: string;
                amount: number;
                date: Date;
                full: boolean;
                useFlag: boolean;
                fixFlag: boolean;
            }[];
            status: HttpStatus;
        } | {
            success: boolean;
            status: HttpStatus;
            list?: undefined;
        }>
     */
    async completeSendList(){
        try{
            const list = await this.prisma.sendList.findMany({
                where:{useFlag:false}
            });

            return {success:true, list, status:HttpStatus.OK};
        }catch(err){
            this.logger.error(err);
            return {
                success:false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            }
        }
    }


}