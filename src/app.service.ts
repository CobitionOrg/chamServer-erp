import { Injectable } from '@nestjs/common';

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

      await page.goto('https://www.netshot.co.kr/account/login/?next=/kakao/notice_send/#none');

      await page.click('a#banner-confirm')

      await page.type('input[name="username"]', 'chammikmc');
      await page.type('input[name="password"]', 'cham0708!');

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
        const element = [...document.querySelectorAll('a')].find(el => el.textContent.includes('초진접수확인1'));
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


      const filePath = path.resolve(__dirname, '/Users/USER2022/Downloads/alerttalk.xlsx');
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

      const text = `#{변수1} 님:)
주문해주신 주문이 확인되었습니다. 

(별)주문서와 별개로 확인되는 절차이니 꼭! 답변 부탁드립니다. 

1) 이름  
2) 전화번호 
3) 주소(도로명주소)
4)본인만 복용 하실까요? (추천인x)

▶재진은 재진설문지 작성하면 주문가능합니다.

▶송장프로그램에서 지번주소는 읽혀지지않아 오배송될 확률 높습니다. 번거로우시더라도 "도로명주소"로 확인하시고 보내주세요. 

▶주소 오류 시, 발송지연&착오배송이 있을 수 있습니다. 재발송 시 택배비의 경우 주문자분 본인부담입니다. 

** 아래 답변이 늦어질 수록 상담과 발송이 늦어지는 점 양해부탁드립니다. 
** 모든 응대는 채널로만 진행되니 문의있으실 경우, 카카오톡 채널로 연락 부탁드립니다. 
`;

      await page.type('textarea#failed_content',text);
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
