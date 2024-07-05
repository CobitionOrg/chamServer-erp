//id로 바꿀지 고민 중
export const getItem = (item: string) => {
    switch (item) {
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
        case '7개월(+ 감비환 60포 더 드림) 553,000원 (택배무료)':
            return '감7개월(s60)';
        case '8개월(+ 감비환 70포 더 드림) 632,000원 (택배무료)':
            return '감8개월(s70)';
        case '9개월(+ 감비환 80포 더 드림) 711,000원 (택배무료)':
            return '감9개월(s80)';
        case '10개월(+ 감비환 90포 더 드림) 790,000원 (택배무료)':
            return '감10개월(s90)';
        case '11개월(+ 감비환 100포 더 드림) 869,000원 (택배무료)':
            return '감11개월(s100)';
        case '12개월(+ 감비환 110포 더 드림) 948,000원 (택배무료)':
            return '감12개월(s110)';
        case '쎈1개월 방문수령시 99,000원(택배 발송시 102,500원)':
            return '쎈1개월';
        case '쎈2개월(+ 감비환10포 더 드림) 198,000원 (택배무료)':
            return '쎈2개월(s10)';
        case '쎈3개월(+ 감비환20포 더 드림) 297,000원 (택배무료)':
            return '쎈3개월(s20)';
        case '쎈4개월(+ 감비환 30포 더 드림) 396,000원 (택배무료)':
            return '쎈4개월(s30)';
        case '쎈5개월(+ 감비환 40포 더 드림) 495,000원 (택배무료)':
            return '쎈5개월(s40)';
        case '쎈6개월(+ 감비환 50포 더 드림) 594,000원 (택배무료)':
            return '쎈6개월(s50)';
        case '쎈7개월(+ 감비환 60포 더 드림) 693,000원 (택배무료)':
            return '쎈7개월(s60)';
        case '쎈8개월(+ 감비환 70포 더 드림) 792,000원 (택배무료)':
            return '쎈8개월(s70)';
        case '쎈9개월(+ 감비환 80포 더 드림) 891,000원 (택배무료)':
            return '쎈9개월(s80)';
        case '쎈10개월(+ 감비환 90포 더 드림) 990,000원 (택배무료)':
            return '쎈10개월(s90)';
        case '요요방지환 3개월분 방문수령시 99,000원 (택배발송시 102,500원)':
            return '요요3개월';
        case '요요방지환 6개월분 198,000원 (택배무료)':
            return '요요6개월';
        case '요요방지환 9개월분 297,000원 (택배무료)':
            return '요요9개월'
        default:
            return item;
    }
}

const getItemShortName = (item: string) => {
    switch (item) {
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
        case '7개월(+ 감비환 60포 더 드림) 553,000원 (택배무료)':
            return '7';
        case '8개월(+ 감비환 70포 더 드림) 632,000원 (택배무료)':
            return '8';
        case '9개월(+ 감비환 80포 더 드림) 711,000원 (택배무료)':
            return '9';
        case '10개월(+ 감비환 90포 더 드림) 790,000원 (택배무료)':
            return '10';
        case '11개월(+ 감비환 100포 더 드림) 869,000원 (택배무료)':
            return '11';
        case '12개월(+ 감비환 110포 더 드림) 948,000원 (택배무료)':
            return '12';
        case '쎈1개월 방문수령시 99,000원(택배 발송시 102,500원)':
            return '쎈1';
        case '쎈2개월(+ 감비환10포 더 드림) 198,000원 (택배무료)':
            return '쎈2';
        case '쎈3개월(+ 감비환20포 더 드림) 297,000원 (택배무료)':
            return '쎈3';
        case '쎈4개월(+ 감비환 30포 더 드림) 396,000원 (택배무료)':
            return '센4';
        case '쎈5개월(+ 감비환 40포 더 드림) 495,000원 (택배무료)':
            return '쎈5';
        case '쎈6개월(+ 감비환 50포 더 드림) 594,000원 (택배무료)':
            return '쎈6';
        case '쎈7개월(+ 감비환 60포 더 드림) 693,000원 (택배무료)':
            return '쎈7';
        case '쎈8개월(+ 감비환 70포 더 드림) 792,000원 (택배무료)':
            return '쎈8';
        case '쎈9개월(+ 감비환 80포 더 드림) 891,000원 (택배무료)':
            return '쎈9';
        case '쎈10개월(+ 감비환 90포 더 드림) 990,000원 (택배무료)':
            return '쎈10';
        case '요요방지환 3개월분 방문수령시 99,000원 (택배발송시 102,500원)':
            return '요1';
        case '요요방지환 6개월분 198,000원 (택배무료)':
            return '요2';
        case '요요방지환 9개월분 297,000원 (택배무료)':
            return '요3';
        default:
            return item;
    }
}
 
export const getServiceItem = (item) => {
    console.log(item);
    const arr = item.split('(s');
    console.log(arr);
    const onlyItem = arr[0];
    const serviceItem = arr[1] != undefined ? arr[1].replace(')','') : '0'

    return { onlyItem, serviceItem };
}

export const getItemAtAccount = (orderItems) => {
    let common = '';
    let yoyo = '';
    let assistant = ''

    orderItems.forEach(e => {
        if (e.type == 'assistant') {
            assistant += `${e.item}+`;
        } else if (e.type == 'common') {
            common += `${getItemShortName(e.item)}+`
        } else if (e.type == 'yoyo') {
            yoyo += `${getItemShortName(e.item)}+`
        } else {
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

    return { common, yoyo, assistant };
}