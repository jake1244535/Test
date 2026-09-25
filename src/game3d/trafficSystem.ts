import * as THREE from 'three';
import { TrafficLevel } from '../types/game';
import { WorldTerrainSystem } from './terrainSystem';

interface TrafficCar {
  mesh: THREE.Group;
  speed: number;
  targetSpeed: number;
  distanceAlongSpline: number;
  laneOffset: number;
  brakeLights: THREE.Mesh[];
  headlights: THREE.Mesh[];
  type: 'sedan' | 'suv' | 'van';
}

export class TrafficSystem {
  private group: THREE.Group = new THREE.Group();
  private cars: TrafficCar[] = [];
  private roadCurve: THREE.CatmullRomCurve3;
  private splineLength: number;
  private trafficLevel: TrafficLevel = 'medium';
  private carColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0x64748b, 0xf3f4f6, 0x1e293b, 0x0284c7];

  constructor(waypoints: THREE.Vector3[], level: TrafficLevel = 'medium') {
    this.trafficLevel = level;
    this.roadCurve = WorldTerrainSystem.getSpline();
    this.splineLength = this.roadCurve.getLength();
    this.rebuildCars();
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public setLevel(level: TrafficLevel) {
    if (this.trafficLevel === level) return;
    this.trafficLevel = level;
    this.rebuildCars();
  }

  private getTargetCarCount(): number {
    switch (this.trafficLevel) {
      case 'off': return 0;
      case 'low': return 5;
      case 'medium': return 10;
      case 'high': return 16;
    }
  }

  private rebuildCars() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.cars = [];

    const targetCount = this.getTargetCarCount();
    if (targetCount === 0) return;

    const types: ('sedan' | 'suv' | 'van')[] = ['sedan', 'suv', 'van'];

    for (let i = 0; i < targetCount; i++) {
      const startDist = (i / targetCount) * this.splineLength + (Math.random() * 25 - 12);
      const isRightLane = i % 2 === 0;
      const type = types[i % types.length];
      const car = this.createCarMesh(isRightLane ? 3.4 : -3.4, type);
      car.distanceAlongSpline = (startDist + this.splineLength) % this.splineLength;
      this.cars.push(car);
      this.group.add(car.mesh);
    }
  }

  private createCarMesh(laneOffset: number, type: 'sedan' | 'suv' | 'van'): TrafficCar {
    const carGroup = new THREE.Group();

    let length = 4.4;
    let width = 1.95;
    let height = 1.45;

    if (type === 'suv') {
      length = 4.8;
      width = 2.05;
      height = 1.75;
    } else if (type === 'van') {
      length = 5.4;
      width = 2.15;
      height = 2.2;
    }

    const randomColor = this.carColors[Math.floor(Math.random() * this.carColors.length)];
    const bodyMat = new THREE.MeshStandardMaterial({
      color: randomColor,
      roughness: 0.32,
      metalness: 0.65,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
    });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 });

    // Lower chassis body
    const chassisGeo = new THREE.BoxGeometry(width, height * 0.45, length);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = height * 0.45;
    chassis.castShadow = true;
    carGroup.add(chassis);

    // Cabin greenhouse / roof
    const cabHeight = height * 0.55;
    const cabGeo = new THREE.BoxGeometry(width * 0.88, cabHeight, length * (type === 'van' ? 0.85 : 0.55));
    const cabin = new THREE.Mesh(cabGeo, glassMat);
    cabin.position.set(0, height * 0.45 + cabHeight * 0.5, type === 'van' ? -length * 0.05 : -length * 0.08);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // 4 Wheels
    const wheelRadius = type === 'suv' ? 0.42 : 0.36;
    const wheelWidth = 0.26;
    const wheelPositions = [
      { x: -width * 0.48, z: length * 0.32 },
      { x: width * 0.48, z: length * 0.32 },
      { x: -width * 0.48, z: -length * 0.32 },
      { x: width * 0.48, z: -length * 0.32 },
    ];

    wheelPositions.forEach((wp) => {
      const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 12);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.position.set(wp.x, wheelRadius, wp.z);
      wheel.castShadow = true;
      carGroup.add(wheel);

      // Rim cap
      const capGeo = new THREE.CylinderGeometry(wheelRadius * 0.5, wheelRadius * 0.5, wheelWidth + 0.02, 8);
      capGeo.rotateZ(Math.PI / 2);
      const cap = new THREE.Mesh(capGeo, chromeMat);
      cap.position.set(wp.x, wheelRadius, wp.z);
      carGroup.add(cap);
    });

    // Headlights
    const headlights: THREE.Mesh[] = [];
    [-width * 0.36, width * 0.36].forEach((hx) => {
      const hlGeo = new THREE.BoxGeometry(0.3, 0.18, 0.1);
      const hlMat = new THREE.MeshStandardMaterial({
        color: 0x3f3f46,
        emissive: 0x000000,
        roughness: 0.2,
      });
      const hl = new THREE.Mesh(hlGeo, hlMat);
      hl.position.set(hx, height * 0.42, length * 0.5 + 0.05);
      carGroup.add(hl);
      headlights.push(hl);
    });

    // Tail / Brake lights
    const brakeLights: THREE.Mesh[] = [];
    [-width * 0.36, width * 0.36].forEach((tx) => {
      const blGeo = new THREE.BoxGeometry(0.3, 0.18, 0.1);
      const blMat = new THREE.MeshStandardMaterial({
        color: 0x991b1b,
        emissive: 0x450a0a,
        roughness: 0.2,
      });
      const bl = new THREE.Mesh(blGeo, blMat);
      bl.position.set(tx, height * 0.42, -length * 0.5 - 0.05);
      carGroup.add(bl);
      brakeLights.push(bl);
    });

    return {
      mesh: carGroup,
      speed: 16 + Math.random() * 8, // ~60-85 km/h cruising speed
      targetSpeed: 18 + Math.random() * 6,
      distanceAlongSpline: 0,
      laneOffset,
      brakeLights,
      headlights,
      type,
    };
  }

  public update(dt: number, playerTruckPos: THREE.Vector3, isNight: boolean = false, isPlayerHonking: boolean = false) {
    if (this.trafficLevel === 'off' || this.cars.length === 0) return;

    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];

      const distToPlayer = car.mesh.position.distanceTo(playerTruckPos);
      let isBraking = false;

      // Yield/slow down if player is nearby or honking
      if (distToPlayer < 24) {
        car.speed = Math.max(0, car.speed - (isPlayerHonking ? 26 : 14) * dt);
        isBraking = true;
      } else {
        car.speed = Math.min(car.targetSpeed, car.speed + 8 * dt);
      }

      // Brake light emissive glow
      car.brakeLights.forEach((bl) => {
        const mat = bl.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(isBraking ? 0xef4444 : (isNight ? 0x991b1b : 0x300a0a));
      });

      // Headlights day/night switch
      const headlightColor = isNight ? 0xfef08a : 0x3f3f46;
      const headlightEmissive = isNight ? 0xfde047 : 0x000000;
      car.headlights.forEach((hl) => {
        const mat = hl.material as THREE.MeshStandardMaterial;
        mat.color.setHex(headlightColor);
        mat.emissive.setHex(headlightEmissive);
        mat.emissiveIntensity = isNight ? 1.8 : 0.0;
      });

      // Move along road spline
      car.distanceAlongSpline = (car.distanceAlongSpline + car.speed * dt) % this.splineLength;
      const u = car.distanceAlongSpline / this.splineLength;

      const pt = this.roadCurve.getPointAt(u);
      const tangent = this.roadCurve.getTangentAt(u).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const lanePos = new THREE.Vector3().copy(pt).addScaledVector(right, car.laneOffset);
      const groundElevation = WorldTerrainSystem.getGroundElevation(lanePos.x, lanePos.z);
      car.mesh.position.set(lanePos.x, groundElevation + 0.12, lanePos.z);

      const lookTarget = new THREE.Vector3().copy(lanePos).add(tangent);
      car.mesh.lookAt(lookTarget);
    }
  }
}
