/**
 * Heavy Haul 3D - Types & Interfaces
 */

export type Gear = 'D' | 'N' | 'R' | 'L';
export type LightMode = 'off' | 'low' | 'high';
export type BlinkerMode = 'off' | 'left' | 'right' | 'hazard';
export type CameraMode = 'first_person' | 'second_person' | 'third_person' | 'orbit';
export type TrafficLevel = 'off' | 'low' | 'medium' | 'high';
export type GameMode = 'career' | 'sandbox';
export type TrailerType = 'none' | 'flatbed' | 'box' | 'tanker' | 'lowboy';

export interface DayNightInfo {
  timeHours: number;
  timeString: string;
  periodName: 'Amanecer' | 'Mediodía' | 'Atardecer' | 'Noche' | 'Medianoche';
  isNight: boolean;
}

export interface TruckStats {
  topSpeedKmh: number;         // Top speed in km/h
  accel0to100Sec: number;       // 0-100 km/h acceleration time in seconds
  torqueNm: number;             // Engine torque / hauling power
  brakingPower: number;         // 1 - 10 rating
  suspensionStiffness: number;  // 1 - 10 rating
  curbWeightTons: number;       // Base truck weight
  wheelBase: number;            // Distance between axles
  trackWidth: number;           // Lateral wheel width
  centerOfMassHeight: number;   // Cab center of mass height
}

export interface TruckUpgradeLevels {
  engine: number;       // 0 to 4 (+top speed, -0-100s)
  brakes: number;       // 0 to 4 (+braking force)
  suspension: number;   // 0 to 4 (+roll stability, reduces rollover risk)
  tires: number;        // 0 to 4 (+lateral curve grip)
  paintColor: string;   // Hex color
}

export interface TruckModel {
  id: string;
  name: string;
  brand: string;
  badge: string;
  tagline: string;
  category: 'Ligero 4x2' | 'Medio 6x2' | 'Pesado 6x4' | 'Ruta Pesada 6x4';
  description: string;
  price: number;
  baseStats: TruckStats;
  allowedTrailers: TrailerType[];
  unlockedByDefault: boolean;
  defaultColor: string;
  cabType: 'cabover' | 'conventional';
}

export interface TrailerModel {
  id: TrailerType;
  name: string;
  type: TrailerType;
  description: string;
  emptyWeightTons: number;
  maxCargoWeightTons: number;
  compatibilityNote: string;
  allowedTruckCategories: string[];
  dimensions: { length: number; width: number; height: number };
}

export interface CargoItem {
  id: string;
  name: string;
  category: string;
  trailerNeeded: TrailerType;
  weightTons: number;
  hazardOrFragile: boolean;
  description: string;
}

export interface MissionContract {
  id: string;
  title: string;
  cargoName: string;
  cargoCategory: string;
  trailerType: TrailerType;
  cargoWeightTons: number;
  pickupLocation: { id: string; name: string; x: number; z: number };
  dropoffLocation: { id: string; name: string; x: number; z: number };
  distanceKm: number;
  rewardCash: number;
  rewardXP: number;
  timeLimitSec: number;
  difficulty: 'Fácil' | 'Media' | 'Difícil' | 'Extrema';
  isFragile?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  rewardCash: number;
}

export interface DrivingControls {
  throttle: number;      // 0 to 1
  brake: number;         // 0 to 1
  steer: number;         // -1 (left) to 1 (right)
  handbrake: boolean;
  gear: Gear;
  lights: LightMode;
  blinkers: BlinkerMode;
  horn: boolean;
  engineStarted: boolean;
}

export interface TruckPhysicsState {
  x: number;
  y: number;
  z: number;
  yaw: number;           // Truck heading angle (radians)
  pitch: number;         // Front/rear cab tilt
  roll: number;          // Lateral tilt angle (radians)
  speedKmh: number;
  rpm: number;
  currentGearRatioIndex: number;
  lateralG: number;      // Cornering G-force
  isRolledOver: boolean;
  trailerCoupled: boolean;
  trailerYaw: number;
  trailerPitch: number;
  trailerRoll: number;
  trailerX: number;
  trailerY: number;
  trailerZ: number;
  suspensionOffsetLF: number;
  suspensionOffsetRF: number;
  suspensionOffsetLR: number;
  suspensionOffsetRR: number;
  damage: number;        // 0 to 100%
  fuel: number;          // 0 to 100%
  turboActive?: boolean;
  isOnRoad?: boolean;
}

export interface PlayerSaveData {
  version: number;
  money: number;
  xp: number;
  level: number;
  currentTruckId: string;
  ownedTruckIds: string[];
  truckUpgrades: Record<string, TruckUpgradeLevels>;
  activeTrailer: TrailerType;
  cargoLoadPercent: number; // 0 to 100%
  completedDeliveries: number;
  rolloversExperienced: number;
  totalDistanceDrivenKm: number;
  achievements: Record<string, boolean>;
  settings: {
    trafficLevel: TrafficLevel;
    soundVolume: number;
    radioVolume: number;
    musicTrack: number;
    controlScheme: 'arrows' | 'wasd';
  };
}
