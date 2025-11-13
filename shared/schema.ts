import { z } from "zod";

export const tariffSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameRu: z.string(),
  duration: z.number(),
  description: z.string().optional(),
  priceWeekday: z.number(),
  priceWeekend: z.number(),
  availableFrom: z.number().optional(),
  availableTo: z.number().optional(),
  perMinute: z.boolean().default(false),
});

export type Tariff = z.infer<typeof tariffSchema>;

export const NORMAL_ZONE_TARIFFS: Tariff[] = [
  {
    id: "cyber-hour",
    name: "Cyber Hour",
    nameRu: "Кибер час",
    duration: 60,
    description: "Поминутная оплата",
    priceWeekday: 139,
    priceWeekend: 159,
    perMinute: true,
  },
  {
    id: "triple-kill",
    name: "Triple Kill",
    nameRu: "Трипл килл",
    duration: 180,
    priceWeekday: 349,
    priceWeekend: 399,
    perMinute: false,
  },
  {
    id: "ultra-kill",
    name: "Ultra Kill",
    nameRu: "Ультра килл",
    duration: 300,
    priceWeekday: 559,
    priceWeekend: 639,
    perMinute: false,
  },
  {
    id: "cyber-night",
    name: "Cyber Night",
    nameRu: "Кибер ночь",
    duration: 600,
    description: "с 22:00 до 8:00",
    priceWeekday: 699,
    priceWeekend: 799,
    availableFrom: 22,
    availableTo: 3,
    perMinute: false,
  },
];

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 5 || day === 6 || day === 0;
}

export function calculateMinutesInWeekdayAndWeekend(
  startDate: Date,
  durationMinutes: number
): { weekdayMinutes: number; weekendMinutes: number } {
  if (durationMinutes <= 0) {
    return { weekdayMinutes: 0, weekendMinutes: 0 };
  }

  let weekdayMinutes = 0;
  let weekendMinutes = 0;
  
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  let currentDate = new Date(startDate.getTime());
  
  while (currentDate < endDate) {
    const nextMinute = new Date(currentDate.getTime() + 60000);
    const minuteToAdd = nextMinute <= endDate ? 1 : (endDate.getTime() - currentDate.getTime()) / 60000;
    
    if (isWeekend(currentDate)) {
      weekendMinutes += minuteToAdd;
    } else {
      weekdayMinutes += minuteToAdd;
    }
    
    currentDate = nextMinute;
  }
  
  return { weekdayMinutes, weekendMinutes };
}

export function spansBothWeekdayAndWeekend(
  startDate: Date,
  durationMinutes: number
): { spansWeekdayAndWeekend: boolean; currentIsWeekend: boolean } {
  const currentIsWeekend = isWeekend(startDate);
  
  if (durationMinutes <= 0) {
    return { spansWeekdayAndWeekend: false, currentIsWeekend };
  }

  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  const startDay = startDate.getDay();
  const endDay = endDate.getDay();
  
  const hasWeekend = isWeekend(startDate) || isWeekend(endDate);
  const hasWeekday = !isWeekend(startDate) || !isWeekend(endDate);
  
  if (startDay === endDay && startDate.getDate() === endDate.getDate()) {
    return { spansWeekdayAndWeekend: false, currentIsWeekend };
  }
  
  let currentCheckDate = new Date(startDate.getTime());
  let foundWeekend = false;
  let foundWeekday = false;
  
  while (currentCheckDate <= endDate) {
    if (isWeekend(currentCheckDate)) {
      foundWeekend = true;
    } else {
      foundWeekday = true;
    }
    
    if (foundWeekend && foundWeekday) {
      return { spansWeekdayAndWeekend: true, currentIsWeekend };
    }
    
    currentCheckDate = new Date(currentCheckDate.getTime() + 60 * 60000);
  }
  
  return { spansWeekdayAndWeekend: foundWeekend && foundWeekday, currentIsWeekend };
}

export function isTariffAvailable(tariff: Tariff, currentHour: number): boolean {
  if (!tariff.availableFrom && !tariff.availableTo) {
    return true;
  }
  
  if (tariff.availableFrom !== undefined && tariff.availableTo !== undefined) {
    if (tariff.availableFrom > tariff.availableTo) {
      return currentHour >= tariff.availableFrom || currentHour < tariff.availableTo;
    }
    return currentHour >= tariff.availableFrom && currentHour < tariff.availableTo;
  }
  
  return true;
}

export function calculatePrice(
  tariff: Tariff,
  minutes: number,
  isWeekendDay: boolean,
  startDate?: Date
): { price: number; originalPrice: number; rounded: boolean; weekdayMinutes?: number; weekendMinutes?: number } {
  const basePrice = isWeekendDay ? tariff.priceWeekend : tariff.priceWeekday;
  
  if (tariff.perMinute && startDate) {
    const { weekdayMinutes, weekendMinutes } = calculateMinutesInWeekdayAndWeekend(startDate, minutes);
    
    if (weekdayMinutes > 0 && weekendMinutes > 0) {
      const weekdayPricePerMinute = tariff.priceWeekday / 60;
      const weekendPricePerMinute = tariff.priceWeekend / 60;
      const exactPrice = (weekdayPricePerMinute * weekdayMinutes) + (weekendPricePerMinute * weekendMinutes);
      const roundedPrice = Math.ceil(exactPrice);
      return {
        price: roundedPrice,
        originalPrice: exactPrice,
        rounded: exactPrice !== roundedPrice,
        weekdayMinutes,
        weekendMinutes,
      };
    }
  }
  
  if (tariff.perMinute) {
    const pricePerMinute = basePrice / 60;
    const exactPrice = pricePerMinute * minutes;
    const roundedPrice = Math.ceil(exactPrice);
    return {
      price: roundedPrice,
      originalPrice: exactPrice,
      rounded: exactPrice !== roundedPrice,
    };
  }
  
  return {
    price: basePrice,
    originalPrice: basePrice,
    rounded: false,
  };
}

export interface TariffSegment {
  tariff: Tariff;
  quantity: number;
  minutes: number;
  price: number;
  label: string;
}

export interface TariffCombination {
  totalPrice: number;
  totalMinutes: number;
  requestedMinutes: number;
  segments: TariffSegment[];
  wastedMinutes: number;
}

export function findOptimalCombination(
  requestedMinutes: number,
  currentHour: number,
  isWeekendDay: boolean,
  startDate?: Date
): TariffCombination | null {
  if (requestedMinutes <= 0) return null;

  const availableTariffs = NORMAL_ZONE_TARIFFS.filter(t => 
    isTariffAvailable(t, currentHour)
  );

  if (availableTariffs.length === 0) return null;

  const perMinuteTariff = availableTariffs.find(t => t.perMinute);
  const packageTariffs = availableTariffs.filter(t => !t.perMinute);

  let bestCombination: TariffCombination | null = null;
  let bestPrice = Infinity;

  const evaluateCombination = (segments: TariffSegment[]): TariffCombination => {
    const totalPrice = segments.reduce((sum, seg) => sum + seg.price, 0);
    const totalMinutes = segments.reduce((sum, seg) => sum + seg.minutes, 0);
    return {
      totalPrice,
      totalMinutes,
      requestedMinutes,
      segments,
      wastedMinutes: Math.max(0, totalMinutes - requestedMinutes),
    };
  };

  if (perMinuteTariff) {
    const exactResult = calculatePrice(perMinuteTariff, requestedMinutes, isWeekendDay, startDate);
    const hours = Math.floor(requestedMinutes / 60);
    const mins = requestedMinutes % 60;
    const timeLabel = hours > 0 
      ? `${hours}ч ${mins > 0 ? mins + 'мин' : ''}`.trim()
      : `${mins}мин`;
    
    bestCombination = evaluateCombination([{
      tariff: perMinuteTariff,
      quantity: 1,
      minutes: requestedMinutes,
      price: exactResult.price,
      label: timeLabel,
    }]);
    bestPrice = exactResult.price;
  }

  const maxPackages = 5;
  
  function tryPackageCombinations(
    remaining: number,
    currentSegments: TariffSegment[],
    startIdx: number
  ) {
    if (remaining <= 0) {
      const combo = evaluateCombination(currentSegments);
      if (combo.totalPrice < bestPrice) {
        bestPrice = combo.totalPrice;
        bestCombination = combo;
      }
      return;
    }

    for (let i = startIdx; i < packageTariffs.length; i++) {
      const tariff = packageTariffs[i];
      const packagesNeeded = Math.ceil(remaining / tariff.duration);
      
      for (let count = 1; count <= Math.min(packagesNeeded, maxPackages); count++) {
        const result = calculatePrice(tariff, tariff.duration, isWeekendDay);
        const totalMinutes = tariff.duration * count;
        const totalPrice = result.price * count;
        
        const newSegment: TariffSegment = {
          tariff,
          quantity: count,
          minutes: totalMinutes,
          price: totalPrice,
          label: `${Math.floor(tariff.duration / 60)}ч`,
        };

        const newRemaining = remaining - totalMinutes;
        
        if (newRemaining <= 0) {
          const combo = evaluateCombination([...currentSegments, newSegment]);
          if (combo.totalPrice < bestPrice) {
            bestPrice = combo.totalPrice;
            bestCombination = combo;
          }
        } else if (perMinuteTariff && startDate) {
          const consumedMinutes = currentSegments.reduce((sum, seg) => sum + seg.minutes, 0) + totalMinutes;
          const perMinStartDate = new Date(startDate.getTime() + consumedMinutes * 60000);
          const perMinResult = calculatePrice(perMinuteTariff, newRemaining, isWeekendDay, perMinStartDate);
          const hours = Math.floor(newRemaining / 60);
          const mins = newRemaining % 60;
          const timeLabel = hours > 0 
            ? `${hours}ч ${mins > 0 ? mins + 'мин' : ''}`.trim()
            : `${mins}мин`;
          
          const perMinSegment: TariffSegment = {
            tariff: perMinuteTariff,
            quantity: 1,
            minutes: newRemaining,
            price: perMinResult.price,
            label: timeLabel,
          };
          
          const combo = evaluateCombination([...currentSegments, newSegment, perMinSegment]);
          if (combo.totalPrice < bestPrice) {
            bestPrice = combo.totalPrice;
            bestCombination = combo;
          }
        } else if (perMinuteTariff) {
          const perMinResult = calculatePrice(perMinuteTariff, newRemaining, isWeekendDay);
          const hours = Math.floor(newRemaining / 60);
          const mins = newRemaining % 60;
          const timeLabel = hours > 0 
            ? `${hours}ч ${mins > 0 ? mins + 'мин' : ''}`.trim()
            : `${mins}мин`;
          
          const perMinSegment: TariffSegment = {
            tariff: perMinuteTariff,
            quantity: 1,
            minutes: newRemaining,
            price: perMinResult.price,
            label: timeLabel,
          };
          
          const combo = evaluateCombination([...currentSegments, newSegment, perMinSegment]);
          if (combo.totalPrice < bestPrice) {
            bestPrice = combo.totalPrice;
            bestCombination = combo;
          }
        }

        tryPackageCombinations(newRemaining, [...currentSegments, newSegment], i);
      }
    }
  }

  tryPackageCombinations(requestedMinutes, [], 0);

  return bestCombination;
}
