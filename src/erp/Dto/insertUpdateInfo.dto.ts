export interface InsertUpdateInfoDto {
    infoData : Array<InfoData>;
    tempOrderId: number;
}

interface InfoData {
    info: string;
    id: number
}