import { HttpStatus, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { TalkRepositoy } from './talk.repository';
import { GetListDto } from 'src/erp/Dto/getList.dto';
import * as Excel from 'exceljs'
import { styleHeaderCell } from 'src/util/excelUtil';
import { ErpService } from 'src/erp/erp.service';
import { OrderInsertTalk } from './Dto/orderInsert.dto';
import { Crypto } from 'src/util/crypto.util';
const fs = require('fs');
import puppeteer from 'puppeteer';
const path = require('path');

@Injectable()
export class TalkService {
    constructor(
        private readonly talkRepository: TalkRepositoy,
        private readonly erpService: ErpService,
        private crypto: Crypto,
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
    async orderInsertTalk(getListDto: GetListDto,cronFlag?){
        const res = await this.talkRepository.orderInsertTalk(getListDto);
        //console.log(getListDto);
        if(!res.success) return {success:false,status:HttpStatus.INTERNAL_SERVER_ERROR,msg:'서버 내부 에러 발생'};
        if(cronFlag)
        {
            const url = await this.getTalkExcel(res.list,getListDto.date);
            this.sendTalk(url,'접수확인알림톡(리뉴얼)');
            return {successs:true};
        }
        const url = await this.getTalkExcel(res.list);
        const checkUrl = await this.getCheckTalkExcel(res.list);
        //console.log(url);     
        return {successs:true, status:HttpStatus.OK, url, checkUrl};
    }

    async getTalkExcel(list,fileName?){
        const wb = new Excel.Workbook();
        const sheet = wb.addWorksheet('발송알림톡');
        const headers = ['이름','휴대폰번호','변수1','변수2','변수3','변수4','변수5','변수6','변수7','변수8','변수9','변수10'];
        const headerWidths = [10,10,10,10,10,10,10,10,10,10,10,10];
        const headerRow = sheet.addRow(headers);
        let filePath;
        headerRow.eachCell((cell, colNum) => {
            sheet.getColumn(colNum).width = headerWidths[colNum - 1];
        });

        list.forEach((e) => {
            const {name, phoneNum} = e.patient;
            const rowDatas = [name,phoneNum,name,'','','','','','','','',''];

            const appendRow = sheet.addRow(rowDatas);
        });

        const fileData = await wb.xlsx.writeBuffer();
        if(fileName)
        {
            filePath= `./src/files/${fileName}.xlsx`;
            fs.writeFile(filePath, fileData, (err) =>{
                if (err) {
                    console.error('파일 저장 중 에러 발생:', err);
                } else {
                    console.log('엑셀 파일이 성공적으로 저장되었습니다.');
                }
            })
            return filePath;
        }
            filePath= `./src/files/test.xlsx`;
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

        for (let row of firstTalk.list) {
            const decryptedPhoneNum = this.crypto.decrypt(row.patient.phoneNum);
            row.patient.phoneNum = decryptedPhoneNum;
        }

        for (let row of returnTalk.list) {
            const decryptedPhoneNum = this.crypto.decrypt(row.patient.phoneNum);
            row.patient.phoneNum = decryptedPhoneNum;
        }

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
    async sendTalk(fileName:string,work:string) {
        try {
          // 브라우저 실행
          const browser = await puppeteer.launch({ headless: false }); // headless: false는 브라우저 UI를 표시합니다.
          const page = await browser.newPage();
    page.on('console', msg => {
            for (let i = 0; i < msg.args().length; ++i)
              console.log(`${i}: ${msg.args()[i]}`);
          });
          await page.goto('https://www.netshot.co.kr/account/login/?next=/kakao/notice_send/#none');
    
          await page.click('a#banner-confirm')
    
          await page.type('input[name="username"]', process.env.TALK_USERNAME);
          await page.type('input[name="password"]', process.env.TALK_PASSWORD);
    
          await page.keyboard.press('Enter');
    
    
          //await page.click('div.header4_c2 > ul > li > a')
    
          await page.waitForNavigation()
          await new Promise(resolve => setTimeout(resolve, 1000));
    
    
    
          await page.click('a.link1');
    
    
          // 테이블 로드 대기
          //await page.waitForSelector('#template_area');
          // Click on the checkbox next to the element containing "초진접수확인1"
          const value = await page.evaluate(async (work) => {
    
            // Find the <a> element containing the text "초진접수확인1"
            const element = [...document.querySelectorAll('a')].find(el => el.textContent.includes(work));
            console.log(element);
            // Find the checkbox in the same <ul> as the <a> element
            const checkbox = element.closest('ul').querySelector('input[type="checkbox"]').dispatchEvent(new Event('click'));
            console.log(checkbox);
    
            const test = document.querySelector('a.msg_link9').dispatchEvent(new Event('click'));
            console.log(test.valueOf);
            // Check the checkbox
    
    
          },work);
    
    
          const selector = 'a.msg_link9';
    
          // 요소가 나타날 때까지 기다립니다
          await page.waitForSelector(selector, { visible: true })
          await page.click(selector)
    
          await new Promise(resolve => setTimeout(resolve, 3000));
    
    
          await page.waitForSelector('a.msg_link8', { visible: true })
          await page.click('a.msg_link8');
    
    
          const filePath = path.resolve(__dirname, fileName);
          const fileInputSelector = 'input[name="address_file"]';
    
          console.log(filePath);
          // 파일 입력 요소에 파일 경로 설정
          await page.waitForSelector(fileInputSelector);
          const inputUploadHandle = await page.$(fileInputSelector);
    
          await inputUploadHandle.uploadFile(filePath);
    
          await page.waitForSelector('a.msg_link15', { visible: true })
          await page.click('a.msg_link15');
    
          const elementSelector = 'div#id_lock.msg_lock';
    
          await page.evaluate((selector) => {
            console.log(selector);
            const element = document.querySelector(selector) as HTMLElement;
            console.log(element);
            if (element) {
              element.style.display = 'none';
            } else {
              console.error(`Element not found: ${selector}`);
            }
          }, elementSelector)
          //await page.click('div#id_lock.msg_lock');
          // 체크할 체크박스의 셀렉터
          const checkboxSelector1 = '#failed_yn'; // 실제 셀렉터로 변경
    
          // 체크박스를 체크하는 JavaScript 코드 실행
          await page.evaluate((selector) => {
            const checkbox = document.querySelector(selector) as HTMLElement | null;
            if (checkbox) {
              (checkbox as HTMLInputElement).checked = true;
            } else {
              console.error(`Checkbox not found: ${selector}`);
            }
          }, checkboxSelector1);
    
          const checkboxSelector2 = '#failed_same_yn';
    
          await page.evaluate((selector) => {
            const checkbox = document.querySelector(selector) as HTMLElement | null;
            if (checkbox) {
              (checkbox as HTMLInputElement).checked = true;
            } else {
              console.error(`Checkbox not found: ${selector}`);
            }
          }, checkboxSelector2);
          const textareaSelector = 'template_content_final';
          const templateContent = await page.evaluate((selector) => {
            const textarea = document.getElementById(selector) as HTMLTextAreaElement; // 템플릿 내용이 있는 readonly 텍스트 영역
            console.log(textarea);
            return textarea.value;
          },textareaSelector);
          await page.type('textarea#failed_content', templateContent);
          await new Promise(resolve => setTimeout(resolve, 3000));
          const sendButton = '.msg_link10';
          await page.evaluate((selector) => {
            const button = document.querySelector(selector) as HTMLElement | null;
            if (button) {
              (button as HTMLInputElement).click();
              //window.confirm = () => true;
    
            } else {
              console.error(`Checkbox not found: ${selector}`);
            }
          }, sendButton);
          await page.waitForSelector('a.msg_link10', { visible: true })
          await page.click('a.msg_link10');
          await new Promise(resolve => setTimeout(resolve, 3000));
          await page.keyboard.press('Enter');
          await page.keyboard.press('Enter');
        } catch (err) {
          console.log(err);
        }
    
      }
}
