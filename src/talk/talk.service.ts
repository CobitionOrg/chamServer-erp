import { HttpStatus, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { TalkRepositoy } from './talk.repository';
import { GetListDto } from 'src/erp/Dto/getList.dto';
import * as Excel from 'exceljs'
import { styleHeaderCell } from 'src/util/excelUtil';
import { ErpService } from 'src/erp/erp.service';
import { OrderInsertTalk } from './Dto/orderInsert.dto';
import { Crypto } from 'src/util/crypto.util';
import { getDateString } from 'src/util/date.util';
const fs = require('fs');
import puppeteer, { Browser, Dialog } from 'puppeteer';
const path = require('path');
const constants = require('fs').constants;

@Injectable()
export class TalkService {
    constructor(
        private readonly talkRepository: TalkRepositoy,
        private readonly erpService: ErpService,
        private crypto: Crypto,
    ) { }

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
    async orderInsertTalk(getListDto: GetListDto) {
        const res = await this.talkRepository.orderInsertTalk(getListDto);
        //console.log(getListDto);
        if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };
        const url = await this.getTalkExcel(res.list);
        const checkUrl = await this.getCheckTalkExcel(res.list);
        //console.log(url);     
        return { successs: true, status: HttpStatus.OK, url, checkUrl };
    }

    /**
     * 접수 알람톡 용 엑셀 파일 만들기
     * @param list 
     * @param fileName 
     * @returns 
     */
    async getTalkExcel(list, fileName?) {
        const wb = new Excel.Workbook();
        const sheet = wb.addWorksheet('발송알림톡');
        const headers = ['이름', '휴대폰번호', '변수1', '변수2', '변수3', '변수4', '변수5', '변수6', '변수7', '변수8', '변수9', '변수10'];
        const headerWidths = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
        const headerRow = sheet.addRow(headers);
        let filePath;

        headerRow.eachCell((cell, colNum) => {
            sheet.getColumn(colNum).width = headerWidths[colNum - 1];
        });

        list.forEach((e) => {
            const { name, phoneNum } = e.patient;
            const rowDatas = [name, phoneNum, name, '', '', '', '', '', '', '', '', ''];
            const appendRow = sheet.addRow(rowDatas);
            //자동으로 번호에 '붙는 상황 방지
            appendRow.getCell(2).value = phoneNum.toString();
            appendRow.getCell(2).numFmt = '@';
        });

        const fileData = await wb.xlsx.writeBuffer();
        if (fileName) {
            // 파일 이름이 인자로 전달 되었을 때 (자동 발송)
            filePath = `./src/files/${fileName}.xlsx`;
            //저장할 디렉토리 존재 확인
            try {
                await fs.access(path.resolve('../files'))
            }
            catch (err) {
                if (err.code === 'ENOENT') {
                    //없을시 생성
                    await fs.mkdir(path.resolve('../files'), (err) => {
                        this.logger.error(err);
                    });
                }
            }
            fs.writeFile(filePath, fileData, (err) => {
                if (err) {
                    console.error('파일 저장 중 에러 발생:', err);
                    return '';
                } else {
                    console.log('엑셀 파일이 성공적으로 저장되었습니다.');
                }
            })
            return filePath;
        } else {
            //파일 이름이 전달 되지 않아 수동으로 발송할 때(url을 클라이언트로 리턴)

            const url = await this.erpService.uploadFile(fileData);

            return url;
        }

    }

    /**
     * 접수알림톡 체크용 엑셀
     * @param list 
     * @returns 
     */
    async getCheckTalkExcel(list) {
        const wb = new Excel.Workbook();
        const sheet = wb.addWorksheet('접수알림톡 체크용');

        const headers = ["name", "id"];
        const headerWidths = [10, 10];

        const headerRow = sheet.addRow(headers);
        headerRow.eachCell((cell, colNum) => {
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
    async orderTalkUpdate(orderInsertDto: Array<OrderInsertTalk>) {
        const res = await this.talkRepository.completeInsertTalk(orderInsertDto);
        if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };
        else return { success: true, status: 201 }
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

        if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };
        else return { success: true, status: 201 };
    }


    /**
     * 구매 후기 (당주 월-금 초진만 - 발송목록 날짜 별로 가져와서 월요일부터 계산)
     */
    async payReview() {
        const date = new Date();
        const dayOfWeek = date.getDay();

        //해당 주의 월요일 계산
        const diffToSunday = 1 - dayOfWeek;
        const monday = new Date(date);
        monday.setDate(date.getDate() + diffToSunday);
        monday.setHours(0, 0, 0, 0);

        //해당 주의 금요일 계산
        const diffToFriday = 5 - dayOfWeek;
        const friday = new Date(date);
        friday.setDate(date.getDate() + diffToFriday);
        friday.setHours(23, 59, 59, 999);

        const list = await this.talkRepository.payReview(monday, friday);
        const url = await this.payReviewExcel(list.list, 'hiyo');

        console.log(list.list);
        return { success: true, url }


    }

    /**
    * 구매 후기 용 엑셀 파일 만들기
    * @param list 
    * @param fileName 
    * @returns 
    */
    async payReviewExcel(list, fileName?) {
        const wb = new Excel.Workbook();
        const sheet = wb.addWorksheet('발송알림톡');
        const headers = ['이름', '휴대폰번호', '변수1', '변수2', '변수3', '변수4', '변수5', '변수6', '변수7', '변수8', '변수9', '변수10'];
        const headerWidths = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
        const headerRow = sheet.addRow(headers);
        let filePath;

        headerRow.eachCell((cell, colNum) => {
            sheet.getColumn(colNum).width = headerWidths[colNum - 1];
        });

        list.forEach((e) => {
            const { name, phoneNum } = e.order.patient;
            const rowDatas = [name, phoneNum, name, '', '', '', '', '', '', '', '', ''];
            const appendRow = sheet.addRow(rowDatas);
            //자동으로 번호에 '붙는 상황 방지
            appendRow.getCell(2).value = phoneNum.toString();
            appendRow.getCell(2).numFmt = '@';
        });

        const fileData = await wb.xlsx.writeBuffer();
        if (fileName) {
            // 파일 이름이 인자로 전달 되었을 때 (자동 발송)
            filePath = `./src/files/${fileName}.xlsx`;
            console.log(filePath);
            //저장할 디렉토리 존재 확인
            try {
                await fs.access(path.resolve('../files'))
            }
            catch (err) {
                if (err.code === 'ENOENT') {
                    //없을시 생성
                    await fs.mkdir(path.resolve('../files'), (err) => {
                        this.logger.error(err);
                    });
                }
            }
            fs.writeFile(filePath, fileData, (err) => {
                if (err) {
                    console.error('파일 저장 중 에러 발생:', err);
                    return '';
                } else {
                    console.log('엑셀 파일이 성공적으로 저장되었습니다.');
                }
            })
            return filePath;
        } else {
            //파일 이름이 전달 되지 않아 수동으로 발송할 때(url을 클라이언트로 리턴)
            // filePath = `./src/files/test.xlsx`;
            // fs.writeFile(filePath, fileData, (err) => {
            //     if (err) {
            //         console.error('파일 저장 중 에러 발생:', err);
            //     } else {
            //         console.log('엑셀 파일이 성공적으로 저장되었습니다.');
            //     }
            // })

            const url = await this.erpService.uploadFile(fileData);

            return url;
        }

    }

    /**
     * 유선 상담 연결 안 될 시
     * @returns 
     */
    async notCall() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        //2주 전 날짜
        const twoWeeksAgo = new Date(yesterday);
        twoWeeksAgo.setDate(yesterday.getDate() - 14);

        const res = await this.talkRepository.notCall(yesterday, twoWeeksAgo);
        const url = await this.getTalkExcel(res.list, 'notcall');

        return { success: true, status: HttpStatus.OK, url };

    }



    /**
     * 발송 알림 톡 엑셀
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
        if (!firstTalk.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };

        const returnTalk = await this.talkRepository.completeSendTalkReturn(id);
        if (!returnTalk.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };

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

        return { success: true, status: HttpStatus.OK, firstUrl, returnUrl };
    }

    ////////////////////////////////////////////////////////////////////////////////////

    /**
     * 발송 알림톡 발송
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
            msg?: string;
        }>
     */
    async completeSendTalkCron() {
        const fileName = new Date().toISOString();
        const completeSendDate = getDateString(fileName);
        console.log(completeSendDate);

        //당일 완료된 발송목록 id를 가져온다.
        const completeSendRes = await this.talkRepository.completeSendTalkGetList(completeSendDate);
        console.log(completeSendRes);

        if (!completeSendRes.cid) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };

        const firstTalk = await this.talkRepository.completeSendTalkFirst(completeSendRes.cid.id);
        const returnTalk = await this.talkRepository.completeSendTalkReturn(completeSendRes.cid.id);

        if ((!returnTalk.success) && (!firstTalk.success)) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };

        for (let row of firstTalk.list) {
            const decryptedPhoneNum = this.crypto.decrypt(row.patient.phoneNum);
            row.patient.phoneNum = decryptedPhoneNum;
        }

        for (let row of returnTalk.list) {
            const decryptedPhoneNum = this.crypto.decrypt(row.patient.phoneNum);
            row.patient.phoneNum = decryptedPhoneNum;
        }

        let res;
        let firstUrl, returnUrl;
        let fName = completeSendDate.replaceAll('/', '-');
        if (firstTalk.list.length > 0) {
            firstUrl = await this.completeSendExcel(firstTalk.list, fName + "-first");
            //문자발송
            res = await this.sendTalk(firstUrl, '발송(초진)');
            if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR };
        }
        if (returnTalk.list.length > 0) {
            returnUrl = await this.completeSendExcel(returnTalk.list, fName + "-second");
            //문자 발송
            res = await this.sendTalk(returnUrl, '발송(재진)');
            if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR };
        }
        return { success: true, status: HttpStatus.OK };

    }

    /**
    * 발송 알림 톡 파일
    * @param list 
    * @returns url:string
    */
    async completeSendExcel(list, fileName?) {
        const wb = new Excel.Workbook();
        const sheet = wb.addWorksheet('발송완료알림');
        const headers = ['이름', '휴대폰번호', '변수1', '변수2', '변수3', '변수4', '변수5', '변수6', '변수7', '변수8', '변수9', '변수10'];
        const headerWidths = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
        const headerRow = sheet.addRow(headers);
        headerRow.eachCell((cell, colNum) => {
            sheet.getColumn(colNum).width = headerWidths[colNum - 1];
        });
        let filePath;

        list.forEach(e => {
            const name = e.patient.name;
            const phoneNum = e.patient.phoneNum;
            const orderItem = e.order.orderItems.length > 0 ? e.order.orderItems[0].item : ''; //수정 예정
            const sendNum = e.sendNum;
            const isFirst = e.isFirst ? '초진' : '';

            const rowDatas = [name, phoneNum, name, orderItem, '로젠택배', sendNum, isFirst];
            const appendRow = sheet.addRow(rowDatas);
            appendRow.getCell(2).value = phoneNum.toString();
            appendRow.getCell(2).numFmt = '@';
        });

        const fileData = await wb.xlsx.writeBuffer();
        if (fileName) {
            // 파일 이름이 인자로 전달 되었을 때 (자동 발송)
            filePath = `./src/files/${fileName}.xlsx`;
            //저장할 디렉토리 존재 확인
            try {
                await fs.access(path.resolve('../files'))
            }
            catch (err) {
                if (err.code === 'ENOENT') {
                    //없을시 생성
                    await fs.mkdir(path.resolve('../files'), (err) => {
                        this.logger.error(err);
                    });
                }
            }
            fs.writeFile(filePath, fileData, (err) => {
                if (err) {
                    console.error('파일 저장 중 에러 발생:', err);
                    return '';
                } else {
                    console.log('엑셀 파일이 성공적으로 저장되었습니다.');
                }
            })
            return filePath;
        } else {


            const url = await this.erpService.uploadFile(fileData);

            return url;
        }
    }



    /**
    * 상담 연결 안 된 사람들 카톡 자동발송
    * @returns Promise<{
           success: boolean;
           status:HttpStatus;
           msg?:string
       }>
    */
    async notConsultingCron() {
        const dateVar = new Date();

        const getListDto: GetListDto = {
            date: dateVar.toISOString(),
            searchCategory: "",
            searchKeyword: ""
        }

        const res = await this.talkRepository.notConsulting(getListDto);
        if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };

        const url = await this.getTalkExcel(res.list, getListDto.date);
        if (!url) { return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' }; }

        const rt = await this.sendTalk(url, '유선상담 후 연결안되는 경우');
        if (rt.success) {
            return { successs: true, status: HttpStatus.OK };
        }
        return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };

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
        if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };
        const url = await this.getTalkExcel(res.list);
        return { successs: true, status: HttpStatus.OK, url };
    }

    /**
     * 미입금 된 인원 카톡 자동전송
     * @returns Promise<{
            success: boolean;
            status: HttpStatus;
            msg?: string;
        }>
     */
    async notPayCron() {
        const dateVar = new Date();
        const getListDto: GetListDto = {
            date: dateVar.toISOString(),
            searchCategory: "",
            searchKeyword: ""
        }
        //당일 리스트 가져오기
        const res = await this.talkRepository.notPay(getListDto);
        if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };

        const url = await this.getTalkExcel(res.list, getListDto.date);//엑셀파일 저장.
        const sendRes = await this.sendTalk(url, '미결제 발송지연');//해당 엑셀파일을 가지고 카톡발송.
        if (sendRes.success) {
            return { successs: true, status: HttpStatus.OK, url };
        }
        else {
            return { successs: false, status: HttpStatus.INTERNAL_SERVER_ERROR, url };
        }
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
        if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };
        const url = await this.getTalkExcel(res.list);
        return { successs: true, status: HttpStatus.OK, url };
    }


    /**
     * 접수 알림 톡 자동화
     * @returns Promise<{
             success: boolean;
           status:HttpStatus;
           msg?:string
        } 
        }>
     */
    async orderInsertCron() {
        const dateVar = new Date();
        const request: GetListDto =
        {
            date: dateVar.toISOString(),
            searchCategory: "",
            searchKeyword: ""
        }
        //목록 가져오기
        const res = await this.talkRepository.orderInsertTalk(request);
        if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };
        //엑셀 다운로드후 저장경로 반환
        const url = await this.getTalkExcel(res.list, request.date);
        //카톡 전송
        const sendRes = await this.sendTalk(url, '접수확인알림톡(리뉴얼)');
        if (sendRes.success) {
            const orderInsertList = res.list.map(item => ({
                id: item.id,
                name: item.patient.name,
            }));
            const InsertRes = await this.talkRepository.completeInsertTalk(orderInsertList);
            if (InsertRes.success) {
                return { successs: true };
            }
            return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '접수 알림톡 레포지토리 오류발생' };
        }
        return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '접수 알림톡 카톡전송 오류발생' };
    }



    /**
     * 카톡 자동 발송
     * @param fileName 
     * @param work 
     * @returns 
     */
    async sendTalk(fileName: string, work: string): Promise<{ success: boolean }> {
        let browser: Browser;
        try {
            // 브라우저 실행
            browser = await puppeteer.launch({ headless: false }); // headless: false는 브라우저 UI를 표시합니다.
            const page = await browser.newPage();
            let alertHandled = false;
            // 'dialog' 이벤트를 처리합니다.
            page.on('dialog', async dialog => {
                const reg = new RegExp('포인트\\s\\d+(\\.\\d+)?로\\s알림톡\\s\\d+건\\s발송합니다.');
                if (!alertHandled && reg.test(dialog.message())) {
                    console.log(dialog.message());
                    console.log("success");
                    await dialog.accept(); // alert 창을 닫습니다.
                    alertHandled = true; // 플래그를 설정하여 동일한 alert 창을 다시 확인하지 않도록 합니다.
                } else if (!reg.test(dialog.message())) {
                    console.log(dialog.message());
                    await dialog.accept();
                }
                else {
                    console.log('Alert already handled.');
                    await dialog.dismiss();
                }
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
            }, work);


            const selector = 'a.msg_link9';

            // 요소가 나타날 때까지 기다립니다
            await page.waitForSelector(selector, { visible: true })
            await page.click(selector)

            await new Promise(resolve => setTimeout(resolve, 3000));


            await page.waitForSelector('a.msg_link8', { visible: true })
            await page.click('a.msg_link8');


            const filePath = path.resolve(fileName);
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
            }, textareaSelector);

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
            alertHandled = false;
            await page.waitForSelector('a.msg_link10', { visible: true })
            await page.click('a.msg_link10');
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { success: true }
        } catch (err) {
            console.log(err);
        } finally {
            // await browser.close();
        }

    }
}
