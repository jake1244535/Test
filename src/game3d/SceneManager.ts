import * as THREE from 'three';
import { TruckModel, TrailerModel, DrivingControls, TruckPhysicsState, TruckUpgradeLevels, CameraMode } from '../types/game';
import { VehicleBuilder, BuiltTruck, BuiltTrailer } from './vehicleBuilder';
import { TrafficSystem } from './trafficSystem';
import { build3DWorld, WorldData } from './worldData';
import { DayNightCycleManager, DayNightState } from './dayNightManager';
import { WorldTerrainSystem } from './terrainSystem';
import { audioEngine } from '../audio/audioEngine';
import { ProceduralTextures } from './proceduralTextures';

export type WeatherMode = 'clear' | 'rain' | 'fog' | 'storm';

export class SceneManager {
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private vehicleBuilder: VehicleBuilder;
  private builtTruck: BuiltTruck | null = null;
  private builtTrailer: BuiltTrailer | null = null;
  private trafficSystem: TrafficSystem;
  private worldData: WorldData;
  private dayNightManager: DayNightCycleManager;
  private currentDayNightState: DayNightState | null = null;

  // Weather System
  private weatherMode: WeatherMode = 'clear';
  private rainParticles: THREE.Points | null = null;
  private rainPositions: Float32Array | null = null;
  private rainVelocities: Float32Array | null = null;
  private thunderTimer: number = 0;

  // Particle systems
  private exhaustParticles: THREE.Points | null = null;
  private exhaustData: { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; maxLife: number }[] = [];

  private dustParticles: THREE.Points | null = null;
  private dustData: { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; maxLife: number }[] = [];

  // Camera settings
  private cameraMode: CameraMode = 'third_person';
  private orbitAngles = { theta: 0, phi: 0.35, radius: 14 };
  private isPointerDown = false;
  private lastPointerPos = { x: 0, y: 0 };

  // Objective Waypoint marker in 3D
  private waypointMarker: THREE.Group;
  private currentWaypointPos: THREE.Vector3 | null = null;

  // Blinker timer
  private blinkerTimer = 0;
  private blinkerState = false;

  private animationFrameId: number | null = null;
  private onFrameCallback: ((dt: number) => void) | null = null;
  private clock = new THREE.Clock();

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.0016);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 1500);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // Initialize dynamic 24h Day/Night Cycle
    this.dayNightManager = new DayNightCycleManager(this.scene, this.renderer);

    // Build static 3D world
    this.worldData = build3DWorld();
    this.scene.add(this.worldData.terrainMesh);
    this.scene.add(this.worldData.roadMesh);
    this.scene.add(this.worldData.decorationsGroup);

    // Register highway streetlamps
    for (let i = 0; i < this.worldData.streetLampMaterials.length; i++) {
      this.dayNightManager.registerStreetLamp(
        this.worldData.streetLampMaterials[i],
        this.worldData.streetLampLights[i]
      );
    }

    // Build Traffic system
    this.trafficSystem = new TrafficSystem(this.worldData.trafficWaypoints, 'medium');
    this.scene.add(this.trafficSystem.getGroup());

    // Objective Waypoint Pillar / Beacon
    this.waypointMarker = this.createWaypointMarker();
    this.scene.add(this.waypointMarker);

    this.vehicleBuilder = new VehicleBuilder();

    // Initialize Rain & Particle Systems
    this.initWeatherParticles();
    this.initExhaustParticles();
    this.initDustParticles();

    // Event listeners
    this.setupPointerEvents();
    window.addEventListener('resize', this.handleResize);

    // Start loop
    this.renderLoop();
  }

  private initWeatherParticles() {
    const rainCount = 1800;
    const rainGeo = new THREE.BufferGeometry();
    this.rainPositions = new Float32Array(rainCount * 3);
    this.rainVelocities = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 120;
      this.rainPositions[i * 3 + 1] = Math.random() * 45;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;

      this.rainVelocities[i * 3] = (Math.random() - 0.5) * 4;
      this.rainVelocities[i * 3 + 1] = -42 - Math.random() * 18;
      this.rainVelocities[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0xbae6fd,
      size: 1.4,
      transparent: true,
      opacity: 0.7,
    });

    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  private initExhaustParticles() {
    const count = 40;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const opacities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.exhaustData.push({
        x: 0, y: -999, z: 0,
        vx: 0, vy: 0, vz: 0,
        life: 0, maxLife: 1.2,
      });
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -999;
      positions[i * 3 + 2] = 0;
      opacities[i] = 0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x3f3f46,
      size: 2.2,
      transparent: true,
      opacity: 0.6,
      map: ProceduralTextures.getSmokeParticleTexture(),
      depthWrite: false,
    });

    this.exhaustParticles = new THREE.Points(geo, mat);
    this.scene.add(this.exhaustParticles);
  }

  private initDustParticles() {
    const count = 35;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.dustData.push({
        x: 0, y: -999, z: 0,
        vx: 0, vy: 0, vz: 0,
        life: 0, maxLife: 0.8,
      });
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -999;
      positions[i * 3 + 2] = 0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xa16207,
      size: 1.8,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    this.dustParticles = new THREE.Points(geo, mat);
    this.scene.add(this.dustParticles);
  }

  public setWeather(mode: WeatherMode) {
    this.weatherMode = mode;
    const isRaining = mode === 'rain' || mode === 'storm';

    if (this.rainParticles) {
      this.rainParticles.visible = isRaining;
    }

    // Wet road specular reflection
    const roadMat = this.worldData.roadMesh.material as THREE.MeshStandardMaterial;
    if (isRaining) {
      roadMat.roughness = 0.25; // slick wet asphalt
      roadMat.metalness = 0.35;
    } else {
      roadMat.roughness = 0.8;
      roadMat.metalness = 0.12;
    }

    // Fog adjustments
    if (mode === 'fog') {
      this.scene.fog = new THREE.FogExp2(0xcbd5e1, 0.0075);
    } else if (mode === 'rain' || mode === 'storm') {
      this.scene.fog = new THREE.FogExp2(0x64748b, 0.004);
    } else {
      this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.0016);
    }
  }

  public getWeather(): WeatherMode {
    return this.weatherMode;
  }

  public getFuelStationZone(): THREE.Box3 {
    return this.worldData.fuelStationZone;
  }

  private createWaypointMarker(): THREE.Group {
    const group = new THREE.Group();
    // Glowing beacon ring
    const ringGeo = new THREE.RingGeometry(4.0, 4.8, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.4;
    group.add(ring);

    // Vertical translucent light cylinder
    const cylGeo = new THREE.CylinderGeometry(4.0, 4.0, 30, 32, 1, true);
    const cylMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const cyl = new THREE.Mesh(cylGeo, cylMat);
    cyl.position.y = 15.0;
    group.add(cyl);

    group.visible = false;
    return group;
  }

  public setObjectiveWaypoint(pos: { x: number; z: number } | null) {
    if (!pos) {
      this.waypointMarker.visible = false;
      this.currentWaypointPos = null;
      return;
    }
    const groundY = WorldTerrainSystem.getGroundElevation(pos.x, pos.z);
    this.waypointMarker.position.set(pos.x, groundY, pos.z);
    this.waypointMarker.visible = true;
    this.currentWaypointPos = new THREE.Vector3(pos.x, groundY, pos.z);
  }

  public setTrafficLevel(level: 'off' | 'low' | 'medium' | 'high') {
    this.trafficSystem.setLevel(level);
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
  }

  public getCameraMode(): CameraMode {
    return this.cameraMode;
  }

  public spawnTruck(model: TruckModel, trailer: TrailerModel, upgrades: TruckUpgradeLevels, cargoFill: number) {
    if (this.builtTruck) {
      this.scene.remove(this.builtTruck.rootGroup);
    }
    if (this.builtTrailer) {
      this.scene.remove(this.builtTrailer.rootGroup);
    }

    this.builtTruck = this.vehicleBuilder.buildTruck(model, upgrades.paintColor);
    this.scene.add(this.builtTruck.rootGroup);

    if (trailer.type !== 'none') {
      this.builtTrailer = this.vehicleBuilder.buildTrailer(trailer.type, cargoFill);
      this.scene.add(this.builtTrailer.rootGroup);
    } else {
      this.builtTrailer = null;
    }
  }

  public updateVehicleVisuals(
    physics: TruckPhysicsState,
    controls: DrivingControls,
    model: TruckModel,
    upgrades: TruckUpgradeLevels,
    dt: number
  ) {
    if (!this.builtTruck) return;

    // 1. Truck Root Position & Heading
    this.builtTruck.rootGroup.position.set(physics.x, physics.y, physics.z);
    this.builtTruck.rootGroup.rotation.y = physics.yaw;

    // 2. Chassis Dynamic Spring Motion (Roll, Pitch, Suspension offsets)
    this.builtTruck.chassisGroup.rotation.z = -physics.roll;
    this.builtTruck.chassisGroup.rotation.x = -physics.pitch;

    // 3. Front Steering Angle & Wheel Spin
    const maxSteerVisual = 0.52;
    const visualSteerAngle = controls.steer * maxSteerVisual;
    this.builtTruck.frontLeftWheel.rotation.y = visualSteerAngle;
    this.builtTruck.frontRightWheel.rotation.y = visualSteerAngle;

    const wheelCircumference = 2 * Math.PI * 0.5;
    const distanceMoved = (physics.speedKmh / 3.6) * dt;
    const wheelSpin = distanceMoved / wheelCircumference;

    this.builtTruck.frontLeftWheel.children.forEach((c) => c.rotateX(wheelSpin));
    this.builtTruck.frontRightWheel.children.forEach((c) => c.rotateX(wheelSpin));
    this.builtTruck.rearWheels.forEach((rw) => rw.children.forEach((c) => c.rotateX(wheelSpin)));

    // Interior Steering Wheel Rotation
    if (this.builtTruck.steeringWheel) {
      this.builtTruck.steeringWheel.rotation.z = -controls.steer * Math.PI * 1.4;
    }

    // Paint color sync
    if (this.builtTruck.cabinMaterial.color.getHexString() !== upgrades.paintColor.replace('#', '').toLowerCase()) {
      this.builtTruck.cabinMaterial.color.set(upgrades.paintColor);
    }

    // 4. Update Trailer Articulation
    if (this.builtTrailer && physics.trailerCoupled) {
      this.builtTrailer.rootGroup.visible = true;
      this.builtTrailer.rootGroup.position.set(physics.trailerX, physics.trailerY, physics.trailerZ);
      this.builtTrailer.rootGroup.rotation.y = physics.trailerYaw;

      this.builtTrailer.chassisGroup.rotation.z = -physics.trailerRoll;
      this.builtTrailer.chassisGroup.rotation.x = -physics.trailerPitch;

      this.builtTrailer.wheels.forEach((w) => w.children.forEach((c) => c.rotateX(wheelSpin)));
    } else if (this.builtTrailer) {
      this.builtTrailer.rootGroup.visible = false;
    }

    // 5. Lighting & Turn Signal Relay
    this.updateLightsAndBlinkers(controls, dt);

    // 6. Camera Tracking
    this.updateCamera(physics, model);

    // 7. Update Day/Night Dynamic Atmosphere & Sky
    const dnState = this.dayNightManager.update(dt, this.builtTruck.rootGroup.position);
    this.currentDayNightState = dnState;

    // 8. Update AI Traffic with night light awareness & horn reaction
    this.trafficSystem.update(dt, this.builtTruck.rootGroup.position, dnState.isNight, controls.horn);

    // 9. Update Weather & Rain particles
    this.updateWeatherFX(dt, physics);

    // 10. Update Exhaust Smoke & Offroad Dust
    this.updateExhaustSmoke(dt, physics, controls);
    this.updateOffroadDust(dt, physics);

    // 11. Animate Waypoint ring rotation
    if (this.waypointMarker.visible) {
      this.waypointMarker.rotation.y += dt * 0.8;
    }
  }

  private updateWeatherFX(dt: number, physics: TruckPhysicsState) {
    if (!this.rainParticles || !this.rainPositions || !this.rainVelocities || !this.rainParticles.visible) return;

    const truckPos = this.builtTruck ? this.builtTruck.rootGroup.position : new THREE.Vector3();
    const count = this.rainPositions.length / 3;

    for (let i = 0; i < count; i++) {
      this.rainPositions[i * 3] += this.rainVelocities[i * 3] * dt;
      this.rainPositions[i * 3 + 1] += this.rainVelocities[i * 3 + 1] * dt;
      this.rainPositions[i * 3 + 2] += this.rainVelocities[i * 3 + 2] * dt;

      // Wrap around truck position in 100m box
      if (this.rainPositions[i * 3 + 1] < truckPos.y - 1.0) {
        this.rainPositions[i * 3] = truckPos.x + (Math.random() - 0.5) * 110;
        this.rainPositions[i * 3 + 1] = truckPos.y + 40 + Math.random() * 10;
        this.rainPositions[i * 3 + 2] = truckPos.z + (Math.random() - 0.5) * 110;
      }
    }
    this.rainParticles.geometry.attributes.position.needsUpdate = true;

    // Storm lightning
    if (this.weatherMode === 'storm') {
      this.thunderTimer -= dt;
      if (this.thunderTimer <= 0) {
        this.thunderTimer = 8 + Math.random() * 12;
        // Thunder sound
        audioEngine.playThunder();
      }
    }
  }

  private updateExhaustSmoke(dt: number, physics: TruckPhysicsState, controls: DrivingControls) {
    if (!this.exhaustParticles || !this.builtTruck) return;

    const positions = this.exhaustParticles.geometry.attributes.position.array as Float32Array;
    const forward = new THREE.Vector3(Math.sin(physics.yaw), 0, Math.cos(physics.yaw));
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();

    // Emit exhaust puffs when throttle is applied
    if (controls.engineStarted && controls.throttle > 0.1) {
      for (let i = 0; i < this.exhaustData.length; i++) {
        const p = this.exhaustData[i];
        if (p.life <= 0 && Math.random() > 0.7) {
          p.life = p.maxLife;
          // Spawn near exhaust stack (behind cab, elevated)
          const spawnPos = new THREE.Vector3(physics.x, physics.y + 3.2, physics.z)
            .addScaledVector(forward, -1.8)
            .addScaledVector(right, 0.9);
          p.x = spawnPos.x;
          p.y = spawnPos.y;
          p.z = spawnPos.z;
          p.vx = -forward.x * (physics.speedKmh / 3.6) * 0.4 + (Math.random() - 0.5) * 1.5;
          p.vy = 2.5 + Math.random() * 2.0;
          p.vz = -forward.z * (physics.speedKmh / 3.6) * 0.4 + (Math.random() - 0.5) * 1.5;
          break;
        }
      }
    }

    for (let i = 0; i < this.exhaustData.length; i++) {
      const p = this.exhaustData[i];
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
      } else {
        positions[i * 3 + 1] = -999;
      }
    }
    this.exhaustParticles.geometry.attributes.position.needsUpdate = true;
  }

  private updateOffroadDust(dt: number, physics: TruckPhysicsState) {
    if (!this.dustParticles || !this.builtTruck) return;

    const positions = this.dustParticles.geometry.attributes.position.array as Float32Array;

    if (!physics.isOnRoad && Math.abs(physics.speedKmh) > 12) {
      for (let i = 0; i < this.dustData.length; i++) {
        const p = this.dustData[i];
        if (p.life <= 0 && Math.random() > 0.6) {
          p.life = p.maxLife;
          p.x = physics.x + (Math.random() - 0.5) * 2.0;
          p.y = physics.y + 0.3;
          p.z = physics.z + (Math.random() - 0.5) * 2.0;
          p.vx = (Math.random() - 0.5) * 2.5;
          p.vy = 1.2 + Math.random() * 1.5;
          p.vz = (Math.random() - 0.5) * 2.5;
          break;
        }
      }
    }

    for (let i = 0; i < this.dustData.length; i++) {
      const p = this.dustData[i];
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
      } else {
        positions[i * 3 + 1] = -999;
      }
    }
    this.dustParticles.geometry.attributes.position.needsUpdate = true;
  }

  public getDayNightState(): DayNightState | null {
    return this.currentDayNightState;
  }

  public setTimeOfDay(hours: number) {
    this.dayNightManager.setTime(hours);
  }

  public addTimeOfDay(deltaHours: number) {
    this.dayNightManager.addHours(deltaHours);
  }

  private updateLightsAndBlinkers(controls: DrivingControls, dt: number) {
    if (!this.builtTruck) return;

    // Headlights
    const hl = this.builtTruck.headlights;
    const isHeadlightsOn = controls.lights !== 'off';
    const isHighBeam = controls.lights === 'high';

    hl.leftSpot.intensity = isHeadlightsOn ? (isHighBeam ? 4.6 : 2.6) : 0;
    hl.rightSpot.intensity = isHeadlightsOn ? (isHighBeam ? 4.6 : 2.6) : 0;
    hl.leftSpot.distance = isHighBeam ? 130 : 70;
    hl.rightSpot.distance = isHighBeam ? 130 : 70;

    // Tail / Brake Lights
    const isBraking = controls.brake > 0.05 || controls.handbrake;
    const tailEmissive = isBraking ? 0xef4444 : (isHeadlightsOn ? 0x991b1b : 0x220505);

    this.builtTruck.tailLights.forEach((tl) => {
      (tl.material as THREE.MeshStandardMaterial).emissive.setHex(tailEmissive);
    });
    if (this.builtTrailer) {
      this.builtTrailer.tailLights.forEach((tl) => {
        (tl.material as THREE.MeshStandardMaterial).emissive.setHex(tailEmissive);
      });
    }

    // Turn Signal Blinker Flashing
    this.blinkerTimer += dt;
    if (this.blinkerTimer > 0.35) {
      this.blinkerTimer = 0;
      this.blinkerState = !this.blinkerState;
      if (controls.blinkers !== 'off') {
        audioEngine.playBlinkerClick(this.blinkerState);
      }
    }

    const flashLeft = this.blinkerState && (controls.blinkers === 'left' || controls.blinkers === 'hazard');
    const flashRight = this.blinkerState && (controls.blinkers === 'right' || controls.blinkers === 'hazard');

    const blinkColorOn = 0xf59e0b;
    const blinkColorOff = 0x3d2005;

    this.builtTruck.leftBlinkers.forEach((bl) => {
      (bl.material as THREE.MeshStandardMaterial).emissive.setHex(flashLeft ? blinkColorOn : blinkColorOff);
    });
    this.builtTruck.rightBlinkers.forEach((br) => {
      (br.material as THREE.MeshStandardMaterial).emissive.setHex(flashRight ? blinkColorOn : blinkColorOff);
    });

    if (this.builtTrailer) {
      this.builtTrailer.leftBlinkers.forEach((bl) => {
        (bl.material as THREE.MeshStandardMaterial).emissive.setHex(flashLeft ? blinkColorOn : blinkColorOff);
      });
      this.builtTrailer.rightBlinkers.forEach((br) => {
        (br.material as THREE.MeshStandardMaterial).emissive.setHex(flashRight ? blinkColorOn : blinkColorOff);
      });
    }
  }

  private updateCamera(physics: TruckPhysicsState, model: TruckModel) {
    const heading = physics.yaw;
    const truckPos = new THREE.Vector3(physics.x, physics.y, physics.z);
    const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const up = new THREE.Vector3(0, 1, 0);

    if (this.cameraMode === 'first_person') {
      let eyeOffset = new THREE.Vector3(-0.48, 1.85, 1.4);
      if (model.id === 'kenworth_rig') eyeOffset = new THREE.Vector3(-0.55, 2.2, 0.4);
      if (model.id === 'isuzu_giga') eyeOffset = new THREE.Vector3(-0.55, 2.25, 1.55);

      const rotatedOffset = eyeOffset.clone().applyAxisAngle(up, heading);
      const camPos = truckPos.clone().add(rotatedOffset);
      camPos.y += physics.pitch * 0.4;

      this.camera.position.copy(camPos);
      const lookAtTarget = camPos.clone().add(forward.clone().multiplyScalar(40));
      lookAtTarget.y += physics.pitch * 5;
      this.camera.lookAt(lookAtTarget);

    } else if (this.cameraMode === 'second_person') {
      const bumperDist = model.cabType === 'conventional' ? 3.8 : 2.6;
      const camPos = truckPos.clone().add(forward.clone().multiplyScalar(bumperDist));
      camPos.y += 0.85;

      this.camera.position.copy(camPos);
      const lookAtTarget = camPos.clone().add(forward.clone().multiplyScalar(50));
      this.camera.lookAt(lookAtTarget);

    } else if (this.cameraMode === 'third_person') {
      const trailDist = physics.trailerCoupled ? 16.5 : 11.5;
      const height = 4.2;

      const camTarget = truckPos.clone().add(new THREE.Vector3(0, 1.8, 0));
      const behindVector = forward.clone().multiplyScalar(-trailDist);
      const idealCamPos = truckPos.clone().add(behindVector).add(new THREE.Vector3(0, height, 0));

      this.camera.position.lerp(idealCamPos, 0.15);
      this.camera.lookAt(camTarget);

    } else {
      const theta = this.orbitAngles.theta + heading;
      const phi = this.orbitAngles.phi;
      const r = this.orbitAngles.radius;

      const cx = physics.x + r * Math.sin(theta) * Math.cos(phi);
      const cy = physics.y + r * Math.sin(phi) + 2.0;
      const cz = physics.z + r * Math.cos(theta) * Math.cos(phi);

      this.camera.position.set(cx, Math.max(physics.y + 1, cy), cz);
      this.camera.lookAt(physics.x, physics.y + 1.8, physics.z);
    }
  }

  private setupPointerEvents() {
    const el = this.renderer.domElement;

    el.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true;
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown) return;
      const dx = e.clientX - this.lastPointerPos.x;
      const dy = e.clientY - this.lastPointerPos.y;
      this.lastPointerPos = { x: e.clientX, y: e.clientY };

      if (this.cameraMode === 'orbit') {
        this.orbitAngles.theta -= dx * 0.007;
        this.orbitAngles.phi = Math.max(0.1, Math.min(1.4, this.orbitAngles.phi + dy * 0.007));
      }
    });

    window.addEventListener('pointerup', () => {
      this.isPointerDown = false;
    });

    el.addEventListener('wheel', (e) => {
      if (this.cameraMode === 'orbit') {
        this.orbitAngles.radius = Math.max(6, Math.min(32, this.orbitAngles.radius + e.deltaY * 0.015));
      }
    });
  }

  private handleResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public setOnFrameCallback(cb: (dt: number) => void) {
    this.onFrameCallback = cb;
  }

  private renderLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.onFrameCallback) {
      this.onFrameCallback(dt);
    }

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
