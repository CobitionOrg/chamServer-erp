export class GetHyphen {
    strData : string;

    constructor(strData:string){
        this.strData = strData;
    }

    //주민번호
    socialNumHyphen(str:string){
        return str.slice(0,6)+'-'+str.slice(6);
    }

    //전화번호
    phoneNumHyphen(str:string){
        return str.slice(0,3) + '-' + str.slice(3,7) + '-' + str.slice(7);
    }
}   