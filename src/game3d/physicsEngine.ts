import * as THREE from 'three';
import { TruckModel, TrailerModel, DrivingControls, TruckPhysicsState, TruckUpgradeLevels } from '../types/game';
import { WorldTerrainSystem } from './terrainSystem';

export class TruckPhysicsEngine {
  private truckModel: TruckModel;
  private trailerModel: TrailerModel;
  private upgradeLevels: TruckUpgradeLevels;
  private cargoFillPercent: number;

  // Kinematic state
  private pos = new THREE.Vector3(0, 0.5, 0);
  private velocity = new THREE.Vector3();
  private yaw: number = 0;           // Truck rotation around Y
  private roll: number = 0;          // Chassis lateral lean (radians)
  private pitch: number = 0;         // Chassis longitudinal pitch (radians)
  private rollVelocity: number = 0;
  private pitchVelocity: number = 0;

  private speedKmh: number = 0;
  private rpm: number = 750;
  private currentGearRatioIndex: number = 1;
  private lateralG: number = 0;
  private isRolledOver: boolean = false;

  // Turbo Boost feature
  private turboTimer: number = 0;

  // Trailer articulated state
  private trailerPos = new THREE.Vector3(0, 0.5, -5);
  private trailerYaw: number = 0;
  private trailerRoll: number = 0;
  private trailerPitch: number = 0;
  private trailerRollVelocity: number = 0;

  // Suspension springs
  private suspLF: number = 0;
  private suspRF: number = 0;
  private suspLR: number = 0;
  private suspRR: number = 0;

  private damage: number = 0;
  private fuel: number = 100;
  private isOnRoad: boolean = true;

  // Gear transmission ratios (Commercial heavy-duty transmission)
  // Index: 0=N, 1=1st, 2=2nd, 3=3rd, 4=4th, 5=5th, 6=6th
  private readonly gearRatios = [0, 6.8, 4.2, 2.65, 1.72, 1.18, 0.82];
  private readonly lowGearRatio = 14.2; // High-reduction crawler gear
  private readonly reverseGearRatio = -5.8;
  private readonly finalDriveRatio = 3.7;
  private readonly wheelRadius = 0.48; // meters

  constructor(
    truck: TruckModel,
    trailer: TrailerModel,
    upgrades: TruckUpgradeLevels,
    cargoFill: number = 50,
    initialPos = new THREE.Vector3(0, 0.5, 0),
    initialYaw = 0
  ) {
    this.truckModel = truck;
    this.trailerModel = trailer;
    this.upgradeLevels = upgrades;
    this.cargoFillPercent = cargoFill;
    this.pos.copy(initialPos);
    this.yaw = initialYaw;
    this.trailerYaw = initialYaw;
    this.updateTrailerInitialPosition();
  }

  public setTruck(truck: TruckModel, upgrades: TruckUpgradeLevels) {
    this.truckModel = truck;
    this.upgradeLevels = upgrades;
  }

  public setTrailer(trailer: TrailerModel, cargoFill: number) {
    this.trailerModel = trailer;
    this.cargoFillPercent = cargoFill;
    this.updateTrailerInitialPosition();
  }

  public activateTurbo() {
    this.turboTimer = 4.0;
  }

  public refuel(amount: number = 100) {
    this.fuel = Math.min(100, this.fuel + amount);
  }

  public repairTruck(amount: number = 100) {
    this.damage = Math.max(0, this.damage - amount);
  }

  public resetUpright() {
    this.isRolledOver = false;
    this.roll = 0;
    this.pitch = 0;
    this.rollVelocity = 0;
    this.pitchVelocity = 0;
    this.trailerRoll = 0;
    this.trailerRollVelocity = 0;
    this.pos.y = WorldTerrainSystem.getGroundElevation(this.pos.x, this.pos.z) + 0.45;
    this.velocity.set(0, 0, 0);
    this.speedKmh = 0;
    this.updateTrailerInitialPosition();
  }

  private updateTrailerInitialPosition() {
    const hitchDist = 3.5;
    this.trailerPos.x = this.pos.x - Math.sin(this.yaw) * hitchDist;
    this.trailerPos.z = this.pos.z - Math.cos(this.yaw) * hitchDist;
    this.trailerPos.y = WorldTerrainSystem.getGroundElevation(this.trailerPos.x, this.trailerPos.z) + 0.45;
    this.trailerYaw = this.yaw;
  }

  /**
   * Commercial turbodiesel torque curve:
   * Strong low-end torque building up to peak plateau at 1,150 - 1,700 RPM,
   * with smooth governor tapering at redline (2,200 - 2,600 RPM).
   */
  private getDieselTorqueMultiplier(rpm: number): number {
    if (rpm < 700) return 0.55;
    if (rpm < 1150) {
      return 0.55 + 0.45 * ((rpm - 700) / 450);
    }
    if (rpm <= 1700) {
      return 1.0; // 100% peak torque plateau
    }
    if (rpm <= 2200) {
      return 1.0 - 0.22 * ((rpm - 1700) / 500);
    }
    return Math.max(0.35, 0.78 - 0.45 * ((rpm - 2200) / 450));
  }

  public update(dt: number, controls: DrivingControls): TruckPhysicsState {
    const cappedDt = Math.min(dt, 0.05);

    // Update Turbo Boost timer
    const isTurboActive = this.turboTimer > 0;
    if (isTurboActive) {
      this.turboTimer -= cappedDt;
    }

    // Upgrades modifiers
    const engineMod = 1 + this.upgradeLevels.engine * 0.16;
    const brakeMod = 1 + this.upgradeLevels.brakes * 0.18;
    const suspMod = 1 + this.upgradeLevels.suspension * 0.22;
    const tireMod = 1 + this.upgradeLevels.tires * 0.20;

    // Weight and Center of Gravity calculations
    const truckWeightTons = this.truckModel.baseStats.curbWeightTons;
    const trailerWeightTons = this.trailerModel.type !== 'none'
      ? this.trailerModel.emptyWeightTons + (this.cargoFillPercent / 100) * this.trailerModel.maxCargoWeightTons
      : 0;
    const totalMassTons = truckWeightTons + trailerWeightTons;
    const totalMassKg = totalMassTons * 1000;
    const cargoRatio = trailerWeightTons / (truckWeightTons + 1);

    // Center of Gravity Height
    let trailerCoGMultiplier = 1.0;
    if (this.trailerModel.type === 'box') trailerCoGMultiplier = 1.45;
    if (this.trailerModel.type === 'tanker') trailerCoGMultiplier = 1.62;
    if (this.trailerModel.type === 'lowboy') trailerCoGMultiplier = 1.12;

    const effectiveCoG = this.truckModel.baseStats.centerOfMassHeight +
      (cargoRatio * 0.85 * trailerCoGMultiplier);

    // If rolled over, lock chassis and return
    if (this.isRolledOver) {
      this.speedKmh *= 0.92;
      this.rpm = Math.max(650, this.rpm * 0.95);
      return this.getState();
    }

    // 1. STEERING & DIRECTION INVERSION FIX:
    // When controls.steer > 0 (DERECHA), the truck turns strictly to the RIGHT.
    // In our coordinate system where forward is (sin(yaw), 0, cos(yaw)) and the right-hand
    // vector is (-cos(yaw), 0, sin(yaw)), yaw must DECREASE to rotate clockwise / to the right.
    const maxSteerAngle = 0.54; // ~31 degrees
    const speedDamping = 1 / (1 + (Math.abs(this.speedKmh) / 75));
    const currentSteer = controls.steer * maxSteerAngle * speedDamping;
    const wheelBase = this.truckModel.baseStats.wheelBase;

    let angularVel = 0;
    if (Math.abs(currentSteer) > 0.005 && Math.abs(this.speedKmh) > 0.4) {
      const turnRadius = wheelBase / Math.sin(currentSteer);
      const speedMs = this.speedKmh / 3.6;
      // Invert sign so positive steer turns clockwise / strictly to the RIGHT
      angularVel = - (speedMs / turnRadius);
    }

    this.yaw += angularVel * cappedDt;

    // Heading vectors
    const forwardX = Math.sin(this.yaw);
    const forwardZ = Math.cos(this.yaw);

    // Check terrain slope gradient (pitch angle from ground elevation differences)
    const frontGroundY = WorldTerrainSystem.getGroundElevation(this.pos.x + forwardX * 2.5, this.pos.z + forwardZ * 2.5);
    const rearGroundY = WorldTerrainSystem.getGroundElevation(this.pos.x - forwardX * 2.5, this.pos.z - forwardZ * 2.5);
    const terrainSlopeAngle = Math.atan2(frontGroundY - rearGroundY, 5.0);

    // Check if truck wheels are on asphalt vs off-road
    const roadInfo = WorldTerrainSystem.queryRoadInfo(this.pos.x, this.pos.z);
    this.isOnRoad = roadInfo.distance <= WorldTerrainSystem.ROAD_WIDTH * 0.5;

    // 2. TRANSMISSION, POWERTRAIN & REALISTIC TORQUE DYNAMICS
    let effectiveRatio = 0;
    let targetSpeed = 0;

    if (controls.gear === 'D') {
      targetSpeed = this.truckModel.baseStats.topSpeedKmh * (isTurboActive ? 1.25 : 1.0);
      const speedAbs = Math.abs(this.speedKmh);

      // 6-speed automatic progressive commercial shifting
      if (speedAbs < 18) this.currentGearRatioIndex = 1;
      else if (speedAbs < 36) this.currentGearRatioIndex = 2;
      else if (speedAbs < 56) this.currentGearRatioIndex = 3;
      else if (speedAbs < 76) this.currentGearRatioIndex = 4;
      else if (speedAbs < 94) this.currentGearRatioIndex = 5;
      else this.currentGearRatioIndex = 6;

      effectiveRatio = this.gearRatios[this.currentGearRatioIndex];

    } else if (controls.gear === 'L') {
      // Crawler Low Gear with heavy reduction for steep hills
      targetSpeed = 40;
      this.currentGearRatioIndex = 1;
      effectiveRatio = this.lowGearRatio;

    } else if (controls.gear === 'R') {
      targetSpeed = -24;
      this.currentGearRatioIndex = 1;
      effectiveRatio = this.reverseGearRatio;

    } else {
      // Neutral
      this.currentGearRatioIndex = 0;
      effectiveRatio = 0;
    }

    // Engine RPM calculation
    const speedMsAbs = Math.abs(this.speedKmh) / 3.6;
    if (!controls.engineStarted || this.fuel <= 0) {
      this.rpm = 0;
    } else if (controls.gear === 'N' || effectiveRatio === 0) {
      this.rpm = 750 + controls.throttle * 1800;
    } else {
      const wheelRotSpeed = speedMsAbs / this.wheelRadius;
      const engineRotSpeed = wheelRotSpeed * Math.abs(effectiveRatio) * this.finalDriveRatio;
      const calculatedRpm = (engineRotSpeed * 60) / (2 * Math.PI);
      this.rpm = Math.min(2650, Math.max(750, calculatedRpm + controls.throttle * 300));
    }

    // Tractive Drive Force (Newtons)
    let F_tractive = 0;
    if (controls.engineStarted && this.fuel > 0 && controls.throttle > 0.02 && effectiveRatio !== 0) {
      const peakTorque = this.truckModel.baseStats.torqueNm * engineMod * (isTurboActive ? 1.65 : 1.0);
      const torqueMultiplier = this.getDieselTorqueMultiplier(this.rpm);
      const engineTorque = peakTorque * torqueMultiplier * controls.throttle;
      const drivelineEfficiency = 0.88;

      const wheelTorque = engineTorque * effectiveRatio * this.finalDriveRatio * drivelineEfficiency;
      F_tractive = wheelTorque / this.wheelRadius;

      // Fuel burn proportional to load and RPM
      const fuelRate = (0.01 + controls.throttle * 0.035 * (this.rpm / 2200)) * cappedDt;
      this.fuel = Math.max(0, this.fuel - fuelRate);
    }

    // Resistance Forces
    // A. Slope Gravity Resistance: F_slope = m * g * sin(theta)
    const F_slope = totalMassKg * 9.81 * Math.sin(terrainSlopeAngle);

    // B. Aerodynamic Drag: F_aero = 0.5 * rho * Cd * A * v^2
    const F_drag = 2.95 * speedMsAbs * speedMsAbs * Math.sign(this.speedKmh);

    // C. Rolling Resistance: F_roll = Crr * m * g
    const Crr = (this.isOnRoad ? 0.012 : 0.038) * (1 / tireMod);
    const F_roll = Crr * totalMassKg * 9.81 * Math.sign(this.speedKmh || (F_tractive ? Math.sign(F_tractive) : 1));

    // D. Braking Force
    let F_brake = 0;
    if (controls.brake > 0.02) {
      F_brake = controls.brake * totalMassKg * 9.81 * 0.75 * brakeMod;
    }
    if (controls.handbrake) {
      F_brake = Math.max(F_brake, totalMassKg * 9.81 * 0.65);
    }

    // Net Acceleration: a = (F_tractive - F_resistances) / TotalMass
    // Because totalMassKg is in the denominator, heavily loaded trucks accelerate much slower
    let netForce = F_tractive - F_drag - F_slope;

    if (Math.abs(this.speedKmh) > 0.1) {
      netForce -= F_roll;
      netForce -= F_brake * Math.sign(this.speedKmh);
    } else if (F_tractive !== 0) {
      if (Math.abs(F_tractive) > F_brake) {
        netForce -= F_brake * Math.sign(F_tractive);
      } else {
        netForce = 0;
      }
    }

    const accelMs2 = netForce / totalMassKg;
    const accelKmh = accelMs2 * 3.6 * cappedDt;

    // Apply acceleration
    this.speedKmh += accelKmh;

    // Passive stop when speed is near zero with no throttle
    if (controls.throttle < 0.02 && Math.abs(this.speedKmh) < 0.8 && F_brake > 0) {
      this.speedKmh = 0;
    }

    // Speed limits
    if (controls.gear === 'D' || controls.gear === 'L') {
      this.speedKmh = Math.min(targetSpeed, Math.max(-10, this.speedKmh));
    } else if (controls.gear === 'R') {
      this.speedKmh = Math.max(targetSpeed, Math.min(5, this.speedKmh));
    }

    // 3. POSITION UPDATE
    const currentSpeedMs = this.speedKmh / 3.6;
    this.velocity.set(forwardX * currentSpeedMs, 0, forwardZ * currentSpeedMs);
    this.pos.x += this.velocity.x * cappedDt;
    this.pos.z += this.velocity.z * cappedDt;

    // Map limits
    this.pos.x = Math.max(-620, Math.min(620, this.pos.x));
    this.pos.z = Math.max(-620, Math.min(620, this.pos.z));

    // Ground elevation
    const groundY = WorldTerrainSystem.getGroundElevation(this.pos.x, this.pos.z);
    this.pos.y = groundY + 0.45;

    // 4. SUSPENSION DYNAMICS & REALISTIC ROLLOVER PHYSICS
    // Lateral G: a_lat = v * omega / 9.81
    this.lateralG = (currentSpeedMs * angularVel) / 9.81;

    // Suspension spring constants calibrated for realistic cab lean
    const springStiffness = (58.0 * suspMod) / (totalMassTons * 0.14);
    const damping = 13.0 * suspMod;

    // Roll torque: acts outward opposite to the turn radius
    const rollTorque = -this.lateralG * (effectiveCoG / (this.truckModel.baseStats.trackWidth * 0.5));
    const rollAcc = rollTorque * 3.4 - this.roll * springStiffness - this.rollVelocity * damping;

    this.rollVelocity += rollAcc * cappedDt;
    this.roll += this.rollVelocity * cappedDt;

    // Pitch torque: squats under throttle, dives under heavy braking
    const longitudinalG = accelMs2 / 9.81;
    const pitchTorque = -longitudinalG * 0.16 - terrainSlopeAngle * 0.85;
    const pitchAcc = pitchTorque * 2.5 - this.pitch * springStiffness * 1.3 - this.pitchVelocity * damping;

    this.pitchVelocity += pitchAcc * cappedDt;
    this.pitch += this.pitchVelocity * cappedDt;

    // Suspension corner offsets
    this.suspLF = -this.pitch * 0.35 + this.roll * 0.4;
    this.suspRF = -this.pitch * 0.35 - this.roll * 0.4;
    this.suspLR = this.pitch * 0.35 + this.roll * 0.4;
    this.suspRR = this.pitch * 0.35 - this.roll * 0.4;

    // Off-road subtle vibration
    if (!this.isOnRoad && Math.abs(this.speedKmh) > 6) {
      this.pitch += Math.sin(Date.now() * 0.025) * 0.035;
    }

    // ROLLOVER CHECK:
    // Critical rollover threshold based on track width and effective Center of Gravity
    const staticRolloverLimit = (this.truckModel.baseStats.trackWidth * 0.5) / effectiveCoG;
    const criticalRollAngle = staticRolloverLimit * 0.55;

    if (Math.abs(this.roll) > criticalRollAngle && Math.abs(this.lateralG) > 0.42) {
      this.isRolledOver = true;
      this.damage = Math.min(100, this.damage + 35);
      this.roll = Math.sign(this.roll) * (Math.PI / 2);
    }

    // 5. ARTICULATED TRAILER TRACKING PHYSICS
    if (this.trailerModel.type !== 'none') {
      const hitchOffset = 2.4;
      const hitchX = this.pos.x - forwardX * hitchOffset;
      const hitchZ = this.pos.z - forwardZ * hitchOffset;

      const trailerLength = this.trailerModel.dimensions.length * 0.65;
      const dx = hitchX - this.trailerPos.x;
      const dz = hitchZ - this.trailerPos.z;
      const currentTrailerAngle = Math.atan2(dx, dz);

      this.trailerYaw = currentTrailerAngle;
      this.trailerPos.x = hitchX - Math.sin(this.trailerYaw) * trailerLength;
      this.trailerPos.z = hitchZ - Math.cos(this.trailerYaw) * trailerLength;
      this.trailerPos.y = WorldTerrainSystem.getGroundElevation(this.trailerPos.x, this.trailerPos.z) + 0.45;

      // Trailer roll
      const trailerRollTorque = -this.lateralG * (effectiveCoG * 1.35) * (1 / tireMod);
      const tRollAcc = trailerRollTorque * 3.6 - this.trailerRoll * (springStiffness * 0.75) - this.trailerRollVelocity * damping;
      this.trailerRollVelocity += tRollAcc * cappedDt;
      this.trailerRoll += this.trailerRollVelocity * cappedDt;

      if (this.isRolledOver) {
        this.trailerRoll = this.roll * 0.9;
      }
    }

    return this.getState();
  }

  public getState(): TruckPhysicsState {
    return {
      x: this.pos.x,
      y: this.pos.y,
      z: this.pos.z,
      yaw: this.yaw,
      pitch: this.pitch,
      roll: this.roll,
      speedKmh: this.speedKmh,
      rpm: this.rpm,
      currentGearRatioIndex: this.currentGearRatioIndex,
      lateralG: this.lateralG,
      isRolledOver: this.isRolledOver,
      trailerCoupled: this.trailerModel.type !== 'none',
      trailerYaw: this.trailerYaw,
      trailerPitch: this.trailerPitch,
      trailerRoll: this.trailerRoll,
      trailerX: this.trailerPos.x,
      trailerY: this.trailerPos.y,
      trailerZ: this.trailerPos.z,
      suspensionOffsetLF: this.suspLF,
      suspensionOffsetRF: this.suspRF,
      suspensionOffsetLR: this.suspLR,
      suspensionOffsetRR: this.suspRR,
      damage: this.damage,
      fuel: this.fuel,
      turboActive: this.turboTimer > 0,
      isOnRoad: this.isOnRoad,
    };
  }
}
