export const dateUtil = (todayDate:string) => {
    let today = new Date(todayDate);
    let year = today.getFullYear(); // 년도
    let month = today.getMonth() + 1;  // 월
    let date = today.getDate();  // 날짜
    let hours = today.getHours(); // 시
    let minutes = today.getMinutes();  // 분
    let seconds = today.getSeconds();  // 초

    let startTime = new Date(year + '/' + month + '/' + date + ' ' + hours + ':' + minutes + ':' + seconds);

    return startTime;
}