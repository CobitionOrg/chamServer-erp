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

    @Cron('0 59 23 * * * ')
    async deleteNotCallOrder() {
        this.logger.debug('delete save file');
        await this.logService.createLog(
            `상담 미연결 오더 삭제`,
            '상담 미연결 오더 삭제',
            null
        );
        await this.tasksRepository.deleteNotCallOrder();
    }


    //자동 퇴근 처리 기능
    @Cron('0 11 * * 1,4') // 월요일, 목요일 오전 11시 (UTC) -> 저녁 8시 (KST)
    async leavWorkAt20() {
        this.logger.debug('월, 목요일 20시 자동 퇴근');
        await this.logService.createLog(
            '월, 목요일 20시 자동 퇴근',
            '월, 목요일 20시 자동 퇴근',
            null
        );
        await this.tasksRepository.leaveWorkAt(20);
    }

    @Cron('0 9 * * 2,5') // 화요일, 금요일 오전 9시 (UTC) -> 저녁 6시 (KST)
    async leavWorkAt18() {
        this.logger.debug('화, 금요일 18시 자동 퇴근');
        await this.logService.createLog(
            '화, 금요일 18시 자동 퇴근',
            '화, 금요일 18시 자동 퇴근',
            null
        );
        await this.tasksRepository.leaveWorkAt(18);
    }

    @Cron('0 6 * * 6') // 토요일 오전 6시 (UTC) -> 오후 3시 (KST)
    async leaveWorkAt15() {
        this.logger.debug('토요일 15시 자동 퇴근');
        await this.logService.createLog(
            '토요일 15시 자동 퇴근',
            '토요일 15시 자동 퇴근',
            null
        );
        await this.tasksRepository.leaveWorkAt(15);
    }

    @Cron('0 58 0,4,6 * * *')
    async test() {
        await this.mailerService.sendMail({
            to: 'qudqud97@naver.com',
            from: 'noreply@gmail.com',
            subject: '메일 테스트',
            text: '텍스트'
        }).then((result) => {
            this.logger.log(result);
        });

    }

    //이런식으로 보내면 됨
    // @Cron('0 56 14 * * *')
    // async test1() {
    //     const path = 'order.xlsx'
    //     const name = '접수확인알림톡(리뉴얼)';

    //     await this.sendTalk(path, name)

    // }

    //접수 확인 알람톡
    @Cron('0 14 14 * * *')
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
    }

    //구매 후기 (당주 월-금 초진만 - 발송목록 날짜 별로 가져와서 월요일부터 계산)
    @Cron('0 0 0 * * 6')
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
        const list = await this.tasksRepository.payReview(monday, friday);
        if (!list.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };
        //엑셀 파일 생성
        const excelFilePath = await this.getTalkExcel(list.list, '구매후기');
        console.log(excelFilePath);

        //그리고 여기에 알람톡 발송 서비스 ㄱㄱ
    }

    //유선 상담 연결 안 될 시
    @Cron('0 0 1 * * 5')
    async notCall() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        //2주 전 날짜
        const twoWeeksAgo = new Date(yesterday);
        twoWeeksAgo.setDate(yesterday.getDate() - 14);

        const res = await this.tasksRepository.notCall(yesterday, twoWeeksAgo);
        if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };

        //엑셀 파일 생성
        const excelFilePath = await this.getTalkExcel(res.list, '상담미연결');
        console.log(excelFilePath);

        //그리고 여기에 알람톡 발송 서비스 ㄱㄱ
    }

    //발송 알림톡 발송
    @Cron('0 0 2 * * 1,2,4,5', {
        timeZone: 'Asia/Seoul', // KST를 위한 타임존 설정
    })
    async completeSend() {
        const fileName = new Date().toISOString();
        const completeSendDate = getDateString(fileName);

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
        }

        //재진 엑셀 파일
        if (returnTalk.list.length > 0) {
            const returnExcelPath = await this.completeSendExcel(returnTalk.list, `${fName}-return`);

            //알람톡 발송 ㄱㄱ
        }

    }


    @Cron('0 0 1 * * 5')
    async notPay() {
        const today = new Date();

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate()-1);

        //4주 전 날짜
        const fourWeeksAgo = new Date(yesterday);
        fourWeeksAgo.setDate(yesterday.getDate() - 28);

        const res = await this.tasksRepository.notPay(yesterday, fourWeeksAgo);
        if (!res.success) return { success: false, status: HttpStatus.INTERNAL_SERVER_ERROR, msg: '서버 내부 에러 발생' };
    
        const fileName = 'notPay';
        const notPayExcelPath = await this.getTalkExcel(res.list, fileName);

        //발송 알람톡 ㄱㄱ

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
            filePath = await createExcelFile(fileData, fileName);

            return filePath;
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
            return filePath;
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
                headless: false
                //   headless: true,
                //   args: ['--no-sandbox', '--disable-setuid-sandbox']
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
            const filePath = path.resolve(__dirname, `../../src/files/${fileName}`);
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
}


