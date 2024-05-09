export interface SendOrder {
    id: number;
    outage: string;
    isFirst: boolean;
    date: Date;
    patient: Patient;
    order: Order;
    orderSortNum: number;
    sendNum : string;
}

interface Patient {
    id: number;
    phoneNum: string;
    name: string;
    addr: string;
}

interface Order {
    id: number;
    message: string;
    cachReceipt: string;
    orderItems: OrderItem[]
}

interface OrderItem {
    item: string;
    type: string;
  }