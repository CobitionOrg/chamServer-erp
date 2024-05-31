export interface SeparateDataDto {
    addr :string;
    orderItem: string;
    sendTax: boolean;
}

export interface SepareteDto{
    separate:Array<SeparateDataDto>;
    orderId : number;
}