import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import puppeteer from 'puppeteer';
const path = require('path');

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello Github action!!';
  }

  async test() {
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
      const value = await page.evaluate(async () => {

        // Find the <a> element containing the text "초진접수확인1"
        const element = [...document.querySelectorAll('a')].find(el => el.textContent.includes('접수확인알림톡(리뉴얼)'));
        console.log(element);
        // Find the checkbox in the same <ul> as the <a> element
        const checkbox = element.closest('ul').querySelector('input[type="checkbox"]').dispatchEvent(new Event('click'));
        console.log(checkbox);

        const test = document.querySelector('a.msg_link9').dispatchEvent(new Event('click'));
        console.log(test.valueOf);
        // Check the checkbox


      });


      const selector = 'a.msg_link9';

      // 요소가 나타날 때까지 기다립니다
      await page.waitForSelector(selector, { visible: true })
      await page.click(selector)

      await new Promise(resolve => setTimeout(resolve, 3000));


      await page.waitForSelector('a.msg_link8', { visible: true })
      await page.click('a.msg_link8');


      const filePath = path.resolve(__dirname, '/home/jeon/바탕화면/jeon/한의원 엑셀/재진발송알림톡6_18 (사본).xlsx');
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
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log(templateContent);
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
      await page.click('a.msg_link10');

    } catch (err) {
      console.log(err);
    }

  }

  
}
