export interface InsertCashDto {
    cashExcelDto: Array<InsertCashDto>
    date: string
}

export interface CashExcelDto {
    bank:string;  //은행
    cash:string; //입금 금액
    cashReceipt:string; //현금 영수증?
    date: string; //날짜
    name : string; //이름
    return : string; //환불 금액
    type : string //type
}