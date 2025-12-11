import { z } from "zod";

export * from "./branches";
export {
  ALL_BRANCHES,
  getBranchById,
  getZoneById,
  getTariffsByBranchAndZone,
  getActiveBranches,
  getAvailableZones,
  type BranchConfig,
  type Zone,
  type Tariff,
  type Peripheral,
  type Component,
} from "./branches";

export const branchSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  colorClass: z.string(),
});

export type Branch = z.infer<typeof branchSchema>;

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
  
  if (startDate.getDay() === endDate.getDay() && startDate.getDate() === endDate.getDate()) {
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

import type { Tariff } from "./branches";

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
  startDate: Date,
  tariffs: Tariff[]
): TariffCombination | null {
  if (requestedMinutes <= 0) return null;

  const availableTariffs = tariffs.filter(t => 
    !t.displayOnly && isTariffAvailable(t, currentHour)
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
