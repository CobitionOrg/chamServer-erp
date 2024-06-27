interface PriorityInfo {
  priority: number;
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
    totalMonths: gamMonths + cenMonths + yoMonths,
  };
};

const compareItems = (a: any, b: any) => {
  const aTotalMonths = a.order.orderItems.reduce(
    (sum: number, item: any) => sum + extractMonths(item.item),
    0,
  );
  const bTotalMonths = b.order.orderItems.reduce(
    (sum: number, item: any) => sum + extractMonths(item.item),
    0,
  );

  if (aTotalMonths !== bTotalMonths) {
    // 개월수 오름차순 정렬
    return aTotalMonths - bTotalMonths;
  }

  const aPriorityInfo = getPriorityInfo(a.order.orderItems);
  const bPriorityInfo = getPriorityInfo(b.order.orderItems);

  if (aPriorityInfo.priority !== bPriorityInfo.priority) {
    // 우선도에 따라 정렬
    return aPriorityInfo.priority - bPriorityInfo.priority;
  }

  if (a.orderSortNum !== b.orderSortNum) {
    // orderSortNum 오름차순 정렬
    return a.orderSortNum - b.orderSortNum;
  }

  // payType 순서에 따라 정렬
  const payTypeOrder = {
    계좌이체: 1,
    혼용: 2,
    카드결제: 3,
  };

  const aPayTypeOrder = payTypeOrder[a.payType] || 4;
  const bPayTypeOrder = payTypeOrder[b.payType] || 4;

  return aPayTypeOrder - bPayTypeOrder;
};

// 분리 배송도 그 안에서 오름차순으로 정렬
const compareTempOrderItems = (a: any, b: any) => {
  if (a.order.id !== b.order.id) {
    return a.order.id - b.order.id;
  }

  const aMonths = extractMonths(a.tempOrderItems?.item || '');
  const bMonths = extractMonths(b.tempOrderItems?.item || '');

  return aMonths - bMonths;
};

export const getSortedList = (orders: Array<any>): Array<any> => {
  const sortedList = orders
    .filter((item) => item.orderSortNum < 6)
    .sort(compareItems);

  const combineList = orders
    .filter((item) => item.orderSortNum === 6)
    .sort((a, b) => a.addr.localeCompare(b.addr));

  const sorted7 = orders
    .filter((item) => item.orderSortNum === 7)
    .sort(compareTempOrderItems);

  const finalSortedList = [...sortedList, ...combineList, ...sorted7];

  return finalSortedList;
};
