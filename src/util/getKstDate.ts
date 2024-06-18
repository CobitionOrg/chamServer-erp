export const getKstDate = (date: string) => {
    //날짜 조건 O
    // 그리니치 천문대 표준시
    const gmtDate = new Date(date);
    // 한국 시간으로 바꾸기
    const kstDate = new Date(gmtDate.getTime() + 9 * 60 * 60 * 1000);
  
    const startDate = new Date(kstDate.getTime());
    startDate.setUTCHours(0, 0, 0, 0);
  
    const endDate = new Date(kstDate.getTime());
    endDate.setUTCHours(23, 59, 59, 999);
  
    return { startDate, endDate };
  };