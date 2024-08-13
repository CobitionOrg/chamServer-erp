import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasksRepository } from './tasks.repository';
import { LogService } from 'src/log/log.service';
import { MailerService } from '@nestjs-modules/mailer';
import { TalkService } from 'src/talk/talk.service';
import { createExcelFile } from 'src/util/createFile';
import * as Excel from 'exceljs'
import { getDateString } from 'src/util/date.util';
import { Crypto } from 'src/util/crypto.util';
import puppeteer, { Browser, Dialog } from 'puppeteer';
const fs = require('fs');
const path = require('path');

@Injectable()
export class TasksService {
    constructor(
        private readonly tasksRepository: TasksRepository,
        private readonly logService: LogService,
        private readonly mailerService: MailerService,
        private crypto: Crypto,

    ) { }

    private readonly logger = new Logger(TasksService.name);

    // 매일 23시 59분
    @Cron('0 59 23 * * *', { timeZone: "Asia/Seoul" })
    async handleCron() {
        this.logger.debug('delete s3 data');
        await this.logService.createLog(
            `데이터 삭제`,
            '데이터 삭제',
            null
        );
        await this.tasksRepository.deleteS3Data();
    }

    // 매일 23시 59분
    @Cron('0 59 23 * * * ', { timeZone: "Asia/Seoul" })
    async deleteFile() {
        this.logger.debug('delete save file');
        await this.logService.createLog(
            `세이브 파일 삭제`,
            '세이브 파일 삭제',
            null
        );
        await this.tasksRepository.deleteSaveFile();
    }

    // 매일 23시 59분
    @Cron('0 59 23 * * * ', { timeZone: "Asia/Seoul" })
    async deleteNotCallOrder() {
        this.logger.debug('delete save file');
        await this.logService.createLog(
            `상담 미연결 오더 삭제`,
            '상담 미연결 오더 삭제',
            null
        );
        await this.tasksRepository.deleteNotCallOrder();
    }

    // 매일 13시 59분
    @Cron('59 13 * * *', { timeZone: "Asia/Seoul" })
    async sendErrorLog() {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        const monthTemp = month > 9 ? month : '0' + month;
        const dayTemp = day > 9 ? day : "0" + day;

        const logFileName = `${year}-${monthTemp}-${dayTemp}.error.log`;
        const filePath = `../../logs/error/${logFileName}`;
        const absoluteFilePath = path.resolve(__dirname, filePath);

        await this.mailerService.sendMail({
            to: 'qudqud97@naver.com',
            from: 'noreply@gmail.com',
            subject: '에러로그',
            text: '에러로그',
            attachments: [
                {
                    path: absoluteFilePath
                }
            ]
        }).then((result) => {
            this.logger.log(result);
        });
    }

    // 매일 13시 59분
    @Cron('59 13 * * *', { timeZone: "Asia/Seoul" })
    async deleteFriendRecommend() {
        this.logger.log('1년 지난 추천 데이터 삭제');
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        await this.tasksRepository.deleteFriendRecommend(oneYearAgo);
    }

    //자동 퇴근 처리 기능
    // 매주 월, 목요일 20시
    @Cron('0 20 * * 1,4', { timeZone: "Asia/Seoul" })
    async leavWorkAt20() {
        this.logger.debug('월, 목요일 20시 자동 퇴근');
        await this.logService.createLog(
            '월, 목요일 20시 자동 퇴근',
            '월, 목요일 20시 자동 퇴근',
            null
        );
        await this.tasksRepository.leaveWorkAt(20);
    }

    // 매주 화, 금요일 18시
    @Cron('0 18 * * 2,5', { timeZone: "Asia/Seoul" })
    async leavWorkAt18() {
        this.logger.debug('화, 금요일 18시 자동 퇴근');
        await this.logService.createLog(
            '화, 금요일 18시 자동 퇴근',
            '화, 금요일 18시 자동 퇴근',
            null
        );
        await this.tasksRepository.leaveWorkAt(18);
    }

    // 매주 토요일 15시
    @Cron('0 15 * * 6', { timeZone: "Asia/Seoul" })
    async leaveWorkAt15() {
        this.logger.debug('토요일 15시 자동 퇴근');
        await this.logService.createLog(
            '토요일 15시 자동 퇴근',
            '토요일 15시 자동 퇴근',
            null
        );
        await this.tasksRepository.leaveWorkAt(15);
    }

    // @Cron('2 52 * * * *', { timeZone: "Asia/Seoul" })
    async test() {
        console.log("test");
        // const date = new Date();
        // const dayOfWeek = date.getDay();

        // //해당 주의 월요일 계산
        // const diffToSunday = 1 - dayOfWeek;
        // const monday = new Date(date);
        // monday.setDate(date.getDate() + diffToSunday);
        // monday.setHours(0, 0, 0, 0);

        // //해당 주의 금요일 계산
        // const diffToFriday = 5 - dayOfWeek;
        // const friday = new Date(date);
        // friday.setDate(date.getDate() + diffToFriday);
        // friday.setHours(23, 59, 59, 999);
        // const list = await this.tasksRepository.payReview(monday, friday);
        // console.log('----------------------');
        // console.log(list.list);
        // console.log(list.list[0]);
        // if (!list.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };
        // //엑셀 파일 생성
        // const excelFilePath = await this.getTalkExcelPayReview(list.list, '구매후기');
        // console.log(excelFilePath);

        const list = [];
        const obj = {
            patient: {
                name: '조병규',
                phoneNum: '01092309536'
            },
        }

        list.push(obj);
        const excelFilePath = await this.getTalkExcel(list, '테스트');
        console.log(excelFilePath);
        await this.sendTalk(excelFilePath,'접수확인알림톡');

    }


    // @Cron('0 58 0,4,6 * * *')
    // async test() {
    //     await this.mailerService.sendMail({
    //         to: 'qudqud97@naver.com',
    //         from: 'noreply@gmail.com',
    //         subject: '메일 테스트',
    //         text: '텍스트'
    //     }).then((result) => {
    //         this.logger.log(result);
    //     });

    // }

    //이런식으로 보내면 됨
    // @Cron('0 56 14 * * *')
    // async test1() {
    //     const path = 'order.xlsx'
    //     const name = '접수확인알림톡(리뉴얼)';

    //     await this.sendTalk(path, name)

    // }

    //접수 확인 알람톡
    // 매일 9시 12시 15시
    @Cron('0 28 9,12,15 * * 1,2,4,5', { timeZone: "Asia/Seoul" })
    async orderInsertTalk() {
        const date = new Date();
        const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
        const hour = kstDate.getHours();
        const excelFileName = `orderInsertTalk${hour}`;

        const res = await this.tasksRepository.orderInsertTalk();
        if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };
        //엑셀 파일 생성
        const excelFilePath = await this.getTalkExcel(res.list, excelFileName);
        console.log(excelFilePath);
        //그리고 여기에 알람톡 발송 서비스 ㄱㄱ
        //const resData = await this.sendTalk(excelFilePath, '접수확인알림톡');
        //if(resData.success) await this.tasksRepository.updateTalkFlag(res.list);
    }

    @Cron('0 0 9,12 * * 6', { timeZone: "Asia/Seoul" })
    async orderInsertTalkSaturday() {
        const date = new Date();
        const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
        const hour = kstDate.getHours();
        const excelFileName = `orderInsertTalk${hour}`;

        const res = await this.tasksRepository.orderInsertTalk();
        if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };
        //엑셀 파일 생성
        const excelFilePath = await this.getTalkExcel(res.list, excelFileName);
        console.log(excelFilePath);
        //그리고 여기에 알람톡 발송 서비스 ㄱㄱ
        // const resData = await this.sendTalk(excelFilePath, '접수확인알림톡');
        // if(resData.success) await this.tasksRepository.updateTalkFlag(res.list);
    }


    //구매 후기 (당주 월-금 초진만 - 발송목록 날짜 별로 가져와서 월요일부터 계산)
    // 매주 토요일 오전 9시
    @Cron('0 0 9 * * 6', { timeZone: "Asia/Seoul" })
    async payReview() {
        const date = new Date();

        // 한국 시간 기준으로 변경 (UTC+9)
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const koreaTime = new Date(utc + (9 * 60 * 60000));

        // 한국 시간 기준의 요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)
        const dayOfWeek = koreaTime.getDay();

        // 해당 주의 월요일 계산
        const diffToMonday = 1 - dayOfWeek;
        const monday = new Date(koreaTime);
        monday.setDate(koreaTime.getDate() + diffToMonday);
        monday.setUTCHours(0, 0, 0, 0);

        // 해당 주의 금요일 계산
        const diffToFriday = 5 - dayOfWeek;
        const friday = new Date(koreaTime);
        friday.setDate(koreaTime.getDate() + diffToFriday);
        friday.setUTCHours(23, 59, 59, 999);

        // 주의: 일요일에 실행 시 다음주 월, 금이 됨. 지금은 토요일에 실행해서 상관 없음
        const list = await this.tasksRepository.payReview(monday, friday);
        if (!list.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };
        //엑셀 파일 생성
        const excelFilePath = await this.getTalkExcelPayReview(list.list, '구매후기');
        console.log(excelFilePath);

        //그리고 여기에 알람톡 발송 서비스 ㄱㄱ
        //await this.sendTalk(excelFilePath,'구매후기');
    }

    //유선 상담 연결 안 될 시
    // 매주 금요일 오전 10시
    @Cron('0 0 10 * * 5', { timeZone: "Asia/Seoul" })
    async notCall() {
        const today = new Date();
        const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000);

        const yesterdayKstDate = new Date(kstDate);
        yesterdayKstDate.setDate(kstDate.getDate() - 1);
        yesterdayKstDate.setUTCHours(23, 59, 59, 999);

        const twoWeeksAgoKstDate = new Date(yesterdayKstDate);
        twoWeeksAgoKstDate.setDate(yesterdayKstDate.getDate() - 14);
        twoWeeksAgoKstDate.setUTCHours(0, 0, 0, 0);

        // // 2주전 목요일 00시 00분 00초, 이번주 목요일 23시 59분 59초
        // console.log(yesterdayKstDate);
        // console.log(twoWeeksAgoKstDate);

        const res = await this.tasksRepository.notCall(yesterdayKstDate, twoWeeksAgoKstDate);
        if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };

        //엑셀 파일 생성
        const excelFilePath = await this.getTalkExcel(res.list, '상담미연결');
        console.log(excelFilePath);

        //그리고 여기에 알람톡 발송 서비스 ㄱㄱ
        //await this.sendTalk(excelFilePath,'유선상담연결안될시');
    }

    //발송 알림톡 발송
    // 매주 월, 화, 목, 금 오전 11시
    @Cron('0 0 11 * * 1,2,4,5', { timeZone: "Asia/Seoul" })
    async completeSend() {
        const date = new Date();
        const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

        const fileName = kstDate.toISOString();
        const completeSendDate = getDateString(fileName);

        //////////// 테스트
        console.log("fileName", fileName);
        console.log("completeSendDate", completeSendDate);
        ////////////

        //당일 발송되는 발송목록 id
        const completeSendRes = await this.tasksRepository.completeSendTalkGetList(completeSendDate);
        console.log(completeSendRes);

        if (!completeSendRes.cid) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };

        //초진
        const firstTalk = await this.tasksRepository.completeSendTalkFirst(completeSendRes.cid.id);
        //재진
        const returnTalk = await this.tasksRepository.completeSendTalkReturn(completeSendRes.cid.id);

        if ((!returnTalk.success) && (!firstTalk.success)) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };

        for (let row of firstTalk.list) {
            const decryptedPhoneNum = this.crypto.decrypt(row.patient.phoneNum);
            row.patient.phoneNum = decryptedPhoneNum;
        }

        for (let row of returnTalk.list) {
            const decryptedPhoneNum = this.crypto.decrypt(row.patient.phoneNum);
            row.patient.phoneNum = decryptedPhoneNum;
        }

        let fName = completeSendDate.replaceAll('/', '-');

        //초진 엑셀 파일
        if (firstTalk.list.length > 0) {
            const fristExcelPath = await this.completeSendExcel(firstTalk.list, `${fName}-first`);

            //알람통 발송 ㄱㄱ
            //await this.sendTalk(fristExcelPath,'발송알림톡');
        }

        //재진 엑셀 파일
        if (returnTalk.list.length > 0) {
            const returnExcelPath = await this.completeSendExcel(returnTalk.list, `${fName}-return`);

            //알람톡 발송 ㄱㄱ
            //await this.sendTalk(returnExcelPath,'발송알림톡');

        }

    }

    //미결제
    // 매주 금요일 오전 10시
    @Cron('0 0 10 * * 5', { timeZone: "Asia/Seoul" })
    async notPay() {
        const date = new Date();
        const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

        // 하루 전
        const yesterdayKstDate = new Date(kstDate);
        yesterdayKstDate.setDate(kstDate.getDate() - 1);
        yesterdayKstDate.setUTCHours(23, 59, 59, 999);

        // 4주 전
        const fourWeeksAgoKstDate = new Date(yesterdayKstDate);
        fourWeeksAgoKstDate.setDate(yesterdayKstDate.getDate() - 28);
        fourWeeksAgoKstDate.setUTCHours(0, 0, 0, 0);

        console.log("yesterdayKstDate", yesterdayKstDate);
        console.log("fourWeeksAgoKstDate", fourWeeksAgoKstDate);


        const res = await this.tasksRepository.notPay(yesterdayKstDate, fourWeeksAgoKstDate);
        if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };

        const fileName = 'notPay';
        const notPayExcelPath = await this.getTalkExcel(res.list, fileName);

        //발송 알람톡 ㄱㄱ
        //await this.sendTalk(notPayExcelPath,'미입금');
    }

    /**
    * 접수 알람톡 용 엑셀 파일 만들기
    * @param list 
    * @param fileName 
    * @returns 
    */
    async getTalkExcel(list, fileName?) {
        console.log('sibla');
        const wb = new Excel.Workbook();
        const sheet = wb.addWorksheet('발송알림톡');
        const headers = ['이름', '휴대폰번호', '변수1', '변수2', '변수3', '변수4', '변수5', '변수6', '변수7', '변수8', '변수9', '변수10'];
        const headerWidths = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
        const headerRow = sheet.addRow(headers);
        let filePath;

        headerRow.eachCell((cell, colNum) => {
            sheet.getColumn(colNum).width = headerWidths[colNum - 1];
        });

        for (const e of list) {
            console.log(e);
            const { name, phoneNum } = e.patient;
            const rowDatas = [name, phoneNum, name, '', '', '', '', '', '', '', '', ''];
            const appendRow = sheet.addRow(rowDatas);
            //자동으로 번호에 '붙는 상황 방지
            appendRow.getCell(2).value = phoneNum.toString();
            appendRow.getCell(2).numFmt = '@';
        }


        const fileData = await wb.xlsx.writeBuffer();
        if (fileName) {
            filePath = await createExcelFile(fileData, fileName);

            return fileName;
        }

    }

    /**
* 접수 알람톡 용 엑셀 파일 만들기
* @param list 
* @param fileName 
* @returns 
*/
    async getTalkExcelPayReview(list, fileName?) {
        console.log('sibla');
        const wb = new Excel.Workbook();
        const sheet = wb.addWorksheet('발송알림톡');
        const headers = ['이름', '휴대폰번호', '변수1', '변수2', '변수3', '변수4', '변수5', '변수6', '변수7', '변수8', '변수9', '변수10'];
        const headerWidths = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
        const headerRow = sheet.addRow(headers);
        let filePath;

        headerRow.eachCell((cell, colNum) => {
            sheet.getColumn(colNum).width = headerWidths[colNum - 1];
        });

        for (const e of list) {
            console.log(e);
            const { name, phoneNum } = e.order.patient;
            const rowDatas = [name, phoneNum, name, '', '', '', '', '', '', '', '', ''];
            const appendRow = sheet.addRow(rowDatas);
            //자동으로 번호에 '붙는 상황 방지
            appendRow.getCell(2).value = phoneNum.toString();
            appendRow.getCell(2).numFmt = '@';
        }


        const fileData = await wb.xlsx.writeBuffer();
        if (fileName) {
            filePath = await createExcelFile(fileData, fileName);

            return fileName;
        }

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
            filePath = await createExcelFile(fileData, fileName);
            return fileName;
        }
    }

    /**
    * 카톡 자동 발송
    * @param fileName 
    * @param work 
    * @returns 
    */
    async sendTalk(fileName: string, work: string) {
        try {
            // 브라우저 실행
            const browser = await puppeteer.launch({
                // headless: false
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }); // headless: false는 브라우저 UI를 표시합니다.
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

            console.log(work);

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

            //엑셀 파일 선택
            await page.waitForSelector('a.msg_link8', { visible: true })
            await page.click('a.msg_link8');

            console.log(fileName);
            const filePath = path.resolve(__dirname, `../../src/files/${fileName}.xlsx`);
            console.log(filePath);
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
                    window.confirm = () => true;

                } else {
                    console.error(`Checkbox not found: ${selector}`);
                }
            }, sendButton);

            return {success:true};
            // await page.waitForSelector('a.msg_link10', { visible: true })
            // await page.click('a.msg_link10');
            // await new Promise(resolve => setTimeout(resolve, 3000));
            //await page.keyboard.press('Enter');
        } catch (err) {
            console.log(err);
        } finally {
            // await browser.close();
        }
    }

    // async orderInsertTalkTimeTest() {
    //     const date = new Date();
    //     const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    //     const hour = kstDate.getHours();

    //     console.log("orderInsertTalk");
    //     console.log("It should be now hour => ", hour);
    // }

    // async payReviewTimeTest() {
    //     const date = new Date();

    //     // 한국 시간 기준으로 변경 (UTC+9)
    //     const now = new Date();
    //     const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    //     const koreaTime = new Date(utc + (9 * 60 * 60000));

    //     // 한국 시간 기준의 요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)
    //     const dayOfWeek = koreaTime.getDay();

    //     // 해당 주의 월요일 계산
    //     const diffToMonday = 1 - dayOfWeek;
    //     const monday = new Date(koreaTime);
    //     monday.setDate(koreaTime.getDate() + diffToMonday);
    //     monday.setUTCHours(0, 0, 0, 0);

    //     // 해당 주의 금요일 계산
    //     const diffToFriday = 5 - dayOfWeek;
    //     const friday = new Date(koreaTime);
    //     friday.setDate(koreaTime.getDate() + diffToFriday);
    //     friday.setUTCHours(23, 59, 59, 999);

    //     // 주의: 일요일에 실행 시 다음주 월, 금이 됨
    //     console.log("payReivew");
    //     console.log("It should be monday 000000 and friday 235959");
    //     console.log(monday, friday);
    // }

    // async notCallTimeTest() {
    //     const today = new Date();
    //     const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000);

    //     const yesterdayKstDate = new Date(kstDate);
    //     yesterdayKstDate.setDate(kstDate.getDate() - 1);
    //     yesterdayKstDate.setUTCHours(23, 59, 59, 999);

    //     const twoWeeksAgoKstDate = new Date(yesterdayKstDate);
    //     twoWeeksAgoKstDate.setDate(yesterdayKstDate.getDate() - 14);
    //     twoWeeksAgoKstDate.setUTCHours(0, 0, 0, 0);

    //     console.log("notCall");
    //     console.log("It should be today - 1 235959 and today - 15 000000");
    //     console.log(yesterdayKstDate, twoWeeksAgoKstDate);
    // }

    // async completeSendTimeTest() {
    //     const date = new Date();
    //     const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

    //     const fileName = kstDate.toISOString();
    //     const completeSendDate = getDateString(fileName);

    //     console.log("completeSend");
    //     console.log("It should be now Date like 2024/8/10");
    //     console.log(completeSendDate);
    // }

    // async notPayTimeTest() {
    //     const date = new Date();
    //     const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

    //     // 하루 전
    //     const yesterdayKstDate = new Date(kstDate);
    //     yesterdayKstDate.setDate(kstDate.getDate() - 1);
    //     yesterdayKstDate.setUTCHours(23, 59, 59, 999);

    //     // 4주 전
    //     const fourWeeksAgoKstDate = new Date(yesterdayKstDate);
    //     fourWeeksAgoKstDate.setDate(yesterdayKstDate.getDate() - 28);
    //     fourWeeksAgoKstDate.setUTCHours(0, 0, 0, 0);

    //     console.log("notPay");
    //     console.log("It should be today - 29 000000 and today - 1 235959");
    //     console.log(fourWeeksAgoKstDate, yesterdayKstDate);
    // }

    // // 자동 발송 관련 엑셀 시간 테스트
    // @Cron('59 18 * * *', { timeZone: "Asia/Seoul" })
    // async excelTest() {
    //     await this.orderInsertTalkTimeTest();
    //     await this.payReviewTimeTest();
    //     await this.notCallTimeTest();
    //     await this.completeSendTimeTest();
    //     await this.notPayTimeTest();
    // }
}


