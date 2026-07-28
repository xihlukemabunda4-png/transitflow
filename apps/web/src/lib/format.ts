import type { OccupancyLevel } from '@transitflow/types';

export function formatEta(seconds: number): string {
  if (seconds < 45) return 'Now';
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

const OCCUPANCY_LABEL: Record<OccupancyLevel, string> = {
  EMPTY: 'Plenty of seats',
  AVAILABLE: 'Plenty of seats',
  LIMITED: 'Limited seats',
  STANDING_ONLY: 'Standing room only',
  FULL: 'Full',
};

const OCCUPANCY_CLASS: Record<OccupancyLevel, string> = {
  EMPTY: 'text-tf-success',
  AVAILABLE: 'text-tf-success',
  LIMITED: 'text-tf-warning',
  STANDING_ONLY: 'text-tf-warning',
  FULL: 'text-tf-danger',
};

export function occupancyLabel(level: OccupancyLevel): string {
  return OCCUPANCY_LABEL[level];
}

export function occupancyClass(level: OccupancyLevel): string {
  return OCCUPANCY_CLASS[level];
}

export function formatClock(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
