import { HttpException, HttpStatus, Inject, Injectable, Logger, forwardRef } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { UpdateSurveyDto } from "./Dto/updateSurvey.dto";
import { error } from "winston";
import * as Excel from 'exceljs'
import { styleHeaderCell, styleCell, setColor } from "src/util/excelUtil";
import { ErpService } from "./erp.service";
import { getAssistantItem, getCommonItem, getItem, getItemAtAccount, getServiceItem, getYoyoItem } from "src/util/getItem";
import { SendOrder } from "./Dto/sendExcel.dto";
import { UpdateTitleDto } from "./Dto/updateTitle.dto";
import { GetOrderSendPrice, checkSend, getOnlyPrice } from "src/util/getOrderPrice";
import { getSortedList } from "src/util/sortSendList";
import { AddSendDto } from "./Dto/addSend.dto";
import { InsertUpdateInfoDto } from "./Dto/insertUpdateInfo.dto";
import { CancelSendOrderDto } from "./Dto/cancelSendOrder.dto";
import { getFooter, getItemOnlyLen, orderItemLen } from "src/util/accountBook";
import { Crypto } from "src/util/crypto.util";
import { sortItems } from "src/util/sortItems";
import { UpdateSendPriceDto } from "./Dto/updateSendPrice.dto";
import { generateUploadURL } from "src/util/s3";
import axios from "axios";
import { getPhoneNum } from "src/util/getPhoneNum";
import { orderUpdateInfo } from "src/util/orderUpdateInfo";
import { checkOutage } from "src/util/getOutage";

//발송 목록 조회 기능
@Injectable()
export class SendService {
    constructor(
        private prisma: PrismaService,
        private erpService: ErpService,
        private crypto: Crypto
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
     * 발송목록 조회
     * @param id 
     * @returns 
     */
    async getOrderTemp(id: number) {
        try {
            const sendList = await this.prisma.sendList.findUnique({
                where: { id: id },
                select: { fixFlag: true }
            });

            if (sendList.fixFlag) {
                //고정된 발송목록
                return await this.getFixOrderTempList(id);
            } else {
                //고정 안 된 발송목록
                return await this.getOrderTempList(id);
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
     * 발송목록 엑셀 데이터 다운
     * @param id 
     * @returns 
     */
    async sendListExcel(id: number) {
        try{
            const sendOne = await this.getOrderTemp(id);
            const list = sendOne.list;

            const wb = new Excel.Workbook();
            const sheet = wb.addWorksheet("발송목록");

            const headers = ["주문수정","감량킬로수","설문지번호","이름","휴대폰 번호","감&쎈","요요","현금","현금영수증&카드","카드","별도구매","특이","초진/재진","송장번호"];
            const headerWidths = [17,13,11,10,12,8,8,10,12,10,13,20,12,11];

            const headerRow = sheet.addRow(headers);
            headerRow.height = 30.75;

            headerRow.eachCell((cell, colNum) => {
                styleHeaderCell(cell);
                sheet.getColumn(colNum).width = headerWidths[colNum - 1];
            });

            for(const e of list) {
                const updateInfo = orderUpdateInfo(e.orderUpdateInfos);
                const outage = checkOutage(e.outage) ? e.outage : "";
                const id = e.order.id;
                const {name,phoneNum} = e.patient;
                const commonItem = getCommonItem(e.order.orderItems);
                const yoyoItem = getYoyoItem(e.order.orderItems);
                const cash = e.order.cash;
                const cashReceipt =  e.order.cachReceipt != "" ? e.order.cachReceipt : "x";
                const card = e.order.card;
                const assistantItem = getAssistantItem(e.order.orderItems);
                const remark = e.order.remark;
                const isFirst = e.order.isFirst == true ? '초진' : '재진';
                const sendNum = e.sendNum;

                const rowData = [
                    updateInfo,
                    outage, 
                    id, 
                    name, 
                    phoneNum, 
                    commonItem,
                    yoyoItem,
                    cash,
                    cashReceipt,
                    card,
                    assistantItem,
                    remark,
                    isFirst,
                    sendNum
                ];

                const appendRow = sheet.addRow(rowData);

            }

            const fileData = await wb.xlsx.writeBuffer();
            const url = await this.erpService.uploadFile(fileData);

            return { success:true, status: HttpStatus.OK, url };
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
     * 고정 된 발송목록(tempOrder)에서 가져오기
     * @param id 
     */
    async getFixOrderTempList(id: number) {
        try {
            console.log('this is fixed list');
            const list = await this.prisma.tempOrder.findMany({
                where: {
                    sendListId: id
                },
                orderBy: {
                    //id: 'asc',
                    sortFixNum: 'asc' //sortNum으로 order by 해야됨
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
                    updateInfoCheck: true,
                    updateInfoCheckGam: true,
                    updatePrciecFlag: true,
                    cancelFlag: true,
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
                            remark: true,
                            cachReceipt: true,
                            price: true,
                            cash: true,
                            card: true,
                            orderSortNum: true,
                            combineNum: true,
                            payFlag: true,
                            orderItems: {
                                select: { item: true, type: true }
                            }
                        }
                    },
                    orderUpdateInfos: {
                        select: {
                            info: true
                        }
                    },
                    tempOrderItems: {
                        select: {
                            id: true,
                            item: true,
                            sendTax: true,
                        }
                    }
                }
            });

            const sortItemsList = sortItems(list, true);

            for (let row of sortItemsList) {
                const decryptedAddr = this.crypto.decrypt(row.addr);
                const decryptedPhoneNum = this.crypto.decrypt(row.patient.phoneNum);
                row.addr = decryptedAddr;
                row.patient.phoneNum = decryptedPhoneNum;
            }

            const detail = orderItemLen(list);

            return { success: true, list: sortItemsList, detail };
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
     * 고정 안 된 발송목록(tempOrder)에서 가져오기
     * @returns 
     */
    async getOrderTempList(id: number) {
        try {
            console.log('this list is not fixed');
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
                    updateInfoCheck: true,
                    updateInfoCheckGam: true,
                    updatePrciecFlag: true,
                    cancelFlag: true,
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
                            remark: true,
                            cachReceipt: true,
                            price: true,
                            cash: true,
                            card: true,
                            orderSortNum: true,
                            combineNum: true,
                            payFlag: true,
                            orderItems: {
                                select: { item: true, type: true }
                            }
                        }
                    },
                    orderUpdateInfos: {
                        select: {
                            info: true
                        }
                    },
                    tempOrderItems: {
                        select: {
                            id: true,
                            item: true,
                            sendTax: true,
                        }
                    }
                }
            });

            const sortItemsList = sortItems(list, true);

            const sortedList = getSortedList(sortItemsList);

            for (let row of sortedList) {
                const decryptedAddr = this.crypto.decrypt(row.addr);
                const decryptedPhoneNum = this.crypto.decrypt(row.patient.phoneNum);
                row.addr = decryptedAddr;
                row.patient.phoneNum = decryptedPhoneNum;
            }

            const detail = orderItemLen(list);

            return { success: true, list: sortedList, detail };
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

    async updateCheck() {
        try{
            let sendListId = 234 
            await this.prisma.$transaction(async (tx) => {
                await tx.sendList.update({
                    where:{id:sendListId},
                    data:{amount:0}
                });

                const tempOrders = await tx.tempOrder.findMany({
                    where:{sendListId:sendListId},
                    select:{
                        id:true,
                        order:{
                            select:{orderItems:true}
                        }
                    }
                });

                for(const e of tempOrders) {
                    const amount = getItemOnlyLen(e.order.orderItems);
                    const send = await tx.sendList.findUnique({
                        where:{id:sendListId},
                        select:{amount:true}
                    });

                    const amountSum = amount + send.amount;

                    if(amountSum < 350){
                        await tx.sendList.update({
                            where:{id:sendListId},
                            data:{amount:amountSum}
                        });

                        await tx.tempOrder.update({
                            where:{id:e.id},
                            data:{sendListId:sendListId}
                        })
                    }else{
                        await tx.sendList.update({
                            where:{id:sendListId},
                            data:{fixFlag:true, full:true}
                        });

                        sendListId+=1;
                        await tx.tempOrder.update({
                            where:{id:e.id},
                            data:{sendListId:sendListId}
                        })

                    }
                }
            });

            return {success:true}
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
                    sendNum: true,
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
                            payType: true,
                            orderSortNum: true,
                            addr: true,
                            price: true,
                            card: true,
                            cash: true,
                            remark:true,
                            orderItems: {
                                select: { item: true, type: true }
                            },
                            friendRecommends:{
                                select:{
                                    checkFlag: true,
                                    name: true,
                                    phoneNum: true,
        
                                }
                            },
                        }
                    },
                    tempOrderItems: {
                        select: {
                            item: true
                        }
                    }
                }
            });

            const decryptedPhoneNum = this.crypto.decrypt(list.patient.phoneNum);
            const decryptePatientdAddr = this.crypto.decrypt(list.patient.addr);
            const decrypteAddr = this.crypto.decrypt(list.order.addr);
            list.patient.phoneNum = decryptedPhoneNum;
            list.patient.addr = decryptePatientdAddr;
            list.order.addr = decrypteAddr;

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


    //async cardPay(id: number)

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
                    throw new HttpException({
                        success: false,
                        status: HttpStatus.BAD_REQUEST
                    },
                        HttpStatus.BAD_REQUEST
                    );
                }
            });


            await this.prisma.$transaction(async (tx) => {
                const exTempOrder = await tx.tempOrder.findMany({
                    where: { orderId: orderId },
                    select: {
                        orderSortNum: true,
                        tempOrderItems: {
                            select: {
                                id: true,
                                sendTax: true
                            }
                        },
                        order: {
                            select: {
                                price: true,
                                orderItems: true,
                                payFlag: true,
                                combineNum: true,
                                payType:true
                            }
                        }
                    }
                });

                let price = 0;
                const itemList = await this.erpService.getItems();
                const getOrderPrice = new GetOrderSendPrice(objOrderItem, itemList); //새로 수정된 항목으로 가격 산출 객체 생성

                if (exTempOrder[0].orderSortNum < 6) {
                    //합배송, 분리 배송이 아닐 시
                    price = getOrderPrice.getPrice(exTempOrder[0].orderSortNum);
                } else if (exTempOrder[0].orderSortNum == 6) {
                    console.log('합배송일 시')

                    const combineOrders = await tx.order.findMany({
                        where: {
                            combineNum: exTempOrder[0].order.combineNum
                        },
                        select: {
                            orderItems: true,
                            price: true,
                            id: true,
                            payType: true,
                            card: true,
                            cash: true
                        }
                    }); //기존 합배송 데이터 

                    const anotherOrder = combineOrders.filter(i => i.id !== orderId);

                    const tempObjOrder = [];
                    objOrderItem.forEach(e => tempObjOrder.push(e))
                    anotherOrder[0].orderItems.forEach(e => tempObjOrder.push(e));

                    let sendTaxFlag = checkSend(tempObjOrder); //수정 되는 주문이 택배비 부과 주문인지
                    console.log('sendTaxFlag : ' + sendTaxFlag);
                    if (sendTaxFlag) {
                        //택배비 부과 주문일 시
                        price = getOnlyPrice(objOrderItem, itemList);
                        let anotherPrice = getOnlyPrice(anotherOrder[0].orderItems, itemList);

                        price > anotherPrice ? anotherPrice += 3500 : price += 3500; //일단 가격이 적은 쪽으로 택배비 책정

                        console.log('-------------' + anotherPrice);
                        console.log('///////////////' + price);
                        await tx.order.update({
                            where: { id: anotherOrder[0].id },
                            data: { price: anotherPrice }
                        });

                    } else {
                        //택배비 부과 주문이 아닐 시
                        price = getOnlyPrice(objOrderItem, itemList); //수정된 주문의 가격만 책정

                        //택배비 부과 주문이 아니기 때문에 같이 묶인 합배송도 해당 가격만 책정해서 업데이트
                        let anotherPrice = getOnlyPrice(anotherOrder[0].orderItems, itemList);

                        await tx.order.update({
                            where: { id: anotherOrder[0].id },
                            data: { price: anotherPrice }
                        })
                    }



                } else if (exTempOrder[0].orderSortNum == 7) {
                    //분리배송 일시
                    price = getOnlyPrice(objOrderItem, itemList);//수정된 주문의 제품 가격만 합산

                    if (surveyDto.separateOrder !== undefined) {
                        if (surveyDto.separateOrder.sendTax) price += 3500;

                        exTempOrder.forEach((e) => {
                            console.log(e);
                            if (e.tempOrderItems.id !== surveyDto.separateOrder.id && e.tempOrderItems.sendTax) {
                                //각 분리 배송 데이터가 택배비를 받아야 할 때
                                price += 3500; //제품 가격에 택배비 합산
                            }
                        });
                    }

                }

                const checkDiscount = await tx.order.findUnique({
                    where: { id: orderId },
                    select: { friendDiscount: true }
                });

                //지인 할인 여부 확인 시 10퍼센트 할인 처리
                if (checkDiscount.friendDiscount) {
                    price = getOrderPrice.getTenDiscount();
                }

                console.log('---------------' + price + '-----------------')

                const encryptedAddr = this.crypto.encrypt(objPatient.addr);
                const encryptedPhoneNum = this.crypto.encrypt(objPatient.phoneNum);

                const patient = await tx.patient.update({
                    where: {
                        id: patientId
                    },
                    data: {
                        addr: encryptedAddr,
                        phoneNum: encryptedPhoneNum
                    }
                });

                let cash = 0;
                let card = 0;
                let checkPriceFlag = false;

                if(price!=exTempOrder[0].order.price) {
                    checkPriceFlag = true;
                }

                if(objOrder.payType !== exTempOrder[0].order.payType){
                    checkPriceFlag = true;
                }
               

                if(objOrder.payType ==='계좌이체'){
                    if(price !== parseInt(objOrder.card) || price !== parseInt(objOrder.cash)) {
                        cash = price
                    }
                }else if(price !== parseInt(objOrder.card) || price !== parseInt(objOrder.cash)) {
                    if(price !== objOrder.card || price !== objOrder.cash) {
                        card = price
                    }
                }

                

                const order = await tx.order.update({
                    where: {
                        id: orderId
                    },
                    data: {
                        cachReceipt: objOrder.cashReceipt,
                        price: price,
                        sendNum: objOrder.sendNum,
                        remark: objOrder.remark,
                        addr: encryptedAddr,
                        message: objOrder.message,
                        payType: objOrder.payType,
                        card: card,
                        cash: cash,
                        orderSortNum: parseInt(objOrder.orderSortNum),
                        payFlag: exTempOrder[0].order.price == price ? exTempOrder[0].order.payFlag : 0, //주문이 수정 되었으므로 결제 미완료 처리
                    }
                });

                await tx.tempOrder.updateMany({
                    where: { orderId: orderId },
                    data: {
                        cachReceipt: objOrder.cashReceipt,
                        sendNum: objOrder.sendNum,
                        addr: encryptedAddr,
                        payType: objOrder.payType,
                        updatePrciecFlag: checkPriceFlag,
                        orderSortNum: parseInt(objOrder.orderSortNum),
                        
                    }
                });

                console.log('----------------')
                console.log(objOrderItem)
                const items = [];
                
                let assistantFlag = false;

                objOrderItem.forEach((e) => {
                    console.log(e);
                    if (e.type == 'assistant') {
                        //assistant는 string
                        const obj = {
                            item: e.item,
                            type: e.type,
                            orderId: orderId
                        }
                        items.push(obj);

                        if(e.item !== ''){
                            assistantFlag = true;
                        }
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

                if(assistantFlag && objOrder.orderSortNum === 1) {
                    //별도 주문이 추가 되어 orderSortNum이 특이로 바뀌어야 될 때
                    console.log('하이루')
                    await tx.tempOrder.updateMany({
                        where:{orderId:orderId},
                        data:{orderSortNum:2}
                    });

                    await tx.order.updateMany({
                        where:{id:orderId},
                        data:{orderSortNum:2}
                    });
                } 

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

                //분리 배송 시 업데이트
                if (surveyDto.separateOrder !== undefined) {
                    await tx.tempOrderItem.update({
                        where: {
                            id: surveyDto.separateOrder.id
                        },
                        data: {
                            item: surveyDto.separateOrder.orderItem,
                            sendTax: surveyDto.separateOrder.sendTax
                        }
                    });

                    const encryptedAddr = this.crypto.encrypt(surveyDto.separateOrder.addr);


                    await tx.tempOrder.updateMany({
                        where: { orderId: orderId },
                        data: {
                            addr: encryptedAddr
                        }
                    })

                }
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
     * 발송목록에서 금액만 수정
     * @param updateSendPriceDto 
     * @returns {success:boolean, status:HttpStatus, msg: string}
     */
    async updateSendPrice(updateSendPriceDto: UpdateSendPriceDto) {
        try {
            const orderId = updateSendPriceDto.id;
            const price = updateSendPriceDto.price;

            await this.prisma.$transaction(async (tx) => {
                const order = await tx.order.findUnique({
                    where: {id:orderId},
                    select:{
                        payType:true,
                        price: true
                    }
                });
    
                let card = order.payType =="카드결제" ? price:0;
                let cash = order.payType=='계좌이체' ? price:0;
                let updateCheck = price === order.price;
                await tx.order.update({
                    where: { id: orderId },
                    data: { price: price, card:card, cash:cash }
                });
    
                await tx.tempOrder.updateMany({
                    where:{orderId:orderId},
                    data:{updatePrciecFlag:!updateCheck}
                })
    
            });


            return { success: true, status: HttpStatus.CREATED, msg: '업데이트 완료' }
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
     * 미결제 처리
     * @param id orderId
     * @returns {success:boolean, status:HttpStatus}
     */
    async notPay(id: number) {
        try {
            await this.prisma.order.update({
                where: { id: id },
                data: { payFlag: 0 }
            });

            return { success: true, status: 201 };

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
     * 재결제 요청 처리
     * @param id orderId
     * @returns {success:boolean, status:HttpStatus}
     */
    async requestPay(id: number) {
        try {
            await this.prisma.order.update({
                where: { id: id },
                data: { payFlag: 2 }
            });

            return { success: true, status: 201 };

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
     * 결제 요청 처리
     * @param id 
     * @returns {success:boolean, status:HttpStatus}
     */
    async completePay(id: number) {
        try {
            await this.prisma.order.update({
                where: { id: id },
                data: { payFlag: 1 }
            });

            return { success: true, status: 201 };
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
            const send = await this.getFixOrderTempList(id);
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
            console.log('---------------------')
            console.log(list);
            for(const e of list){
                const { name, phoneNum } = e.patient;
                const addr = e.addr;
                const message = e.order.message;
                const orderItemList = e.order.orderItems;
                let orderStr = '';
                let service = 0;
                let assistant = '';
                for (let i = 0; i < orderItemList.length; i++) {
                    console.log(orderItemList[i]);
                    let item = getItem(orderItemList[i].item);
                    if (item !== '') {
                        const { onlyItem, serviceItem } = getServiceItem(item);
                        service += parseInt(serviceItem);
                        if(orderItemList[i].type !== 'assistant'){
                            if (i == orderItemList.length - 1) orderStr += `${onlyItem}`
                            else orderStr += `${onlyItem}+`
    
                        }else{
                            if (i == orderItemList.length - 1) assistant += `${onlyItem}`
                            else assistant += `${onlyItem}+`
                        }
                    }
                }
                if (orderStr.endsWith('+')) {
                    // 마지막 문자를 제거한 새로운 문자열 반환
                    orderStr = orderStr.slice(0, -1);
                }

                if (service != 0) {
                    orderStr += ` s(${service})`
                }

                if (orderStr == '감1개월+쎈1개월') {
                    orderStr += ` s(10)`;
                }

                if(assistant !== ''){
                    console.log('tlqkf');
                    if(orderStr !== ''){
                        orderStr+='+';
                    }

                    orderStr += ` ${assistant}`;
                }

                orderStr += ` ${e.order.remark}`;
                orderStr = orderStr.replaceAll("+"," ");

                const rowDatas = [name, '', addr, '', phoneNum, '1', '', '10', orderStr, '', message, '참명인한의원', '서울시 은평구 은평로 104 3층 참명인한의원', '02-356-8870'];

                const appendRow = sheet.addRow(rowDatas);

            }

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

            sendExcelDto.forEach((e) => {
                console.log(e);
                const qry = this.prisma.tempOrder.update({
                    where: {
                        id: e.id
                    },
                    data: {
                        sendNum: e.sendNum?.toString()
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


    /**발송목록 복구 */
    async sibal() {
        try{
            await this.prisma.$transaction(async (tx) => {
                
                const list = await tx.tempOrder.findMany({
                    where: { sendListId: 234 },
                    select: {
                        order: {
                            select: {
                                id: true
                            }
                        }
                    }
                });

                const qryArr = list.map(async (e) => {
                    return tx.order.update({
                        where: { id: e.order.id },
                        data: { useFlag: true }
                    });
                });

                await Promise.all([...qryArr]).then((value) => {
                    return { success: true, status: HttpStatus.CREATED };
                }).catch((err) => {
                    this.logger.error(err);
                    throw new HttpException({
                        success: false,
                        status: HttpStatus.INTERNAL_SERVER_ERROR
                    },
                        HttpStatus.INTERNAL_SERVER_ERROR
                    );
                });

            },{timeout:10000});


            return { success: true, status: HttpStatus.OK };

        }catch(err) {
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
            await this.prisma.$transaction(async (tx) => {
                await tx.sendList.update({
                    where: {
                        id: id
                    },
                    data: {
                        useFlag: false,
                        fixFlag: false,
                    }
                });

                const list = await tx.tempOrder.findMany({
                    where: { sendListId: id },
                    select: {
                        order: {
                            select: {
                                id: true
                            }
                        }
                    }
                });

                const qryArr = list.map(async (e) => {
                    return tx.order.update({
                        where: { id: e.order.id },
                        data: { useFlag: false }
                    });
                });

                await Promise.all([...qryArr]).then((value) => {
                    return { success: true, status: HttpStatus.CREATED };
                }).catch((err) => {
                    this.logger.error(err);
                    throw new HttpException({
                        success: false,
                        status: HttpStatus.INTERNAL_SERVER_ERROR
                    },
                        HttpStatus.INTERNAL_SERVER_ERROR
                    );
                });

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
            await this.prisma.$transaction(async (tx) => {
                await tx.sendList.update({
                    where: {
                        id: id
                    },
                    data: {
                        fixFlag: true,
                    }
                });

                await this.fixSortNum(id, tx);

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

    async fixSortNum(id: number, tx: any) {
        try {
            const sendData = await this.getOrderTempList(id);

            const list = sendData.list; //발송목록 tempOrder list;

            // console.log(list);
            for (let i = 0; i < list.length; i++) {
                console.log(list[i]);
                await tx.tempOrder.update({
                    where: { id: list[i].id },
                    data: { sortFixNum: i + 1 }
                });
            }

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
            console.log(updateTitleDto.date)
            let check = await this.checkSendTitle(updateTitleDto.title);
            const date = new Date(updateTitleDto.date)
            console.log(date);
            const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
            console.log(kstDate);

            if (check.success) {
                await this.prisma.sendList.update({
                    where: {
                        id: updateTitleDto.id
                    },
                    data: {
                        title: updateTitleDto.title,
                        date: kstDate
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
    async chatingExcel(id: number) {
        try {
            // 차팅 : 핸드폰번호 주문수량 결제방식 

            //날짜 조건 걸 예정
            const res = await this.getOrderTempList(id);
            const list = res.list;

            console.log('==================');
            console.log(list);
            const wb = new Excel.Workbook();
            const sheet = wb.addWorksheet("챠팅 엑셀");
            const header = ['이름', '핸드폰 번호', '주문수량', '별도구매','특이사항','현금','카드'];
            const headerWidths = [16, 30, 40, 40, 10,20,10,10];

            const headerRow = sheet.addRow(header);
            headerRow.height = 30.75;

            headerRow.eachCell((cell, colNum) => {
                styleHeaderCell(cell);
                sheet.getColumn(colNum).width = headerWidths[colNum - 1];
            });

            let sepearteId = 0;
            list.forEach((e) => {
                if (e.orderSortNum == 7) {
                    if (sepearteId == e.order.id) {
                        return;
                    } else {
                        sepearteId = e.order.id
                    }
                }
                let { name, phoneNum } = e.patient;
                phoneNum = getPhoneNum(phoneNum);

                console.log(e.tempOrderItems);
                let items = '';
                let assistants = '';
                for (let i = 0; i < e.order.orderItems.length; i++) {
                    console.log(e.order.orderItems[i].item)
                    if(e.order.orderItems[i].type === 'assistant') {
                        const assistant = getItem(e.order.orderItems[i].item);
                        assistants += `${assistant}/`;
                    }else{
                        const item = getItem(e.order.orderItems[i].item);
                        items += `${item}/`
                    }
                }

                const payType = e.payType;

                const rowDatas = [name, phoneNum, items, assistants, e.order.remark, e.order.cash, e.order.card];
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
    async addSend(addSendDto: AddSendDto) {
        try {
            const data = await this.prisma.addSend.findMany({
                where: { tempOrderId: addSendDto.tempOrderId }
            });

            if (data.length > 0) { //이미 addSend 처리 되있을 경우 기존 데이터 삭제
                await this.prisma.addSend.deleteMany({
                    where: { tempOrderId: addSendDto.tempOrderId }
                });
            }

            await this.prisma.addSend.create({
                data: {
                    tempOrderId: addSendDto.tempOrderId,
                    sendListId: addSendDto.sendListId
                }
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
    async getUpdateInfo(id: number) {
        try {
            console.log(id);
            const list = await this.prisma.updateInfo.findMany();

            const checked = await this.prisma.orderUpdateInfo.findMany({
                where: { tempOrderId: id }
            });

            console.log(checked);

            return { success: true, status: HttpStatus.OK, list, checked }
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
     * 체크된 수정 데이터 orderUpdateInfo 테이블에 데이터 넣기
     * @param insertUpdateInfoDto 
     * @returns {success:boolean,status:HttpStatus};
     */
    async insertUpdateInfo(insertUpdateInfoDto: InsertUpdateInfoDto) {
        try {
            await this.prisma.$transaction(async (tx) => {
                await tx.orderUpdateInfo.deleteMany({
                    where: {
                        tempOrderId: insertUpdateInfoDto.tempOrderId
                    }
                });

                await tx.tempOrder.update({
                    where: { id: insertUpdateInfoDto.tempOrderId },
                    data: { updateInfoCheck: false, updateInfoCheckGam: false }
                });
                const qryArr = insertUpdateInfoDto.infoData.map(async e => {
                    console.log('------------------');
                    console.log(e);
                    return tx.orderUpdateInfo.create({
                        data: {
                            info: e.info,
                            updateInfoId: e.id,
                            tempOrderId: insertUpdateInfoDto.tempOrderId
                        }
                    });

                });

                await Promise.all([...qryArr]).then((value) => {
                    return { success: true, status: HttpStatus.CREATED };
                }).catch((err) => {
                    this.logger.error(err);
                    throw new HttpException({
                        success: false,
                        status: HttpStatus.INTERNAL_SERVER_ERROR
                    },
                        HttpStatus.INTERNAL_SERVER_ERROR
                    );
                });
            })


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
     * 발송 목록에서 주문 취소 처리
     * @param cancelOrderDto 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
            msg: string;
        }>
     */
    async cancelSendOrder(cancelOrderDto: CancelSendOrderDto) {
        try {
            if (cancelOrderDto.isFirst) {
                //초진 일 시 환자 데이터까지 삭제
                const tempOrderId = cancelOrderDto.tempOrderId;
                const orderId = cancelOrderDto.orderId;
                const patientId = cancelOrderDto.patientId;

                await this.prisma.$transaction(async (tx) => {
                    //orderBodyType 삭제
                    await tx.orderBodyType.delete({
                        where: { orderId: orderId }
                    });

                    //addSend 삭제
                    await tx.addSend.deleteMany({
                        where: { tempOrderId: tempOrderId }
                    });

                    //temp orderItem 삭제
                    await tx.tempOrderItem.deleteMany({
                        where: { tempOrderId: tempOrderId }
                    });

                    //orderItem 삭제
                    await tx.orderItem.deleteMany({
                        where: { orderId: orderId }
                    });

                    //orderUpdateInfo 삭제
                    await tx.orderUpdateInfo.deleteMany({
                        where: { tempOrderId: tempOrderId }
                    })

                    //tempOrder 삭제
                    await tx.tempOrder.delete({
                        where: { id: tempOrderId }
                    });

                    //order 삭제
                    await tx.order.delete({
                        where: { id: orderId }
                    });

                    //patient 삭제
                    await tx.patient.delete({
                        where: { id: patientId }
                    });

                });

                return { success: true, status: HttpStatus.OK, msg: '초진 삭제' }
            } else {
                //재진 일 시 
                const tempOrderId = cancelOrderDto.tempOrderId;
                const orderId = cancelOrderDto.orderId;

                await this.prisma.$transaction(async (tx) => {
                    //addSend 삭제
                    await tx.addSend.deleteMany({
                        where: { tempOrderId: tempOrderId }
                    });

                    //temp orderItem 삭제
                    await tx.tempOrderItem.deleteMany({
                        where: { tempOrderId: tempOrderId }
                    });

                    //orderUpdateInfo 삭제
                    await tx.orderUpdateInfo.deleteMany({
                        where: { tempOrderId: tempOrderId }
                    })

                    //tempOrder 삭제
                    await tx.tempOrder.delete({
                        where: { id: tempOrderId }
                    });

                    //오더만 isComplete를 true로 변경
                    await tx.order.update({
                        where: { id: orderId },
                        data: { isComplete: true }
                    });
                });


                return { success: true, status: HttpStatus.OK, msg: '재진 삭제' }
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
     * 발송 목록에서 주문 취소 처리(soft delete)
     * 발송목록에서 주문 취소는 나중에 일괄 처리한다고 함
     * @param id 
     * @returns {success:boolean, status: HttpStatus, msg:string}
     */
    async cancelSendOrderFlag(id: number) {
        try {
            const tempOrder = await this.prisma.tempOrder.update({
                where: { id: id },
                data: { cancelFlag: true }
            });

            await this.prisma.order.update({
                where:{
                    id: tempOrder.orderId
                },
                data:{
                    cash: 0,
                    card: 0
                }
            });

            const exOrder = await this.prisma.tempOrder.findUnique({
                where: { id: id },
                select: {
                    order: {
                        select: {
                            friendDiscount: true,
                        }
                    },
                    patient: {
                        select: {
                            id: true
                        }
                    },

                }
            });

            //지인 10퍼 할인 주문일 시 주문 체크 원 상태로 복구
            if (exOrder.order.friendDiscount) {
                await this.prisma.friendRecommend.updateMany({
                    where: { patientId: exOrder.patient.id },
                    data: { useFlag: true }
                });
            }

            return { success: true, status: HttpStatus.OK, msg: '주문 취소' }

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
     * 데스크에서 업데이트 내역 체크
     * @param id 
     * @returns {success:boolean, status: HttpStatus}
     */
    async checkUpdateAtDesk(id: number) {
        try {
            await this.prisma.tempOrder.update({
                where: { id: id },
                data: { updateInfoCheck: true }
            });

            return { success: true, status: HttpStatus.OK, msg: '확인 완료' }

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
     * 감비환실에서 업데이트 내역 체크
     * @param id 
     * @returns 
     */
    async checkUpdateAtGam(id: number) {
        try{
            await this.prisma.tempOrder.update({
                where: { id: id },
                data: { updateInfoCheckGam: true }
            });

            return { success: true, status: HttpStatus.OK, msg: '확인 완료' }
        }catch(err) {
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
    async accountBook(id: number) {
        try {
            const sendList = await this.prisma.sendList.findFirst({
                where: { id: id },
                select: {
                    id: true,
                    title: true,
                    amount: true,
                    tempOrders: {
                        where: {
                            NOT: {
                                orderSortNum: -4 //환불 데이터 제외
                            }
                        },
                        orderBy: { orderSortNum: 'asc' },
                        select: {
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
                                    payType: true,
                                    cachReceipt: true,
                                    price: true,
                                    card: true,
                                    cash: true,
                                    remark: true,
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
                    addSends: {
                        select: {
                            tempOrder: {
                                select: {
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
                                            payType: true,
                                            cachReceipt: true,
                                            price: true,
                                            card: true,
                                            cash: true,
                                            remark: true,
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

            const sortItemsList = sortItems(tempOrderList, true);
            const sortedList = getSortedList(sortItemsList);

            console.log(sortedList);

            const wb = new Excel.Workbook();
            
            let title = sendList.title;
            title = title.replaceAll('/','-');

            const sheet = wb.addWorksheet(`${title} 감비환장부`);
            styleHeaderCell(wb);
            //헤더 부분
            sheet.mergeCells('A1:K1');
            sheet.getCell('G1').value = sendList.title + ' 감비환 장부'
            sheet.getCell('A1').font = { size: 24, bold: true };
            sheet.getCell('A1').alignment = {
                vertical: "middle",
                horizontal: "center",
                wrapText: true,
            };
            //주문 내역 부분
            const headers = ["", "설문지번호", "초/재", "이름", "감&쎈", "요요", "입금", "카드", "별도구매", "특이사항", "현금영수증"];
            const headerWidths = [5, 16, 9, 16, 15, 10, 16, 16, 12, 25, 18];

            const headerRow = sheet.addRow(headers);
            headerRow.height = 30.75;

            headerRow.eachCell((cell, colNum) => {
                styleHeaderCell(cell);
                sheet.getColumn(colNum).width = headerWidths[colNum - 1];
            });


            let isSeparteId = 0;

            sortedList.forEach((e, i) => {
                // 현금 영수증 관련
                let cashReceipt = e.order.cachReceipt;
                // 계좌 이체, 현금 영수증 요청 x 혹은 빈 칸, 10만원 미만이면 x로 나오고
                if (e.order.payType === "계좌이체"
                    && (e.order.cachReceipt === "x" || e.order.cachReceipt === '')
                    && e.order.cash < 100000) {
                    cashReceipt = 'x';
                }
                // 계좌 이체, 현금 영수증 요청 x 혹은 빈 칸, 10만원 이상이면 빈 칸으로
                if (e.order.payType === "계좌이체"
                    && (e.order.cachReceipt === "x" || e.order.cachReceipt === '')
                    && e.order.cash >= 100000
                ) {
                    cashReceipt = '';
                }
                if (e.orderSortNum != 7) { //분리 배송이 아닐 때
                    const orderId = e.order.id;
                    const isFirst = e.isFirst ? '초진' : '재진';
                    const name = e.patient.name;
                    const { common, yoyo, assistant } = getItemAtAccount(e.order.orderItems);
                    const cash = e.order.cash == 0 ? '' : e.order.cash;
                    const card = e.order.card == 0 ? '' : e.order.card;
                    const message = (e.order.remark ? e.order.remark + '/' : '') + e.order.message;

                    const rowDatas = [i + 1, orderId, isFirst, name, common, yoyo, cash, card, assistant, message, cashReceipt];

                    const appendRow = sheet.addRow(rowDatas);
                    appendRow.eachCell((cell, colNum) => {
                        styleCell(cell);
                    });
                    if (e.orderSortNum > 1 && e.orderSortNum < 6) {
                        setColor(appendRow, e.orderSortNum);
                    }
                } else if (e.orderSortNum == 7) { //분래 배송일 시
                    if (isSeparteId == e.order.id) {
                        console.log('already insert data');
                    } else {
                        isSeparteId = e.order.id;

                        const orderId = e.order.id;
                        const isFirst = e.isFirst ? '초진' : '재진';
                        const name = e.patient.name;
                        const { common, yoyo, assistant } = getItemAtAccount(e.order.orderItems);
                        const cash = e.order.cash == 0 ? '' : e.order.cash;
                        const card = e.order.card == 0 ? '' : e.order.card;
                        const message = e.order.remark ?? '' + '/' + e.order.message;

                        const rowDatas = [i + 1, orderId, isFirst, name, common, yoyo, cash, card, assistant, message, cashReceipt];

                        const appendRow = sheet.addRow(rowDatas);
                        appendRow.eachCell((cell, colNum) => {
                            styleCell(cell);
                        });
                    }

                }

            });

            //footer 부분
            const footer = ['', '로젠', '총인원', '총갯수', '세부', '현금', '카드', '비고'];
            // const footerWidths = [5,25,9,16,15,10,16,16,12,25,18];

            const { logen, orderCount, fullCount, detail, card, cash, note } = getFooter(tempOrderList, sendList.addSends);
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
            appendRow.eachCell((cell, colNum) => {
                styleCell(cell);
            })

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
     * 입금/상담 목록에서 합배송 처리를 위한 완료 안 된 발송 목록(tempOrder) 조회
     * 입금/상담 목록에서 데이터 타입을 맞추기 위해 order 테이블 기준으로 조회
     */
    async getNotCompletedTempOrderList() {
        try {
            const list = await this.prisma.order.findMany({
                where: {
                    tempOrders: {
                        some: {
                            sendList: {
                                useFlag: true,
                            }
                        }
                    }
                },
                include: {
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            phoneNum: true,
                            addr: true,
                        }
                    },
                    tempOrders: {
                        include: {
                            sendList: true,
                        }
                    }
                }
            });

            for (let row of list) {
                const decryptedAddr = this.crypto.decrypt(row.addr);
                const decryptedPatientAddr = this.crypto.decrypt(row.patient.addr);
                const decryptedPhoneNum = this.crypto.decrypt(row.patient.phoneNum);
                const decryptedTempAddr = this.crypto.decrypt(row.tempOrders[0].addr);
                row.addr = decryptedAddr;
                row.patient.phoneNum = decryptedPhoneNum;
                row.patient.addr = decryptedPatientAddr;
                row.tempOrders[0].addr = decryptedTempAddr;
            }

            return { success: true, status: HttpStatus.OK, list };
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

    //테스트용
    async sendNumExcelTest(id: number) {
        try{
            const send = await this.getOrderTemp(id);

            if(!send.success) return {success:false};

            const list = send.list;

            const wb = new Excel.Workbook();
            const sheet = wb.addWorksheet("송장번호 테스트 엑셀");

            for(let i = 0; i<list.length; i++) {
                const rowDatas =[
                    "", //""
                    "1", //"차수"
                    i, //"순번"
                    `3853030059${i}`, //"운송장번호"
                    "", //"합포장번호"
                    "", //"관내물품"
                    list[i].patient.name, //"수하인명"
                    "042-451", //"우편번호"
                    list[i].addr, //"수하인주소1"
                    "****", //"수하인주소2"
                    list[i].patient.phoneNum, //"수하인전화"
                    list[i].patient.phoneNum, //"수하인휴대폰"
                    '1', //"수량"
                    '2,500', //"택배운임"
                    '선불', //"선착불"
                    '물품명', //"물품명"
                    '', //"물품옵션"
                    '', //"추가옵션"
                    list[i].message, //"배송메세지"
                    "", //"주문번호"
                    "23910068", //"집하영업소"
                    "239", //"집하지점"
                    "347", //"배송지점"
                    "E5-347", //"분류코드"
                    "참명인한의원", //"송하인명"
                    "서울 은평구 응암동", //"송하인주소1"
                    "****", //"송하인주소2"
                    "02-356-8***", //"송하인전화"
                    "", //"송하인휴대폰"
                    "", //"주의사항"
                    "", //"제주선착불"
                    "0", //"물품중량"
                    "0", //"제주운임"
                    "", //"연륙도서"
                    "", //"산간지역"
                    "", //"물품코드"
                    "0", //"할증운임"
                    "", //"물품가액"
                    "", //"내품수량"
                    "", //"원송장번호"
                    "참명인한의원", //"주관고객"
                    "발송목록 엑셀파일", //파일명
                    "SV4D", //"프린터"
                    "(신)감열A", //"출력송장"
                    "1", //"발생횟수"
                    "16:00:33" //"출력시간"
                ];

                const appendRow = sheet.addRow(rowDatas);
            }

            const fileData = await wb.xlsx.writeBuffer();
            const url = await this.uploadFile(fileData);

            return {success:true, status:HttpStatus.OK, url}

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
    * 엑셀 파일 업로드
    * @param file 
    * @returns fileUrl : String
    */
  async uploadFile(file: any) {
    try {
      const presignedUrl = await generateUploadURL();

      console.log(presignedUrl);
      await this.saveS3Data(presignedUrl.uploadURL, presignedUrl.imageName);

      await axios.put(presignedUrl.uploadURL, {
        body: file
      }, {
        headers: {
          "Content-Type": file.type,
        }
      });

      let fileUrl = presignedUrl.uploadURL.split('?')[0];
      return fileUrl;
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
    * s3 데이터 오브젝트 이름 저장(나중에 삭제하기 위해서) 
    * @param url 
    * @param objectName 
    * @returns {success:boolean}
    */
     async saveS3Data(url: string, objectName: string) {
      try {
          await this.prisma.urlData.create({
              data: {
                  url: url,
                  objectName: objectName
              }
          });

          return { success: true };
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
   * 발송목록에서 금액 변경 확인 체크 처리
   * @param id 
   * @returns {success:boolean,status:HttpStatus}
   */
  async checkPrice(id: number) {
    try{
        await this.prisma.tempOrder.update({
            where:{id:id},
            data:{updatePrciecFlag : false }
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
   * 후기 취소
   * @param id 
   * @returns {success:boolean,status:HttpStatus}
   */
  async reviewFlag(id: number){
    try{
        await this.prisma.$transaction(async (tx) => {
            await tx.tempOrder.updateMany({
                where:{orderId:id},
                data:{outage:''}
            });

            await tx.order.update({
                where:{id:id},
                data:{reviewFlag:false}
            });
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
}