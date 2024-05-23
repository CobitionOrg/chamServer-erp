//리팩토링 예정
export class GetOrderSendPrice{
    orderItems : Array<any>;
    itemList : Array<any>;

    constructor(orderItems: any, itemList:any){
        this.orderItems = orderItems;
        this.itemList = itemList
    }

    //일단 주문 내역 금액만 합계
    getPrice(){
        let priceSum = 0;

        this.orderItems.forEach(e => {
            for(let i = 0; i<this.itemList.length; i++){
                priceSum+=this.itemList[i].price;
                break;
            }
        });

        return priceSum;
    }

    //택배 주문 시 택배비 받는 주문인지를 체크
    checkSend(){
        let checkFlag = false;

        //택배비 받는 리스트
        const sendTax = ['1개월 방문수령시 79,000원 (택배 발송시 82,500원)','쎈1개월 방문수령시 99,000원(택배 발송시 102,500원)','요요방지환 3개월분 방문수령시 99,000원 (택배발송시 102,500원)']; //택배비 처리
          
        let check = [];

        this.orderItems.forEach(e => {
          if(e.type != 'assistant'){
              check.push(e);
          }
        });

        //별도 주문 제외하고 주문 내역이 하나인데 그 하나가 택배비 받는 오더일 때
        if(check.length ===1 && sendTax.includes(check[0].item)){
            checkFlag = true;
        }

        //별도 주문만 있을 때
        if(check.length === 0){
            checkFlag = true;
        }

        return checkFlag;
    }
}