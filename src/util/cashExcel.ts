export class CashExcel {
    excelData: Array<any>;
    dbData: Array<any>;
    itemList: Array<any>;
    matches: Array<any>;
    duplicates: Array<any>;
    noMatches: Array<any>
    hashTable: Map<any, any>;

    constructor(excelData: any, dbData: any, itemList: any) {
        this.excelData = excelData;
        this.dbData = dbData;
        this.itemList = itemList;
        this.matches = []; //일치해서 완료 처리해야 되는 데이터
        this.noMatches = []; //엑셀 데이터 중 일치하는게 없는 데이터
        this.duplicates = []; //중복이라 확인이 필요한 경우
        this.hashTable = new Map();
    }

    buildHashTable() {
        this.excelData.forEach((e) => {
            //console.log(e.name);
            let name = e.name;
            if (e.name.match(/[\uAC00-\uD7AF]/g)) {
                name = e.name.match(/[\uAC00-\uD7AF]/g).join(''); //이름만 추출
            }
            //console.log(name);
            if (this.hashTable.has(name)) {
                const temp = this.hashTable.get(name);
                //console.log(temp);

                const tempArr = [];
                tempArr.push(temp);
                tempArr.push(e);
                this.hashTable.set(name, tempArr);
            } else {
                this.hashTable.set(name, e);
            }
        });

        
    }

    compare() {
        this.buildHashTable();

        //console.log(this.hashTable);
        //console.log(this.dbData);
        this.dbData.forEach(data => {
            if (this.hashTable.has(data.patient.name)) {
                const hashData = this.hashTable.get(data.patient.name)
                if(hashData.length>1){
                    //동명이인이 있어 금액을 비교해야 되는 경우
                    let check = []; //금액 비교해서 동일데이터가 있는지 없는지 체크
                    let idx = [];
                    for(let i = 0; i<hashData.length; i++){
                        console.log(data.id + ' / '+ data.patient.name)
                        console.log(hashData[i].cash +' / '+data)
                        let compare = this.comparePrice(hashData[i].cash, data)
                        if(compare.success){
                            check.push(hashData[i])
                            idx.push(i);
                        }
                    }

                    if(check.length == 1){
                        //동명이인 중 금액이 같은 데이터가 하나 밖에 없어 입금처리가 가능할 때
                        console.log('동명이인 중 금액이 같은 데이터가 하나 밖에 없어 입금처리가 가능할 때 ' + data.patient.name);
                        this.matches.push(data);
                        hashData.splice(idx[0],1);
                        this.hashTable.set(data.patient.name, hashData)
                    } else if(check.length>1) {
                        //동명이인 중 하필 동일 금액이 있어 수동으로 처리해야 되는 경우
                        console.log('동일 금액이 있어 수동으로 처리해야 되는 경우 ' + data.patient.name)
                        idx.forEach(i => {
                            this.duplicates.push(hashData[i]);
                            hashData.splice(i,1);
                            this.hashTable.set(data.patient.name, hashData)
                        });
                    }

                }else{
                    //동명이인이 없어 금액만 비교해서 바로 입금 처리
                    console.log('동명이인이 없어 금액만 비교해서 바로 입금 처리 ' + data.patient.name)
                    let compare = this.comparePrice(this.hashTable.get(data.patient.name).cash, data);
                    if(compare.success){
                        this.matches.push(data);
                    }else{
                        //금액이 틀릴 시
                        this.noMatches.push(this.hashTable.get(data.patient.name))
                    }
                    this.hashTable.delete(data.patient.name); //해시 테이블에서 제거

                }
            }
        });
        console.log('---------------------------------');

        for(const [ K, V ] of this.hashTable.entries()){
            if (V.length > 1) {
                this.duplicates.push(...V);
            }
        }
    
        console.log(this.matches);
        console.log(this.duplicates);
        console.log(this.noMatches);
    }

    //금액 비교
    comparePrice(excelPrice:number,dbData ) :{ success: boolean; } {
        let priceSum = 0;
        //console.log(dbData);
        const orderItem = dbData.orderItems;

        orderItem.forEach(e => {
            //별도 구매 처리 필요
            //택배비 처리 필요
            for(let i = 0; i<this.itemList.length; i++){
                if(this.itemList[i].item.includes(e.item)){
                    priceSum+=this.itemList[i].price;
                    break;
                }
            }
        });

        if(priceSum == excelPrice){
            return {success:true};
        }else{
            return {success:false};
        }
    }

    

    getResult() {
        this.buildHashTable();
        console.log(this.matches);
        console.log(this.duplicates);
        console.log(this.noMatches);
        return { matches: this.matches, duplicates: this.duplicates, noMatches: this.noMatches };
    }
}