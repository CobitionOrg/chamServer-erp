interface PriorityInfo {
  priority: number;
  counts: { gam: number; cen: number; yo: number };
  totalMonths: number;
}

const extractMonths = (item: string): number => {
  const match = item.match(/(\d+)개월/);
  return match ? parseInt(match[1], 10) : 0;
};

const getPriorityInfo = (orderItems: any[]): PriorityInfo => {
  let gamCount = 0;
  let cenCount = 0;
  let yoCount = 0;

  let gamMonths = 0;
  let cenMonths = 0;
  let yoMonths = 0;

  for (const item of orderItems) {
    const months = extractMonths(item.item);
    if (item.type === 'yoyo') {
      yoCount++;
      yoMonths += months;
    } else {
      if (item.item.includes('쎈')) {
        cenCount++;
        cenMonths += months;
      } else {
        gamCount++;
        gamMonths += months;
      }
    }
  }

  let priority = 0;
  if (gamCount > 0 && cenCount === 0 && yoCount === 0) {
    // 감
    priority = 1;
  } else if (cenCount > 0 && gamCount === 0 && yoCount === 0) {
    // 쎈
    priority = 2;
  } else if (gamCount > 0 && cenCount > 0 && yoCount === 0) {
    // 감&쎈
    priority = 3;
  } else if (yoCount > 0 && gamCount === 0 && cenCount === 0) {
    // 요
    priority = 4;
  } else if (gamCount > 0 && yoCount > 0 && cenCount === 0) {
    // 감&요
    priority = 5;
  } else {
    // 감&쎈&요
    priority = 6;
  }

  return {
    priority,
    counts: { gam: gamCount, cen: cenCount, yo: yoCount },
    totalMonths: gamMonths + cenMonths + yoMonths,
  };
};

const compareItems = (a: any, b: any) => {
  if (a.orderSortNum !== b.orderSortNum) {
    // orderSortNum 오름차순 정렬
    return a.orderSortNum - b.orderSortNum;
  }

  const aPriorityInfo = getPriorityInfo(a.order.orderItems);
  const bPriorityInfo = getPriorityInfo(b.order.orderItems);

  if (aPriorityInfo.priority !== bPriorityInfo.priority) {
    // 우선도에 따라 정렬
    return aPriorityInfo.priority - bPriorityInfo.priority;
  } else {
    // 우선도가 같으면
    if (aPriorityInfo.counts.gam !== bPriorityInfo.counts.gam) {
      // 개수 오름차순 정렬
      return aPriorityInfo.counts.gam - bPriorityInfo.counts.gam;
    } else if (aPriorityInfo.counts.cen !== bPriorityInfo.counts.cen) {
      return aPriorityInfo.counts.cen - bPriorityInfo.counts.cen;
    } else if (aPriorityInfo.counts.yo !== bPriorityInfo.counts.yo) {
      return aPriorityInfo.counts.yo - bPriorityInfo.counts.yo;
    } else {
      // 개수 같으면 개월수 오름차순 정렬
      if (aPriorityInfo.totalMonths !== bPriorityInfo.totalMonths) {
        return aPriorityInfo.totalMonths - bPriorityInfo.totalMonths;
      } else {
        // 마지막으로 payType "계좌이체", "카드결제" 순으로 정렬
        if (a.payType === b.payType) {
          return 0;
        } else if (a.payType === '계좌이체') {
          return -1;
        } else {
          return 1;
        }
      }
    }
  }
};

export const getSortedList = (orders: Array<any>): Array<any> => {
  const sortedList = orders.sort(compareItems);
  //console.log(sortedList);
  const combineList = sortedList.filter(item => item.orderSortNum === 5).sort((a, b) => a.addr.localeCompare(b.addr));
  const sortedOthers = sortedList.filter(item => item.orderSortNum !== 5);

  const finalSortedList = [...sortedOthers, ...combineList];

  //console.log(finalSortedList);
  return finalSortedList
};
