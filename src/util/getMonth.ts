export const getMonth = (month:number) => {
    const date = new Date();

    const year = date.getFullYear();//윤년 판단 용.

    let lteDay;

    if(month<8){ //8월 이전
        month != 2 //2월인지 아닌지 확인
            ? month%2 == 0 //2월이 아니면 이대로
                ? lteDay = 30
                : lteDay = 31
            : year%4 == 0 //2월일 경우 윤년 확인 
                ? lteDay = 29
                : lteDay = 28
    }else{ //8월 부터
        month%2 == 0 ? lteDay = 31 : lteDay = 30
    }

    let monthStr = month<10 ? `0${month}` : month.toString();
    const dayObj = {
        gte : `${year}-${monthStr}-01`,
        lte : `${year}-${monthStr}-${lteDay}`
    };

    return dayObj;
   
}