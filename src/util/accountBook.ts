// 환불 (-4)
// 교환 (-3)
// 누락 (-2)
// 방문 (-1)
// 1. 일반(투명, 0)
// 2. 특이(보라 1) - 폭식환 추가 구매, 서비스 변경, 후기 서비스, 패키지 변경 등 잡다
// 3. 챌린지(초록 2) - 인스타에 글 쓴 애들
// 4. 지인(노랑 3) - 설문지에 지인 쓰고 기존 환자 리스트에서 확인 된 환자
// 5. 구수방(분홍 4) - 설문지에 구수방 써져있으면 구수방 - 구미수다방/ 구미맘카페/ 구미맘/ 구수방 써져있으면 적용
// 합배송(5)
// 분리배송(6)
export const getFooter = (list:Array<any>,addSend) => {
    console.log(list);
    let logen = 0; //로젠 수
    let combine = 0; //합배송 수
    let orderCount = 0; //총 인원
    let fullCount = 0; //총 개수
    let detail = ''; //세부
    let card = 0; //총 카드
    let cash = 0; //총 현금
    let note = ''; //비고

    let gam = 0;
    let ssen = 0;
    let yoyo = 0;

    list.forEach(e => {
        const itemLen = getItemLen(e.order.orderItems);
        gam += itemLen.gam;
        ssen += itemLen.ssen;
        yoyo += itemLen.yoyo;

        card+=e.order.card;
        cash+=e.order.cash;

        if(e.orderSortNum>-1){
            orderCount++;        
        }
        if(e.orderSortNum == 5){
            combine++;
        }
        logen++;
    });

    logen-=(combine/2);
    logen+=addSend.length;
    fullCount = gam + ssen + yoyo;
    detail =`감 ${gam}, 쎈 ${ssen}, 요 ${yoyo}`;

    addSend.forEach(e => {
        let str = `${e.tempOrder.order.id} ${e.tempOrder.patient.name}`;

        note+=str;
    }) 

    return {logen, orderCount, fullCount, detail, card, cash, note };
}

const getItemLen = (orderItems) => {
    let gam = 0;
    let ssen = 0;    
    let yoyo = 0;

    orderItems.forEach(e => {
        switch (e.item) {
            case '1개월 방문수령시 79,000원 (택배 발송시 82,500원)':
                gam+=1;
                return true
            case '2개월(+ 감비환 10포 더 드림) 158,000원 (택배무료)':
                gam+=2;
                return true
            case '3개월(+ 감비환 20포 더 드림) 237,000원 (택배무료)':
                gam+=3;
                return true
            case '4개월(+ 감비환 30포 더 드림) 316,000원  (택배무료)':
                gam+=4;
                return true
            case '5개월(+ 감비환 40포 더 드림) 395,000원  (택배무료)':
                gam+=5;
                return true
            case '6개월(+ 감비환 50포 더 드림) 474,000원  (택배무료)':
                gam+=6;
                return true
            case '7개월(+ 감비환 60포 더 드림) 553,000원 (택배무료)':
                gam+=7;
                return true
            case '8개월(+ 감비환 70포 더 드림) 632,000원 (택배무료)':
                gam+=8;
                return true
            case '9개월(+ 감비환 80포 더 드림) 711,000원 (택배무료)':
                gam+=9;
                return true
            case '10개월(+ 감비환 90포 더 드림) 790,000원 (택배무료)':
                gam+=10;
                return true
            case '11개월(+ 감비환 100포 더 드림) 869,000원 (택배무료)':
                gam+=11;
                return true
            case '12개월(+ 감비환 110포 더 드림) 948,000원 (택배무료)':
                gam+=12;
                return true
            case '쎈1개월 방문수령시 99,000원(택배 발송시 102,500원)':
                ssen+=1;
                return true
            case '쎈2개월(+ 감비환10포 더 드림) 198,000원 (택배무료)':
                ssen+=2;
                return true
            case '쎈3개월(+ 감비환20포 더 드림) 297,000원 (택배무료)':
                ssen+=3;
                return true
            case '쎈4개월(+ 감비환 30포 더 드림) 396,000원 (택배무료)':
                ssen+=4;
                return true
            case '쎈5개월(+ 감비환 40포 더 드림) 495,000원 (택배무료)':
                ssen+=5;
                return true
            case '쎈6개월(+ 감비환 50포 더 드림) 594,000원 (택배무료)':
                ssen+=6;
                return true
            case '쎈7개월(+ 감비환 60포 더 드림) 693,000원 (택배무료)':
                ssen+=7;
                return true
            case '쎈8개월(+ 감비환 70포 더 드림) 792,000원 (택배무료)':
                ssen+=8;
                return true
            case '쎈9개월(+ 감비환 80포 더 드림) 891,000원 (택배무료)':
                ssen+=9;
                return true
            case '쎈10개월(+ 감비환 90포 더 드림) 990,000원 (택배무료)':
                ssen+=10;
                return true
            case '요요방지환 3개월분 방문수령시 99,000원 (택배발송시 102,500원)':
                yoyo+=1;
                return true
            case '요요방지환 6개월분 198,000원 (택배무료)':
                yoyo+=2;
                return true
            case '요요방지환 9개월분 297,000원 (택배무료)':
                yoyo+=3;
                return true
            default:
                return false;
        }
    });

    return {gam,ssen,yoyo}
}