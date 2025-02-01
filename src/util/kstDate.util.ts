const offset = 9 * 60 * 60 * 1000;

export const getDayStartAndEnd = (date: string) => {
    const gmtDate = new Date(date);
    const kstDate = new Date(gmtDate.getTime() + offset);

    const startDate = new Date(kstDate.getTime());
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(kstDate.getTime());
    endDate.setUTCHours(23, 59, 59, 999);

    return { startDate, endDate };
};

export const getStartOfToday = () => {
    const gmtDate = new Date();
    const kstDate = new Date(gmtDate.getTime() + offset);

    const startDate = new Date(kstDate.getTime());
    startDate.setUTCHours(0, 0, 0, 0);

    return startDate;
};

export const getCurrentDateAndTime = () => {
    const gmtDate = new Date();
    const kstDate = new Date(gmtDate.getTime() + offset);

    return kstDate;
};

export const checkTardy = (date: Date) => {
    const startHour = date.getUTCHours();
    const startMin = date.getUTCMinutes();
    if (startHour < 9) {
        return false;
    } else if (startHour === 9) {
        return startMin !== 0;
    } else {
        return true;
    }
};

export const getCurrentMonth = () => {
    const gmtDate = new Date();
    const kstDate = new Date(gmtDate.getTime() + offset);

    return kstDate.getUTCMonth() + 1;
};

/**
 * 이번주의 월요일 시작, 금요일 끝 반환
 */

export const getCurrentWeeksOfMondayStartAndFridayEnd = () => {
    const currentDate = getCurrentDateAndTime();

    const currentDay = currentDate.getDay();

    const mondayBasedDay = (currentDay === 0 ? 7 : currentDay) - 2;

    const mondayStart = new Date(currentDate);
    mondayStart.setDate(currentDate.getDate() - mondayBasedDay);
    mondayStart.setUTCHours(0, 0, 0, 0);

    const fridayEnd = new Date(mondayStart);
    fridayEnd.setDate(mondayStart.getDate() + 4);
    fridayEnd.setUTCHours(23, 59, 59, 999);

    return { mondayStart, fridayEnd };
};

export function getFirstAndLastDayOfMonth(year, month) {
    // 주어진 달의 첫째 날 구하기
    const firstDay = new Date(year, month - 1, 1);

    // 주어진 달의 마지막 날 구하기
    const lastDay = new Date(year, month, 0);
    lastDay.setHours(23, 59, 59, 999); // 마지막 날의 시간을 23:59:59로 설정

    return {
        firstDay: firstDay,
        lastDay: lastDay,
    };
}

/**해당 년도 달만 주어졌을 때 첫째날과 마지막날 구하기*/
export function getFirstAndLastDayOfOnlyMonth(month) {
    const year = new Date().getFullYear();
    // 주어진 달의 첫째 날 구하기
    const firstDay = new Date(year, month - 1, 1);

    // 주어진 달의 마지막 날 구하기
    const lastDay = new Date(year, month, 0);
    lastDay.setHours(23, 59, 59, 999); // 마지막 날의 시간을 23:59:59로 설정

    return {
        startDate: firstDay,
        endDate: lastDay,
    };
}

/**연도까지 주어졌을 때 첫째날과 마지막날 구하기 */
export function getFirstAndLastDayOfYearAndMonth(year, month) {
    const firstDay = new Date(year, month - 1, 1); // 해당 월의 첫째 날
    const lastDay = new Date(year, month, 0); // 해당 월의 마지막 날

    lastDay.setHours(23, 59, 59, 999);

    return {
        startDate: firstDay,
        endDate: lastDay,
    };
}

/**
 * @param id
 * 0(sunday) ~ 6(saturday)
 * @returns
 */
export const getDayOfWeek = (id: number) => {
    const day = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
    ];
    return day[id];
};
