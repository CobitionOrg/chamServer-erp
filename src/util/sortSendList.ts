interface PriorityInfo {
  priority: number;
  gamMonths: number;
  cenMonths: number;
  yoMonths: number;
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
    priority = 1; // 감
  } else if (cenCount > 0 && gamCount === 0 && yoCount === 0) {
    priority = 2; // 쎈
  } else if (gamCount > 0 && cenCount > 0 && yoCount === 0) {
    priority = 3; // 감&쎈
  } else if (yoCount > 0 && gamCount === 0 && cenCount === 0) {
    priority = 4; // 요
  } else if (gamCount > 0 && yoCount > 0 && cenCount === 0) {
    priority = 5; // 감&요
  } else if (cenCount > 0 && yoCount > 0 && gamCount === 0) {
    priority = 6; // 쎈&요
  } else {
    priority = 7; // 감&쎈&요
  }

  return {
    priority,
    gamMonths,
    cenMonths,
    yoMonths,
  };
};

const payTypeOrder = {
  계좌이체: 1,
  혼용: 2,
  카드결제: 3,
};

const compareByPriority = (
  aPriorityInfo: PriorityInfo,
  bPriorityInfo: PriorityInfo,
) => {
  if (aPriorityInfo.priority !== bPriorityInfo.priority) {
    return aPriorityInfo.priority - bPriorityInfo.priority;
  }

  switch (aPriorityInfo.priority) {
    case 1: // 감
      return aPriorityInfo.gamMonths - bPriorityInfo.gamMonths;
    case 2: // 쎈
      return aPriorityInfo.cenMonths - bPriorityInfo.cenMonths;
    case 3: // 감&쎈
      if (aPriorityInfo.gamMonths !== bPriorityInfo.gamMonths) {
        return aPriorityInfo.gamMonths - bPriorityInfo.gamMonths;
      }
      return aPriorityInfo.cenMonths - bPriorityInfo.cenMonths;
    case 4: // 요
      return aPriorityInfo.yoMonths - bPriorityInfo.yoMonths;
    case 5: // 감&요
      if (aPriorityInfo.yoMonths !== bPriorityInfo.yoMonths) {
        return aPriorityInfo.yoMonths - bPriorityInfo.yoMonths;
      }
      return aPriorityInfo.gamMonths - bPriorityInfo.gamMonths;
    case 6: // 쎈&요
      if (aPriorityInfo.yoMonths !== bPriorityInfo.yoMonths) {
        return aPriorityInfo.yoMonths - bPriorityInfo.yoMonths;
      }
      return aPriorityInfo.cenMonths - bPriorityInfo.cenMonths;
    case 7: // 감&쎈&요
      if (aPriorityInfo.yoMonths !== bPriorityInfo.yoMonths) {
        return aPriorityInfo.yoMonths - bPriorityInfo.yoMonths;
      }
      if (aPriorityInfo.gamMonths !== bPriorityInfo.gamMonths) {
        return aPriorityInfo.gamMonths - bPriorityInfo.gamMonths;
      }
      return aPriorityInfo.cenMonths - bPriorityInfo.cenMonths;
    default:
      return 0;
  }
};

const compareItems = (a: any, b: any) => {
  const aPriorityInfo = getPriorityInfo(a.order.orderItems);
  const bPriorityInfo = getPriorityInfo(b.order.orderItems);

  const priorityComparison = compareByPriority(aPriorityInfo, bPriorityInfo);
  if (priorityComparison !== 0) {
    return priorityComparison;
  }

  if (a.orderSortNum !== b.orderSortNum) {
    return a.orderSortNum - b.orderSortNum;
  }

  const aPayTypeOrder = payTypeOrder[a.payType] || 4;
  const bPayTypeOrder = payTypeOrder[b.payType] || 4;

  return aPayTypeOrder - bPayTypeOrder;
};

const compareTempOrderItems = (a: any, b: any) => {
  const aMonths = extractMonths(a.tempOrderItems?.item || '');
  const bMonths = extractMonths(b.tempOrderItems?.item || '');

  return aMonths - bMonths;
};

const groupBy = (list: any[], keyGetter: (item: any) => string) => {
  const map = new Map<string, any[]>();
  list.forEach((item) => {
    const key = keyGetter(item);
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  });
  return map;
};

export const getSortedList = (orders: Array<any>): Array<any> => {
  const sortedMinus4To0 = orders
    .filter((item) => item.orderSortNum >= -4 && item.orderSortNum <= 0)
    .sort((a, b) => {
      if (a.orderSortNum !== b.orderSortNum) {
        return a.orderSortNum - b.orderSortNum;
      }
      return compareItems(a, b);
    });

  const sorted1To5 = orders
    .filter((item) => item.orderSortNum >= 1 && item.orderSortNum <= 5)
    .sort((a, b) => {
      return compareItems(a, b);
    });

  const sorted6Map = groupBy(
    orders.filter((item) => item.orderSortNum === 6),
    (item) => item.addr,
  );

  const sorted6 = Array.from(sorted6Map.values())
    .sort((a, b) => compareItems(a[0], b[0]))
    .flat();

  const sorted7Map = groupBy(
    orders.filter((item) => item.orderSortNum === 7),
    (item) => item.order.id.toString(),
  );

  const sorted7 = Array.from(sorted7Map.values())
    .sort((a, b) => compareTempOrderItems(a[0], b[0]))
    .flat();

  return [...sortedMinus4To0, ...sorted1To5, ...sorted6, ...sorted7];
};
