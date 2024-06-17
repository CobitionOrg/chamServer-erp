import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { UpdateSurveyDto } from "./Dto/updateSurvey.dto";
import { error } from "winston";
import * as Excel from 'exceljs'
import { styleHeaderCell } from "src/util/excelUtil";
import { ErpService } from "./erp.service";
import { getItem, getItemAtAccount } from "src/util/getItem";
import { SendOrder } from "./Dto/sendExcel.dto";
import { UpdateTitleDto } from "./Dto/updateTitle.dto";
import { GetOrderSendPrice } from "src/util/getOrderPrice";
import { getSortedList } from "src/util/sortSendList";
import { AddSendDto } from "./Dto/addSend.dto";
import { InsertUpdateInfoDto } from "./Dto/insertUpdateInfo.dto";
import { CancelSendOrderDto } from "./Dto/cancelSendOrder.dto";
import { getFooter } from "src/util/accountBook";

//발송 목록 조회 기능
@Injectable()
export class SendService {
    constructor(
        private prisma: PrismaService,
        private erpService: ErpService
    ) { }

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
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
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
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 발송목록(tempOrder)에서 가져오기
     * @returns 
     */
    async getOrderTempList(id: number) {
        try {
            const list = await this.prisma.tempOrder.findMany({
                where: {
                    sendListId: id
                },
                orderBy: {
                    //id: 'asc',
                    orderSortNum: 'asc' //sortNum으로 order by 해야됨
                },
                select: {
                    id: true,
                    outage: true,
                    date: true,
                    isFirst: true,
                    orderSortNum: true,
                    sendNum: true,
                    payType: true,
                    addr: true,
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
                            price: true,
                            orderItems: {
                                select: { item: true, type: true }
                            }
                        }
                    },
                    orderUpdateInfos:{
                        select:{
                            info:true
                        }
                    },
                    tempOrderItems: {
                        select: {
                            item: true
                        }
                    }
                }
            });

            const sortedList = getSortedList(list);

            return { success: true, list: sortedList };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * tempOrder 테이블에서 하나만 조회
     * @param id 
     * @returns 
     */
    async getOrderTempOne(id: number) {
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
                    tempOrderItems: {
                        select: {
                            item: true
                        }
                    }
                }
            });

            return { success: true, list };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 발송목록에서 오더 수정
     * @param surveyDto 
     * @returns 
     */
    async updateSendOrder(surveyDto: UpdateSurveyDto) {
        try {
            const insertOrder = surveyDto.answers;
            const patientId = surveyDto.patientId;
            const orderId = surveyDto.orderId;

            const objPatient: any = {};
            const objOrder: any = {};
            const objOrderItem: any = [];

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
            const getOrderPrice = new GetOrderSendPrice(objOrderItem, itemList);
            const price = getOrderPrice.getPrice();

            await this.prisma.$transaction(async (tx) => {
                const patient = await tx.patient.update({
                    where: {
                        id: patientId
                    },
                    data: {
                        addr: objPatient.addr,
                        phoneNum: objPatient.phoneNum
                    }
                });

                const order = await tx.order.update({
                    where: {
                        id: orderId
                    },
                    data: {
                        cachReceipt: objOrder.cashReceipt,
                        price: price
                    }
                });

                console.log('----------------')
                console.log(objOrderItem)
                const items = [];
                objOrderItem.forEach((e) => {
                    if (e.type == 'assistant') {
                        //assistant는 string
                        const obj = {
                            item: e.item,
                            type: e.type,
                            orderId: orderId
                        }
                        items.push(obj);
                    } else {
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
                    where: {
                        orderId: orderId
                    }
                });

                //새 order items 생성
                const orderItem = await tx.orderItem.createMany({
                    data: items
                });
            });

            return { success: true, status: HttpStatus.CREATED };

        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );

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
    async sendNumExcel(id: number) {
        try {
            const send = await this.getOrderTempList(id);
            const list = send.list;

            const wb = new Excel.Workbook();
            const sheet = wb.addWorksheet("송장 시트");

            const headers = ['이름', ' ', '주소', ' ', '번호', '1', ' ', '10', '주문수량', ' ', '메세지', '발송자', '발송주소', '번호'];
            const headerWidths = [16, 3, 40, 3, 20, 4, 3, 4, 40, 3, 20, 20, 35, 35];

            const headerRow = sheet.addRow(headers);
            headerRow.height = 30.75;

            headerRow.eachCell((cell, colNum) => {
                styleHeaderCell(cell);
                sheet.getColumn(colNum).width = headerWidths[colNum - 1];
            });

            list.forEach((e) => {
                const { name, phoneNum } = e.patient;
                const addr = e.addr;
                const message = e.order.message;
                const orderItemList = e.order.orderItems;
                let orderStr = '';

                for (let i = 0; i < orderItemList.length; i++) {
                    let item = getItem(orderItemList[i].item);
                    if (item !== '') {
                        if (i == orderItemList.length - 1) orderStr += `${item}`
                        else orderStr += `${item}+`
                    }
                }

                const rowDatas = [name, '', addr, '', phoneNum, '1', '', '10', orderStr, '', message, '참명인한의원', '서울시 은평구 은평로 104 3층 참명인한의원', '02-356-8870'];

                const appendRow = sheet.addRow(rowDatas);
            });

            const fileData = await wb.xlsx.writeBuffer();
            const url = await this.erpService.uploadFile(fileData);

            return { success: true, status: HttpStatus.OK, url };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
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
    async setSendNum(sendExcelDto: SendOrder[]) {
        try {
            console.log(sendExcelDto);
            const qryArr = [];

            sendExcelDto.forEach(async (e) => {
                console.log(e);
                const qry = this.prisma.tempOrder.update({
                    where: {
                        id: e.id
                    },
                    data: {
                        sendNum: e.sendNum
                    }
                });

                qryArr.push(qry);

            });

            await Promise.all([...qryArr]).then((value) => {
                console.log(value);
                return { success: true, status: HttpStatus.OK };
            }).catch((err) => {
                this.logger.error(err);
                return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR };
            });

            return { success: true, status: HttpStatus.OK };

        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
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
    async getSendList() {
        try {
            const list = await this.prisma.sendList.findMany({
                where: {
                    useFlag: true
                },
                orderBy: {
                    title: 'asc'
                }
            });

            return { success: true, list };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }


    async getCompleteSend() {
        try {
            const list = await this.prisma.sendList.findMany({
                where: {
                    useFlag: false
                },
                orderBy: {
                    title: 'asc'
                }
            });

            return { success: true, list };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                msg: '내부서버 에러'
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
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
    async completeSend(id: number) {
        try {
            await this.prisma.sendList.update({
                where: {
                    id: id
                },
                data: {
                    useFlag: false
                }
            });

            return { success: true, status: HttpStatus.OK };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
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
    async fixSendList(id: number) {
        try {
            await this.prisma.sendList.update({
                where: {
                    id: id
                },
                data: {
                    fixFlag: true,
                }
            });

            return { success: true, status: HttpStatus.OK };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
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
    async cancelFix(id: number) {
        try {
            await this.prisma.sendList.update({
                where: {
                    id: id
                },
                data: {
                    fixFlag: false
                }
            });

            return { success: true, status: HttpStatus.OK };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 발송목록 타이틀 변경
     * @param updateTitleDto 
     * @returns {success:boolean; status:number}
     */
    async updateSendTitle(updateTitleDto: UpdateTitleDto) {
        try {
            let check = await this.checkSendTitle(updateTitleDto.title);

            if (check.success) {
                await this.prisma.sendList.update({
                    where: {
                        id: updateTitleDto.id
                    },
                    data: {
                        title: updateTitleDto.title
                    }
                });

                return { success: true, status: HttpStatus.OK };
            } else {
                return { success: false, status: HttpStatus.CONFLICT };
            }

        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 해당 날짜에 다른 발송 목록이 있는지 체크
     * @param title :string
     * @returns {success:boolean}
     */
    async checkSendTitle(title: string) {
        try {
            const response = await this.prisma.sendList.findMany({
                where: { title: title }
            });

            if (response.length == 0) return { success: true };
            else return { success: false };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
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
    async getAllSendList() {
        //useFlag가 true인 것만 가져옵니다.false는 이미 발송 완료 처리 되었을 때 되기 때문에 발송 나간건 x
        try {
            const response = await this.prisma.sendList.findMany({
                where: { useFlag: true },
                select: { title: true, id: true, amount: true, fixFlag: true }
            });

            console.log(response);
            return { success: true, list: response, status: HttpStatus.OK };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
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
    async completeSendList() {
        try {
            const list = await this.prisma.sendList.findMany({
                where: { useFlag: false }
            });

            return { success: true, list, status: HttpStatus.OK };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
    * 챠팅 용 엑셀
    * @returns {success:true,status:HttpStatus.OK,url};
    */
    async chatingExcel(id:number) {
        try {
            // 차팅 : 핸드폰번호 주문수량 결제방식 

            //날짜 조건 걸 예정
            const res = await this.getOrderTempList(id);
            const list = res.list;

            console.log('==================');
            console.log(list);
            const wb = new Excel.Workbook();
            const sheet = wb.addWorksheet("챠팅 엑셀");
            const header = ['이름', '핸드폰 번호', '주문수량', '결제방식'];
            const headerWidths = [16, 30, 40, 10];

            const headerRow = sheet.addRow(header);
            headerRow.height = 30.75;

            headerRow.eachCell((cell, colNum) => {
                styleHeaderCell(cell);
                sheet.getColumn(colNum).width = headerWidths[colNum - 1];
            });

            let sepearteId = 0;
            list.forEach((e) => {
                if(e.orderSortNum == 6){
                    if(sepearteId == e.order.id){
                        return;
                    }else{
                        sepearteId = e.order.id
                    }
                }
                const { name, phoneNum } = e.patient;
                console.log(e.tempOrderItems)
                let items = '';

                for (let i = 0; i < e.order.orderItems.length; i++) {
                    console.log(e.order.orderItems[i].item)
                    const item = getItem(e.order.orderItems[i].item);
                    items += `${item}/`
                }

                const payType = e.payType;

                const rowDatas = [name, phoneNum, items, payType];
                const appendRow = sheet.addRow(rowDatas);
            });

            const fileData = await wb.xlsx.writeBuffer();
            const url = await this.erpService.uploadFile(fileData);

            return { success: true, status: HttpStatus.OK, url };
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }


    /**
     * 추가 발송일자 변경 - 장부에만 들어가는 발송일자 변경 인원들
     * @param addSendDto 
     * @returns {success:boolean,status:HttpStatus};
     */
    async addSend(addSendDto: AddSendDto){
        try{
            const data = await this.prisma.addSend.findMany({
                where:{tempOrderId:addSendDto.tempOrderId}
            });

            if(data.length>0){ //이미 addSend 처리 되있을 경우 기존 데이터 삭제
                await this.prisma.addSend.deleteMany({
                    where:{tempOrderId:addSendDto.tempOrderId}
                });
            }

            await this.prisma.addSend.create({
                data:{
                    tempOrderId: addSendDto.tempOrderId,
                    sendListId: addSendDto.sendListId
                }
            });

            return {success:true, status:HttpStatus.CREATED};
        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 발송목록에서 수정하는 데이터 수정 체크 리스트 불러오기
     * @param id: number
     * @returns Promise<{
        success: boolean;
        status: HttpStatus;
        list: {
            id: number;
            info: string;
        }[];
     */
    async getUpdateInfo(id: number){
        try{
            const list = await this.prisma.updateInfo.findMany();

            const checked = await this.prisma.orderUpdateInfo.findMany({
                where:{tempOrderId:id}
            });

            return {success:true, status:HttpStatus.OK, list, checked}
        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 체크된 수정 데이터 orderUpdateInfo 테이블에 데이터 넣기
     * @param insertUpdateInfoDto 
     * @returns {success:boolean,status:HttpStatus};
     */
    async insertUpdateInfo(insertUpdateInfoDto: InsertUpdateInfoDto){
        try{
            const qryArr = insertUpdateInfoDto.infoData.map(async e => {
                console.log(e);
                return this.prisma.orderUpdateInfo.create({
                    data:{
                        info:e.info,
                        updateInfoId: e.id,
                        tempOrderId:insertUpdateInfoDto.tempOrderId
                    }
                });

            });

            await Promise.all([...qryArr]).then((value) => {
                return {success:true, status:HttpStatus.CREATED};
            }).catch((err) => {
                this.logger.error(err);
                throw new HttpException({
                    success: false,
                    status: HttpStatus.INTERNAL_SERVER_ERROR
                },
                    HttpStatus.INTERNAL_SERVER_ERROR
                );
            });
           
            return {success:true, status:HttpStatus.CREATED};


        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 발송 목록에서 주문 취소 처리
     * @param cancelOrderDto 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
            msg: string;
        }>
     */
    async cancelSendOrder(cancelOrderDto: CancelSendOrderDto){
        try{
            if(cancelOrderDto.isFirst){
                //초진 일 시 환자 데이터까지 삭제
                const tempOrderId = cancelOrderDto.tempOrderId;
                const orderId = cancelOrderDto.orderId;
                const patientId = cancelOrderDto.patientId;

                await this.prisma.$transaction(async (tx) => {
                    //orderBodyType 삭제
                    await tx.orderBodyType.delete({
                        where:{orderId:orderId}
                    });

                    //addSend 삭제
                    await tx.addSend.deleteMany({
                        where:{tempOrderId:tempOrderId}
                    });

                    //temp orderItem 삭제
                    await tx.tempOrderItem.deleteMany({
                        where:{tempOrderId:tempOrderId}
                    });

                    //orderItem 삭제
                    await tx.orderItem.deleteMany({
                        where:{orderId:orderId}
                    });

                    //orderUpdateInfo 삭제
                    await tx.orderUpdateInfo.deleteMany({
                        where:{tempOrderId:tempOrderId}
                    })

                    //tempOrder 삭제
                    await tx.tempOrder.delete({
                        where:{id:tempOrderId}
                    });

                    //order 삭제
                    await tx.order.delete({
                        where:{id:orderId}
                    });

                    //patient 삭제
                    await tx.patient.delete({
                        where:{id:patientId}
                    });

                });

                return {success:true, status:HttpStatus.OK, msg:'초진 삭제'}
            }else{
                //재진 일 시 
                const tempOrderId = cancelOrderDto.tempOrderId;
                const orderId = cancelOrderDto.orderId;

                await this.prisma.$transaction(async (tx) => {
                    //addSend 삭제
                    await tx.addSend.deleteMany({
                        where:{tempOrderId:tempOrderId}
                    });
    
                    //temp orderItem 삭제
                    await tx.tempOrderItem.deleteMany({
                        where:{tempOrderId:tempOrderId}
                    });
    
                    //orderUpdateInfo 삭제
                    await tx.orderUpdateInfo.deleteMany({
                        where:{tempOrderId:tempOrderId}
                    })

                    //tempOrder 삭제
                    await tx.tempOrder.delete({
                        where:{id:tempOrderId}
                    });

                    //오더만 isComplete를 true로 변경
                    await tx.order.update({
                        where:{id:orderId},
                        data:{isComplete:true}
                    });
                });
               

                return {success:true, status:HttpStatus.OK, msg:'재진 삭제'}
            }
        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * 장부 출력
     * @param id 
     * @returns  Promise<{
            success: boolean;
            status: HttpStatus;
            url: any;
        }>
     */
    async accountBook(id:number){
        try{
            const sendList = await this.prisma.sendList.findFirst({
                where:{id:id},
                select:{
                    id:true,
                    title:true,
                    amount:true,
                    tempOrders:{
                        where:{
                            NOT:{
                                orderSortNum:-4 //환불 데이터 제외
                            }
                        },
                        orderBy:{orderSortNum:'asc'},
                        select:{
                            id: true,
                            isFirst: true,
                            orderSortNum: true,
                            patient: {
                                select: {
                                    id: true,
                                    name: true,
                                }
                            },
                            order: {
                                select: {
                                    id: true,
                                    message: true,
                                    payType:true,
                                    cachReceipt: true,
                                    price: true,
                                    card: true,
                                    cash: true,
                                    remark:true,
                                    orderItems: {
                                        select: { item: true, type: true }
                                    }
                                }
                            },
                            tempOrderItems: {
                                select: {
                                    item: true
                                }
                            }
                        }
                    },
                    addSends:{
                        select:{
                            tempOrder:{
                                select:{
                                    id: true,
                                    isFirst: true,
                                    orderSortNum: true,
                                    patient: {
                                        select: {
                                            id: true,
                                            name: true,
                                        }
                                    },
                                    order: {
                                        select: {
                                            id: true,
                                            message: true,
                                            payType:true,
                                            cachReceipt: true,
                                            price: true,
                                            card: true,
                                            cash: true,
                                            remark:true,
                                            orderItems: {
                                                select: { item: true, type: true }
                                            }
                                        }
                                    },
                                    tempOrderItems: {
                                        select: {
                                            item: true
                                        }
                                    }
                                }
                            },
                        }
                    }
                }
            });

            //console.log(sendList);
            
            const tempOrderList = sendList.tempOrders;

            const wb = new Excel.Workbook();
            const sheet = wb.addWorksheet('감비환장부');
            
            //헤더 부분
            sheet.mergeCells('A1:K1');
            sheet.getCell('G1').value = '감비환 장부'

            //주문 내역 부분
            const headers = ["","설문지번호","초/재","이름","감&쎈","요요","입금","카드","별도구매","특이사항","현금영수증"];
            const headerWidths = [5,16,9,16,15,10,16,16,12,25,18];

            const headerRow = sheet.addRow(headers);
            headerRow.height = 30.75;

            headerRow.eachCell((cell, colNum) => {
                styleHeaderCell(cell);
                sheet.getColumn(colNum).width = headerWidths[colNum - 1];
            });

            
            let isSeparteId = 0;

            tempOrderList.forEach((e,i) => {
                if(e.orderSortNum != 6) { //분리 배송이 아닐 때
                    const orderId = e.order.id;
                    const isFirst = e.isFirst ? '초진' : '재진';
                    const name = e.patient.name;
                    const {common, yoyo, assistant} = getItemAtAccount(e.order.orderItems);
                    const cash = e.order.cash == 0 ? '' : e.order.cash;
                    const card = e.order.card == 0? '' : e.order.card;
                    const message = e.order.remark+'/' ?? ''+  e.order.message;
                    const cashReceipt = e.order.payType=='계좌이체' && e.order.cachReceipt == null ? 'x': ''; 
               
                    const rowDatas = [i+1,orderId,isFirst,name,common,yoyo,cash,card,assistant,message,cashReceipt];
    
                    const appendRow = sheet.addRow(rowDatas);
                }else if(e.orderSortNum == 6) { //분래 배송일 시
                    if(isSeparteId == e.order.id){
                        console.log('already insert data');
                    }else {
                        isSeparteId = e.order.id;

                        const orderId = e.order.id;
                        const isFirst = e.isFirst ? '초진' : '재진';
                        const name = e.patient.name;
                        const {common, yoyo, assistant} = getItemAtAccount(e.order.orderItems);
                        const cash = e.order.cash == 0 ? '' : e.order.cash;
                        const card = e.order.card == 0? '' : e.order.card;
                        const message = e.order.remark ?? '' + '/' +  e.order.message;
                        const cashReceipt = e.order.payType=='계좌이체' && e.order.cachReceipt == null ? 'x': ''; 
                   
                        const rowDatas = [i+1,orderId,isFirst,name,common,yoyo,cash,card,assistant,message,cashReceipt];
        
                        const appendRow = sheet.addRow(rowDatas);
                    }

                }
                
            });

            //footer 부분
            const footer = ['','로젠','총인원','총갯수','세부','현금','카드','비고'];
            // const footerWidths = [5,25,9,16,15,10,16,16,12,25,18];

            const {logen, orderCount, fullCount, detail, card, cash, note } = getFooter(tempOrderList,sendList.addSends);
            const rowDatas = [
                '',
                logen,
                orderCount,
                fullCount,
                detail,
                cash,
                card,
                note
            ];

            const footerRow = sheet.addRow(footer);
            footerRow.height = 30.75;

            footerRow.eachCell((cell, colNum) => {
                styleHeaderCell(cell);
                sheet.getColumn(colNum).width = headerWidths[colNum - 1];
            });

            const appendRow = sheet.addRow(rowDatas);

            const fileData = await wb.xlsx.writeBuffer();
            const url = await this.erpService.uploadFile(fileData);

            return {success:true, status: HttpStatus.OK, url};
        }catch(err){
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }


}