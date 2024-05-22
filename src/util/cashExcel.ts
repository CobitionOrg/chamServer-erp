export class CashExcel {
    excelData: Array<any>;
    dbData: Array<any>;
    itemList: Array<any>;
    matches: Array<any>;
    duplicates: Array<any>;
    noMatches: Array<any>
    hashTable: Map<any, any>;
    log : Array<any>;
    checkDuplicate : Array<any>;

    constructor(excelData: any, dbData: any, itemList: any) {
        this.excelData = excelData;
        this.dbData = dbData;
        this.itemList = itemList;
        this.matches = []; //일치해서 완료 처리해야 되는 데이터
        this.noMatches = []; //엑셀 데이터 중 일치하는게 없는 데이터
        this.duplicates = []; //중복이라 확인이 필요한 경우
        this.hashTable = new Map();
        this.log = [];
        this.checkDuplicate = [];
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
                
                if(Array.isArray(temp)){ //temp가 배열일 경우 처리
                    temp.forEach((e) => {
                        tempArr.push(e);
                    })
                }else{
                    tempArr.push(temp);
                }
                tempArr.push(e);
                this.hashTable.set(name, tempArr);
            } else {
                this.hashTable.set(name, e);
            }
        });

        
    }

    compare() {
        this.buildHashTable();
        console.log('-------------hash table--------------');
        console.log(this.hashTable);
        //console.log(this.dbData);
        //console.log(this.dbData);
        this.dbData.forEach(data => {
            if (this.hashTable.has(data.patient.name)) { //해시 테이블에 이름이 있을 경우
                if(data.patient.name =='라건호'){
                    console.log('+++++++++++++++++++++++++++++++');
                    console.log(this.hashTable.get(data.patient.name))
                }
                const hashData = this.hashTable.get(data.patient.name)
                if(hashData.length>1){
                    //동명이인이 있어 금액을 비교해야 되는 경우
                    let check = []; //금액 비교해서 동일데이터가 있는지 없는지 체크
                    let idx = [];
                    for(let i = 0; i<hashData.length; i++){
                        //console.log(data.id + ' / '+ data.patient.name)
                        //console.log(hashData[i].cash +' / '+data)
                        let compare = this.comparePrice(hashData[i].cash, data)
                        if(compare.success){
                            check.push(hashData[i]);
                            idx.push(i);
                        }
                    }

                    if(check.length == 1){
                        //중복처리해야되는 데이터인지 확인
                        let check = this.checkDuplicateFunc(data);
                        if(!check){ //중복처리해야되는 데이터일 때
                            hashData.splice(idx[0],1);
                            this.hashTable.set(data.patient.name, hashData)
                            return;
                        } 
                        //동명이인 중 금액이 같은 데이터가 하나 밖에 없어 입금처리가 가능할 때
                        //console.log('동명이인 중 금액이 같은 데이터가 하나 밖에 없어 입금처리가 가능할 때 ' + data.patient.name);
                        this.matches.push(data);
                        let price = hashData[idx[0]].cash
                        hashData.splice(idx[0],1);
                        this.hashTable.set(data.patient.name, hashData)
                        this.log.push({
                            name : data.patient.name,
                            log : 'match',
                            price : price,
                            id : 1
                        })
                    } else if(check.length>1) {
                        //동명이인 중 하필 동일 금액이 있어 수동으로 처리해야 되는 경우
                        //console.log('동일 금액이 있어 수동으로 처리해야 되는 경우 ' + data.patient.name)
                        //console.log(hashData);
                        
                        //중복리스트에 등록
                        const duplicateObj = {
                            name:data.patient.name,
                            price:hashData[0].cash
                        }
                        console.log(idx);
                        this.checkDuplicate.push(duplicateObj);

                       
                        idx.forEach(i => {
                            //console.log(i);
                            this.duplicates.push(hashData[i]);
                           
                        });

                        //뒈어서부터 지우기 위해 reverse
                        let reverseIdx = idx.reverse();
                        //duplicates 배열에 넣고 해시테이블에서 삭제
                        reverseIdx.forEach( i => {
                            hashData.splice(i,1);
                            // console.log('/////////////////////');
                            // console.log(hashData);
                            this.hashTable.set(data.patient.name, hashData)
                            this.log.push({
                                name : data.patient.name,
                                log : 'duplicates',
                                price : hashData[0].cash,
                                id:2,
                            })
                        })
                    }

                }else{
                    //동명이인이 없어 금액만 비교해서 바로 입금 처리
                    // console.log('동명이인이 없어 금액만 비교해서 바로 입금 처리 ' + data.patient.name)
                    
                    // console.log(this.hashTable.get(data.patient.name));
                    // console.log(this.hashTable.get(data.patient.name).cash);
                    let cash = Array.isArray(this.hashTable.get(data.patient.name)) ? this.hashTable.get(data.patient.name)[0].cash : this.hashTable.get(data.patient.name).cash;
                    let compare = this.comparePrice(cash, data);
                    if(compare.success){
                        this.matches.push(data);
                        this.log.push({
                            name : data.patient.name,
                            log : 'match',
                            price : cash,
                            id : 3,
                        })
                    }else{
                        //금액이 틀릴 시
                        if(Array.isArray(this.hashTable.get(data.patient.name))){ //hash table value가 배열일 때
                            this.noMatches.push(this.hashTable.get(data.patient.name)[0]);
                            this.log.push({
                                name : data.patient.name,
                                log : 'nomatch diffrent price',
                                price : this.hashTable.get(data.patient.name)[0].cash,
                                id: 4
                            });
                        }else {
                            this.noMatches.push(this.hashTable.get(data.patient.name));
                            this.log.push({
                                name : data.patient.name,
                                log : 'nomatch diffrent price',
                                price : this.hashTable.get(data.patient.name).cash,
                                id: 5
                            });
                        }
                       
                    }
                    this.hashTable.delete(data.patient.name); //해시 테이블에서 제거

                }
            }
        });
        console.log('---------------------------------');
        //console.log(this.hashTable);
        for(const [ K, V ] of this.hashTable.entries()){
            //console.log(V.length);
            //console.log('//');
            if (V.length > 0) {
                //console.log(V);
                V.forEach(e => {
                    this.noMatches.push(e); //일치하는 정보가 없는 데이터는 noMatch에 삽입
                    this.log.push({
                        name : K,
                        log : 'nomatch no data',
                        price : e.cash,
                        id : 6
                    })
                })
                
            }else {
                this.noMatches.push(V);
                this.log.push({
                    name : K,
                    log : 'nomatch no data',
                    price : V.cash,
                    id : 7
                })
            }
        }
    
        // console.log(this.matches);
        // console.log(this.duplicates);
        // console.log(this.noMatches);

        console.log(this.log);
        return { matches: this.matches, duplicates: this.duplicates, noMatches: this.noMatches };

    }

    //금액 비교
    comparePrice(excelPrice:number,dbData ) :{ success: boolean; } {
        let priceSum = this.getSum(dbData);
        //console.log(dbData);
         
        if(priceSum == excelPrice){
            return {success:true};
        }else{
            return {success:false};
        }
    }



    getSum(dbData){
        let priceSum = 0;
        const orderItem = dbData.orderItems;

        //택배비 받는 리스트
        const sendTax = ['1개월 방문수령시 79,000원 (택배 발송시 82,500원)','쎈1개월 방문수령시 99,000원(택배 발송시 102,500원)','요요방지환 3개월분 방문수령시 99,000원 (택배발송시 102,500원)']; //택배비 처리

        let check = [];
        //console.log(dbData.patient.name +' 금액 비교');
        
        orderItem.forEach(e => {
            if(e.type != 'assistant'){
                check.push(e);
            }
        });
        //console.log(check);
        //console.log(sendTax.includes(check[0]?.item));
        if(check.length == 1 && sendTax.includes(check[0].item)){
            priceSum+=3500;
        }

        orderItem.forEach(e => {
            //별도 구매 처리 필요
            for(let i = 0; i<this.itemList.length; i++){
                if(this.itemList[i].item.includes(e.item)){
                    priceSum+=this.itemList[i].price;
                    //console.log(priceSum);
                    break;
                }
            }
        });

        return priceSum;
    }

    //저장된 중복리스트에 있는 사람인지 확인
    checkDuplicateFunc(dbData){
        let name = dbData.patient.name;
        let price = this.getSum(dbData);
       
        let check = this.checkDuplicate.some(i => i.name == name && i.price == price); //저장된 중복리스트에 있는 사람인지 확인

        if(check){ //중복데이터일 때
            return false;
        }else{ //중복데이터가 이닐 때
            return true;
        }
    }
    


}