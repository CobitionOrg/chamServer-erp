import { exceptions } from "winston";

//리팩토링 예정
export class GetOrderSendPrice {
    orderItems: Array<any>;
    itemList: Array<any>;
    isPickup: boolean;
    addr: string | null;


    constructor(
        orderItems: any,
        itemList: any,
        isPickup: boolean = false,
        addr? : string
    ) {
        this.orderItems = orderItems;
        this.itemList = itemList;
        this.isPickup = isPickup;
        this.addr = addr !== undefined ? addr : null
    }

    getTenDiscount() {
        let priceSum = this.getOnlyPrice();
        let discount = priceSum * 0.9;
        console.log(discount);
        console.log(checkSend);
        if (this.checkSend()) {
            discount += 3500;
        }
        console.log('////////////////////')
        console.log(this.addr);

        if (this.addr !== null) {
            if (this.addr.includes('제주')) {
                discount += 3000;
            } else if (this.addr.includes('울릉')) {
                discount += 10000;
            }
        }
        return discount;
    }

    //일단 주문 내역 금액만 합계
    getPrice(orderSortNum?: number) {
        let priceSum = 0;

        const checkSend = this.checkSend();
        console.log(checkSend + "/////////////");
        console.log(this.isPickup);
        if (checkSend && this.isPickup === false) {
            if (orderSortNum !== -1) {
                priceSum += 3500;
            }
        }

        console.log('////////////////////////////');
        console.log(this.orderItems);
        this.orderItems.forEach(e => {
            if (e.type == 'assistant') {
                let assistantArr = e.item.split(',');
                console.log(assistantArr);
                assistantArr.forEach(e => {
                    let order = e.replace("'", '');
                    let check = order.split(' ');

                    if (check.length > 1) {
                        let item = check[0];
                        let amount = check[1].slice(0, -1);
                        // console.log('----------------');
                        // console.log(item);
                        // console.log(amount);
                        for (let i = 0; i < this.itemList.length; i++) {
                            if (this.itemList[i].item == item) {
                                priceSum += (this.itemList[i].price * amount);
                                break;
                            }
                        }
                    }
                })
            } else {
                if (Array.isArray(e.item)) {  //재진 설문 시 배열로 넘어올 때
                    e.item.forEach(item => {
                        for (let i = 0; this.itemList.length; i++) {
                            if (item != "" && this.itemList[i].item.includes(item)) {
                                priceSum += this.itemList[i].price;
                                break;
                            }
                        }
                    })
                } else { //초진 설문일 때
                    for (let i = 0; this.itemList.length; i++) {
                        if (e.item != "" && this.itemList[i].item.includes(e.item)) {
                            priceSum += this.itemList[i].price;
                            break;
                        }
                    }
                }

            }

        });

        console.log(this.addr)
 
        if (this.addr !== null) {
            if (this.addr.includes('제주')) {
                priceSum += 3000;
            } else if (this.addr.includes('울릉')) {
                priceSum += 10000;
            }


        }

        return priceSum;
    }

    getOnlyPrice() {
        let priceSum = 0;

        this.orderItems.forEach(e => {
            if (e.type == 'assistant') {
                let assistantArr = e.item.split(',');
                console.log(assistantArr);
                assistantArr.forEach(e => {
                    let order = e.replace("'", '');
                    let check = order.split(' ');

                    if (check.length > 1) {
                        let item = check[0];
                        let amount = check[1].slice(0, -1);
                        // console.log('----------------');
                        // console.log(item);
                        // console.log(amount);
                        for (let i = 0; i < this.itemList.length; i++) {
                            if (this.itemList[i].item == item) {
                                priceSum += (this.itemList[i].price * amount);
                                break;
                            }
                        }
                    }
                })
            } else {
                if (Array.isArray(e.item)) {  //재진 설문 시 배열로 넘어올 때
                    e.item.forEach(item => {
                        for (let i = 0; i < this.itemList.length; i++) {
                            if (item != "" && this.itemList[i].item.includes(item)) {
                                priceSum += this.itemList[i].price;
                                break;
                            }
                        }
                    })
                } else { //초진 설문일 때
                    for (let i = 0; i < this.itemList.length; i++) {
                        if (e.item != "" && this.itemList[i].item.includes(e.item)) {
                            priceSum += this.itemList[i].price;
                            break;
                        }
                    }
                }

            }

        });

        return priceSum;
    }

    //택배 주문 시 택배비 받는 주문인지를 체크
    checkSend() {
        let checkFlag = false;

        //택배비 받는 리스트
        const sendTax = [
            '1개월 방문수령시 79,000원 (택배 발송시 82,500원)',
            '쎈1개월 방문수령시 99,000원(택배 발송시 102,500원)',
            '요요방지환 3개월분 방문수령시 99,000원 (택배발송시 102,500원)',
            '개월수선택안함(상담후선택원하는 분/ 별도구매원하는 분) '
        ]; //택배비 처리

        let check = [];
        //console.log('/////////////////////////');
        this.orderItems.forEach(e => {
            console.log(e);

            if (Array.isArray(e.item)) {
                e.item.forEach(i => {
                    if (e.type != 'assistant' && i.item != '') {
                        const obj = {
                            item: i,
                            type: e.type
                        }
                        check.push(obj)
                    }
                })
            } else {
                if (e.type != 'assistant' && e.item != '') {
                    check.push(e);
                }
            }

        });

        //console.log(check);

        //별도 주문 제외하고 주문 내역이 하나인데 그 하나가 택배비 받는 오더일 때
        if (check.length === 1 && sendTax.includes(check[0].item)) {
            checkFlag = true;
        }

        //별도 주문만 있을 때
        if (check.length === 0) {
            checkFlag = true;
        }

        return checkFlag;
    }
}

//택배 주문 시 택배비 받는 주문인지를 체크
export function checkSend(orderItems) {
    let checkFlag = false;

    //택배비 받는 리스트
    const sendTax = [
        '1개월 방문수령시 79,000원 (택배 발송시 82,500원)',
        '쎈1개월 방문수령시 99,000원(택배 발송시 102,500원)',
        '요요방지환 3개월분 방문수령시 99,000원 (택배발송시 102,500원)'
    ]; //택배비 처리

    let check = [];
    //console.log('/////////////////////////');
    orderItems.forEach(e => {
        console.log(e);

        if (Array.isArray(e.item)) {
            e.item.forEach(i => {
                if (e.type != 'assistant' && i.item != '' && i.item != '개월수선택안함(상담후선택원하는 분/ 별도구매원하는 분) ') {
                    const obj = {
                        item: i,
                        type: e.type
                    }
                    check.push(obj)
                }
            })
        } else {
            if (e.type != 'assistant' && e.item != '' && e.item != '개월수선택안함(상담후선택원하는 분/ 별도구매원하는 분) ') {
                check.push(e);
            }
        }

    });

    console.log(check);

    //별도 주문 제외하고 주문 내역이 하나인데 그 하나가 택배비 받는 오더일 때
    if (check.length === 1 && sendTax.includes(check[0].item)) {
        checkFlag = true;
    }

    //별도 주문만 있을 때
    if (check.length === 0) {
        checkFlag = true;
    }

    return checkFlag;
}


export function getOnlyPrice(orderItems, itemList) {
    //console.log(itemList);
    let priceSum = 0;

    orderItems.forEach(e => {

        if (e.type == 'assistant') {
            let assistantArr = e.item.split(',');
            console.log(assistantArr);
            assistantArr.forEach(e => {
                let order = e.replace("'", '');
                let check = order.split(' ');

                if (check.length > 1) {
                    let item = check[0];
                    let amount = check[1].slice(0, -1);
                    // console.log('----------------');
                    // console.log(item);
                    // console.log(amount);
                    for (let i = 0; i < itemList.length; i++) {
                        if (itemList[i].item == item) {
                            priceSum += (itemList[i].price * amount);
                            break;
                        }
                    }
                }
            })
        } else {
            if (Array.isArray(e.item)) {  //재진 설문 시 배열로 넘어올 때
                e.item.forEach(item => {
                    for (let i = 0; i < itemList.length; i++) {
                        if (item != "" && itemList[i].item.includes(item)) {
                            priceSum += itemList[i].price;
                            break;
                        }
                    }
                })
            } else { //초진 설문일 때
                for (let i = 0; i < itemList.length; i++) {
                    console.log(itemList[i])
                    if (e.item != "" && itemList[i].item.includes(e.item)) {
                        priceSum += itemList[i].price;
                        break;
                    }
                }
            }

        }

    });

    return priceSum;
}