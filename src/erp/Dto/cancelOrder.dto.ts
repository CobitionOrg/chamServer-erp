import { OrderItem, Patient } from "./cancelSendOrder.dto";

export interface CancelOrderDto {
    id: number;
    cachReceipt: string;
    consultingType: boolean;
    consultingTime: string;
    date: string;
    isFirst: boolean;
    message: string;
    outage: string;
    payType: string;
    phoneConsulting: boolean;
    route: string;
    typeCheck: string;
    orderItems: Array<OrderItem>;
    patient: Patient;
    orderSortNum: number;
    remark: string;
    isPickup: boolean;
    price: number;
}