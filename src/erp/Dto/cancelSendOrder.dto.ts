export interface CancelSendOrderDto {
    id: number;
    outage: string;
    isFirst: boolean;
    date: Date;
    patient: Patient;
    order: Order;
    tempOrderItems: tempOrderItem
    orderUpdateInfos : orderUpdateInfo[]
    orderSortNum: number;
    sendNum: string;
    addr: string;
}

export interface Patient {
    id: number;
    phoneNum: string;
    name: string;
}

interface Order {
    id: number;
    message: string;
    cachReceipt: string;
    price: number;
    orderItems: OrderItem[]
}

interface tempOrderItem {
    item: string;
}

interface orderUpdateInfo {
    info : string;
}

export interface OrderItem {
    item: string;
    type: string;
}