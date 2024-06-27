import { HttpStatus, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { TalkRepositoy } from './talk.repository';
import { GetListDto } from 'src/erp/Dto/getList.dto';
import * as Excel from 'exceljs'
import { styleHeaderCell } from 'src/util/excelUtil';
import { ErpService } from 'src/erp/erp.service';
import { OrderInsertTalk } from './Dto/orderInsert.dto';
const fs = require('fs');

@Injectable()
export class TalkService {
    constructor(
        private readonly talkRepository: TalkRepositoy,
        private readonly erpService: ErpService,
    ){}

    private readonly logger = new Logger(TalkService.name);

    /**
     * 접수 알림 톡 엑셀 데이터 url
     * @param getListDto 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
            msg: string;
            successs?: undefined;
            url?: undefined;
        } | {
            successs: boolean;
            status: HttpStatus;
            url: any;
            success?: undefined;
            msg?: undefined;
        }>
     */
    async orderInsertTalk(getListDto: GetListDto){
        const res = await this.talkRepository.orderInsertTalk(getListDto);
        //console.log(getListDto);
        if(!res.success) return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR,msg:'서버 내부 에러 발생'};
        const url = await this.getTalkExcel(res.list);
        const checkUrl = await this.getCheckTalkExcel(res.list);
        //console.log(url);     
        return {successs:true, status:HttpStatus.OK, url, checkUrl};
    }

    async getTalkExcel(list){
        const wb = new Excel.Workbook();
        const sheet = wb.addWorksheet('발송알림톡');

        const headers = ['이름','휴대폰번호','변수1','변수2','변수3','변수4','변수5','변수6','변수7','변수8','변수9','변수10'];
        const headerWidths = [10,10,10,10,10,10,10,10,10,10,10,10];

        const headerRow = sheet.addRow(headers);
        headerRow.eachCell((cell, colNum) => {
            sheet.getColumn(colNum).width = headerWidths[colNum - 1];
        });

        list.forEach((e) => {
            const {name, phoneNum} = e.patient;
            const rowDatas = [name,phoneNum,name,'','','','','','','','',''];

            const appendRow = sheet.addRow(rowDatas);
        });

        const fileData = await wb.xlsx.writeBuffer();

        const filePath= './src/files/test.xlsx';

        fs.writeFile(filePath, fileData, (err) =>{
            if (err) {
                console.error('파일 저장 중 에러 발생:', err);
            } else {
                console.log('엑셀 파일이 성공적으로 저장되었습니다.');
            }
        })

        const url = await this.erpService.uploadFile(fileData);

        return url;
    }


    async getCheckTalkExcel(list){
        const wb = new Excel.Workbook();
        const sheet = wb.addWorksheet('발송알림톡 체크용');

        const headers = ["name","id"];
        const headerWidths = [10,10];

        const headerRow = sheet.addRow(headers);
        headerRow.eachCell((cell,colNum) => {
            sheet.getColumn(colNum).width = headerWidths[colNum - 1];
        });

        list.forEach((e) => {
            const id = e.id;
            const name = e.patient.name;

            const rowData = [name, id];
            const appendRow = sheet.addRow(rowData);
        });

        const fileData = await wb.xlsx.writeBuffer();
        const url = await this.erpService.uploadFile(fileData);

        return url;
    }

    /**
     * 접수 알림톡 발송 완료 처리
     * @param orderInsertDto 
     * @returns {success:boolean, status:HttpStatus}
     */
    async orderTalkUpdate(orderInsertDto: Array<OrderInsertTalk>){
        const res = await this.talkRepository.completeInsertTalk(orderInsertDto);

        if(!res.success) return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR,msg:'서버 내부 에러 발생'};
        else return {success:true,status:201}
    }


    /**
     * 상담 연결 처리
     * @param id 
     * @returns  Promise<{
            success: boolean;
            status: HttpStatus;
            msg: string;
        } | {
            success: boolean;
            status: HttpStatus;
            msg?: undefined;
        }>
     */
    async consultingFlag(id: number) {
        const res = await this.talkRepository.consultingFlag(id);

        if(!res.success) return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR,msg:'서버 내부 에러 발생'};
        else return {success:true,status:201};
    }

    /**
     * 상담 연결 안 된 사람들 엑셀 데이터
     * @param getListDto 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
            msg: string;
            successs?: undefined;
            url?: undefined;
        } | {
            successs: boolean;
            status: HttpStatus;
            url: Promise<any>;
            success?: undefined;
            msg?: undefined;
        }>
     */
    async notConsulting(getListDto: GetListDto) {
        const res = await this.talkRepository.notConsulting(getListDto);
        if(!res.success) return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR,msg:'서버 내부 에러 발생'};
        const url = await this.getTalkExcel(res.list);
             
        return {successs:true, status:HttpStatus.OK, url};
    }


    /**
     * 미입금 된 인원 엑셀 데이터
     * @param getListDto 
     * @returns romise<{
            success: boolean;
            status: HttpStatus;
            msg: string;
            successs?: undefined;
            url?: undefined;
        } | {
            successs: boolean;
            status: HttpStatus;
            url: Promise<any>;
            success?: undefined;
            msg?: undefined;
        }>
     */
    async notPay(getListDto: GetListDto) {
        const res = await this.talkRepository.notPay(getListDto);
        if(!res.success) return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR,msg:'서버 내부 에러 발생'};
        const url = await this.getTalkExcel(res.list);
             
        return {successs:true, status:HttpStatus.OK, url};
    }

    /**
     * 발송 알림 톡(수정 예정)
     * @param id 
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
            msg: string;
            firstUrl?: undefined;
            returnUrl?: undefined;
        } | {
            success: boolean;
            status: HttpStatus;
            firstUrl: Promise<any>;
            returnUrl: Promise<...>;
            msg?: undefined;
        }>
     */
    async completeSendTalk(id: number) {
        const firstTalk = await this.talkRepository.completeSendTalkFirst(id);
        if(!firstTalk.success) return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR,msg:'서버 내부 에러 발생'};

        const returnTalk = await this.talkRepository.completeSendTalkReturn(id);
        if(!returnTalk.success) return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR,msg:'서버 내부 에러 발생'};

        const firstUrl = await this.completeSendExcel(firstTalk.list);
        const returnUrl = await this.completeSendExcel(returnTalk.list);

        return {success:true, status:HttpStatus.OK, firstUrl, returnUrl};
    }

    /**
     * 발송 알림 톡 파일
     * @param list 
     * @returns url:string
     */
    async completeSendExcel(list) {
        const wb = new Excel.Workbook();
        const sheet = wb.addWorksheet('발송완료알림');

        list.forEach(e => {
            const name = e.patient.name;
            const phoneNum = e.patient.phoneNum;
            const orderItem = e.order.orderItems[0].item //수정 예정
            const sendNum = e.sendNum;
            const isFirst = e.isFirst ? '초진' : '';

            const rowDatas = [name, phoneNum, name, orderItem, '로젠택배' ,sendNum, isFirst];
            const appendRow = sheet.addRow(rowDatas);
        });

        const fileData = await wb.xlsx.writeBuffer();
        const url = await this.erpService.uploadFile(fileData);

        return url;
    }
    
}
