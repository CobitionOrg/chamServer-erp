import { HttpStatus, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { TalkRepositoy } from './talk.repository';
import { GetListDto } from 'src/erp/Dto/getList.dto';
import * as Excel from 'exceljs'
import { styleHeaderCell } from 'src/util/excelUtil';
import { ErpService } from 'src/erp/erp.service';
import { OrderInsertTalk } from './Dto/orderInsert.dto';

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

        if(!res.success) return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR,msg:'서버 내부 에러 발생'};


        const wb = new Excel.Workbook();
        const sheet = wb.addWorksheet('발송알림톡');

        const headers = ['이름','휴대폰번호','변수1','변수2','변수3','변수4','변수5','변수6','변수7','변수8','변수9','변수10'];
        const headerWidths = [10,10,10,10,10,10,10,10,10,10,10,10];

        const headerRow = sheet.addRow(headers);
        headerRow.eachCell((cell, colNum) => {
            sheet.getColumn(colNum).width = headerWidths[colNum - 1];
        });

        res.list.forEach((e) => {
            const {name, phoneNum} = e.patient;
            const rowDatas = [name,phoneNum,name,'','','','','','','','',''];

            const appendRow = sheet.addRow(rowDatas);
        });

        const fileData = await wb.xlsx.writeBuffer();
        const url = await this.erpService.uploadFile(fileData);
      
        return {successs:true, status:HttpStatus.OK, url};
    }

    async orderTalkUpdate(orderInsertDto: OrderInsertTalk){
        const res = await this.talkRepository.completeInsertTalk(orderInsertDto.list);

        if(!res.success) return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR,msg:'서버 내부 에러 발생'};
        else return {success:true,status:201}
    }
}
