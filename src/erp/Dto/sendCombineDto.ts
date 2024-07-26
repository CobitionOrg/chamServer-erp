export interface SendCombineDto {
  idsObjArr: Array<{
    orderId: number;
    tempOrderId: number;
  }>;
  addr: string;
  sendListId: number;
}
