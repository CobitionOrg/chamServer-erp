//id로 바꿀지 고민 중
export const getItem = (item:string) => {
    switch(item){
        case '1개월 방문수령시 79,000원 (택배 발송시 82,500원)':
            return '감1개월';
        case '2개월(+ 감비환 10포 더 드림) 158,000원 (택배무료)':
            return '감2개월(s10)';
        case '3개월(+ 감비환 20포 더 드림) 237,000원 (택배무료)':
            return '감3개월(s20)';
        case '4개월(+ 감비환 30포 더 드림) 316,000원  (택배무료)':
            return '감4개월(s30)';
        case '5개월(+ 감비환 40포 더 드림) 395,000원  (택배무료)':
            return '감5개월(s40)';
        case '6개월(+ 감비환 50포 더 드림) 474,000원  (택배무료)':
            return '감6개월(s50)';
        case '쎈1개월 방문수령시 99,000원(택배 발송시 102,500원)':
            return '쎈1개월';
        case '쎈2개월(+ 감비환10포 더 드림) 198,000원 (택배무료)':
            return '쎈2개월(s10)';
        case '쎈3개월(+ 감비환20포 더 드림) 297,000원 (택배무료)':
            return '쎈3개월(s20)';
        case '요요방지환 3개월분 방문수령시 99,000원 (택배발송시 102,500원)':
            return '요요3개월';
        case '요요방지환 6개월분 198,000원 (택배무료)':
            return '요요6개월';
        default:
            return item;
    }
}

const getItemShortName = (item:string) => {
    switch(item){
        case '1개월 방문수령시 79,000원 (택배 발송시 82,500원)':
            return '1';
        case '2개월(+ 감비환 10포 더 드림) 158,000원 (택배무료)':
            return '2';
        case '3개월(+ 감비환 20포 더 드림) 237,000원 (택배무료)':
            return '3';
        case '4개월(+ 감비환 30포 더 드림) 316,000원  (택배무료)':
            return '4';
        case '5개월(+ 감비환 40포 더 드림) 395,000원  (택배무료)':
            return '5';
        case '6개월(+ 감비환 50포 더 드림) 474,000원  (택배무료)':
            return '6';
        case '쎈1개월 방문수령시 99,000원(택배 발송시 102,500원)':
            return '쎈1';
        case '쎈2개월(+ 감비환10포 더 드림) 198,000원 (택배무료)':
            return '쎈2';
        case '쎈3개월(+ 감비환20포 더 드림) 297,000원 (택배무료)':
            return '쎈3';
        case '요요방지환 3개월분 방문수령시 99,000원 (택배발송시 102,500원)':
            return '요1';
        case '요요방지환 6개월분 198,000원 (택배무료)':
            return '요2';
        default:
            return item;
    }
}

export const getItemAtAccount = (orderItems) => {
    let common ='';
    let yoyo = '';
    let assistant = ''

    orderItems.forEach(e => {
        if(e.type=='assistant'){
            assistant+=`${e.item}+`;
        }else if(e.type == 'common'){
            common+=`${getItemShortName(e.item)}+`
        }else if(e.type=='yoyo'){
            yoyo+=`${getItemShortName(e.item)}+`
        }else{
            throw Error();
        }
    });

    if (common.length > 0) {
        common = common.slice(0, -1);
    }
    if (yoyo.length > 0) {
        yoyo = yoyo.slice(0, -1); 
    }
    if (assistant.length > 0) {
        assistant = assistant.slice(0, -1);
    }

    if (common == '' && yoyo == '') {
        common = '별도';
    }

    return {common, yoyo, assistant};
}