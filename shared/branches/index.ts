export * from "./types";

export { kirenskogoBranch } from "./kirenskogo";
export { muzhestvaBranch } from "./muzhestva";
export { molokovaBranch } from "./molokova";
export { lomakoBranch } from "./lomako";
export { aerovokzalnayaBranch } from "./aerovokzalnaya";

import { kirenskogoBranch } from "./kirenskogo";
import { muzhestvaBranch } from "./muzhestva";
import { molokovaBranch } from "./molokova";
import { lomakoBranch } from "./lomako";
import { aerovokzalnayaBranch } from "./aerovokzalnaya";
import { BranchConfig, Zone, Tariff } from "./types";

export const ALL_BRANCHES: BranchConfig[] = [
  muzhestvaBranch,
  kirenskogoBranch,
  molokovaBranch,
  lomakoBranch,
  aerovokzalnayaBranch,
];

export function getBranchById(id: string): BranchConfig | undefined {
  return ALL_BRANCHES.find((b) => b.id === id);
}

export function getZoneById(branchId: string, zoneId: string): Zone | undefined {
  const branch = getBranchById(branchId);
  return branch?.zones.find((z) => z.id === zoneId);
}

export function getTariffsByBranchAndZone(branchId: string, zoneId: string): Tariff[] {
  const zone = getZoneById(branchId, zoneId);
  return zone?.tariffs || [];
}

export function getActiveBranches(): BranchConfig[] {
  return ALL_BRANCHES.filter((b) => b.isActive);
}

export function getAvailableZones(branchId: string): Zone[] {
  const branch = getBranchById(branchId);
  return branch?.zones || [];
}

export type { BranchConfig, Zone, Tariff, Peripheral, Component } from "./types";
