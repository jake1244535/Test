import * as THREE from 'three';
import { TruckModel, TrailerType } from '../types/game';

export interface BuiltTruck {
  rootGroup: THREE.Group;
  chassisGroup: THREE.Group;     // Subject to roll, pitch, bounce
  cabinGroup: THREE.Group;       // Cabin body
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearWheels: THREE.Group[];
  steeringWheel?: THREE.Mesh;
  headlights: {
    leftSpot: THREE.SpotLight;
    rightSpot: THREE.SpotLight;
    leftLens: THREE.Mesh;
    rightLens: THREE.Mesh;
  };
  tailLights: THREE.Mesh[];
  leftBlinkers: THREE.Mesh[];
  rightBlinkers: THREE.Mesh[];
  cabinMaterial: THREE.MeshStandardMaterial;
  trailerHitchPosition: THREE.Vector3;
}

export interface BuiltTrailer {
  rootGroup: THREE.Group;
  chassisGroup: THREE.Group;
  wheels: THREE.Group[];
  tailLights: THREE.Mesh[];
  leftBlinkers: THREE.Mesh[];
  rightBlinkers: THREE.Mesh[];
  cargoMeshGroup: THREE.Group;
  hitchPivotOffset: number; // Distance from trailer front to kingpin
}

export class VehicleBuilder {
  // Reusable materials
  private tireMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c1d21,
    roughness: 0.9,
    metalness: 0.1,
  });

  private rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.35,
    metalness: 0.85,
  });

  private chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.15,
    metalness: 0.95,
  });

  private glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.65,
  });

  private darkChassisMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.8,
    metalness: 0.4,
  });

  public createWheel(radius = 0.5, width = 0.36, isDual = false): THREE.Group {
    const wheelGroup = new THREE.Group();

    if (!isDual) {
      // Single tire
      const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 18);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, this.tireMaterial);
      tire.castShadow = true;
      tire.receiveShadow = true;
      wheelGroup.add(tire);

      // Steel Rim
      const rimGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.02, 16);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, this.rimMaterial);
      wheelGroup.add(rim);

      // Wheel hub center
      const hubGeo = new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, width + 0.05, 12);
      hubGeo.rotateZ(Math.PI / 2);
      const hub = new THREE.Mesh(hubGeo, this.chromeMaterial);
      wheelGroup.add(hub);
    } else {
      // Dual wheel assembly (outer + inner wheel)
      const halfWidth = width * 0.45;
      [-width * 0.3, width * 0.3].forEach((offset) => {
        const tireGeo = new THREE.CylinderGeometry(radius, radius, halfWidth, 18);
        tireGeo.rotateZ(Math.PI / 2);
        const tire = new THREE.Mesh(tireGeo, this.tireMaterial);
        tire.position.x = offset;
        tire.castShadow = true;
        wheelGroup.add(tire);

        const rimGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, halfWidth + 0.01, 16);
        rimGeo.rotateZ(Math.PI / 2);
        const rim = new THREE.Mesh(rimGeo, this.rimMaterial);
        rim.position.x = offset;
        wheelGroup.add(rim);
      });
      const axleGeo = new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width * 1.05, 10);
      axleGeo.rotateZ(Math.PI / 2);
      const axle = new THREE.Mesh(axleGeo, this.darkChassisMaterial);
      wheelGroup.add(axle);
    }

    return wheelGroup;
  }

  public buildTruck(model: TruckModel, colorHex?: string): BuiltTruck {
    const root = new THREE.Group();
    const chassis = new THREE.Group();
    const cabin = new THREE.Group();

    root.add(chassis);
    chassis.add(cabin);

    const truckColor = new THREE.Color(colorHex || model.defaultColor);
    const cabMaterial = new THREE.MeshStandardMaterial({
      color: truckColor,
      roughness: 0.22,
      metalness: 0.72,
    });

    const rearWheels: THREE.Group[] = [];
    const tailLights: THREE.Mesh[] = [];
    const leftBlinkers: THREE.Mesh[] = [];
    const rightBlinkers: THREE.Mesh[] = [];

    // Lens materials
    const headlampLensMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x222222,
      roughness: 0.2,
      metalness: 0.8,
    });

    const tailLampMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0x450a0a,
      roughness: 0.3,
    });

    const blinkerMatLeft = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0x78350f,
      roughness: 0.3,
    });

    const blinkerMatRight = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0x78350f,
      roughness: 0.3,
    });

    // Wheels
    const frontL = this.createWheel(0.48, 0.32, false);
    const frontR = this.createWheel(0.48, 0.32, false);
    chassis.add(frontL);
    chassis.add(frontR);

    let steeringWheelMesh: THREE.Mesh | undefined;
    let hitchPos = new THREE.Vector3(0, 0.9, -1.8);

    if (model.id === 'daihatsu_delta') {
      // 1. DAIHATSU DELTA - Compact Japanese Light Commercial
      // Chassis Rails
      const frameGeo = new THREE.BoxGeometry(1.3, 0.25, 4.2);
      const frame = new THREE.Mesh(frameGeo, this.darkChassisMaterial);
      frame.position.set(0, 0.55, 0);
      frame.castShadow = true;
      chassis.add(frame);

      // Cabin (Cab-over style)
      const cabMainGeo = new THREE.BoxGeometry(1.85, 1.7, 1.6);
      const cabMain = new THREE.Mesh(cabMainGeo, cabMaterial);
      cabMain.position.set(0, 1.45, 1.1);
      cabMain.castShadow = true;
      cabin.add(cabMain);

      // Windshield
      const winGeo = new THREE.BoxGeometry(1.7, 0.75, 0.1);
      const win = new THREE.Mesh(winGeo, this.glassMaterial);
      win.position.set(0, 1.65, 1.91);
      win.rotation.x = -0.15;
      cabin.add(win);

      // Side windows
      [-0.93, 0.93].forEach((sideX) => {
        const sideWinGeo = new THREE.BoxGeometry(0.08, 0.65, 0.9);
        const sideWin = new THREE.Mesh(sideWinGeo, this.glassMaterial);
        sideWin.position.set(sideX, 1.62, 1.15);
        cabin.add(sideWin);

        // Mirrors
        const mirrorGeo = new THREE.BoxGeometry(0.08, 0.38, 0.22);
        const mirror = new THREE.Mesh(mirrorGeo, this.chromeMaterial);
        mirror.position.set(sideX > 0 ? sideX + 0.18 : sideX - 0.18, 1.6, 1.7);
        cabin.add(mirror);
      });

      // Front Grille & Bumper
      const bumperGeo = new THREE.BoxGeometry(1.9, 0.35, 0.4);
      const bumper = new THREE.Mesh(bumperGeo, this.rimMaterial);
      bumper.position.set(0, 0.6, 1.85);
      chassis.add(bumper);

      const grilleGeo = new THREE.BoxGeometry(1.2, 0.45, 0.08);
      const grille = new THREE.Mesh(grilleGeo, this.darkChassisMaterial);
      grille.position.set(0, 1.05, 1.91);
      cabin.add(grille);

      // Delta Badge
      const badgeGeo = new THREE.BoxGeometry(0.35, 0.12, 0.09);
      const badge = new THREE.Mesh(badgeGeo, this.chromeMaterial);
      badge.position.set(0, 1.25, 1.915);
      cabin.add(badge);

      // Steering Wheel inside cab
      const swGeo = new THREE.TorusGeometry(0.22, 0.035, 8, 16);
      steeringWheelMesh = new THREE.Mesh(swGeo, this.darkChassisMaterial);
      steeringWheelMesh.position.set(-0.45, 1.45, 1.35);
      steeringWheelMesh.rotation.x = Math.PI / 3;
      cabin.add(steeringWheelMesh);

      // Wheel Positions
      const fwZ = 1.35;
      const rwZ = -1.2;
      const trackW = 0.88;
      frontL.position.set(-trackW, 0.48, fwZ);
      frontR.position.set(trackW, 0.48, fwZ);

      // Single Dual-Axle rear
      const rearL = this.createWheel(0.48, 0.42, true);
      const rearR = this.createWheel(0.48, 0.42, true);
      rearL.position.set(-trackW, 0.48, rwZ);
      rearR.position.set(trackW, 0.48, rwZ);
      chassis.add(rearL);
      chassis.add(rearR);
      rearWheels.push(rearL, rearR);

      // Headlight lenses
      const lensGeo = new THREE.BoxGeometry(0.24, 0.22, 0.06);
      const hlLeft = new THREE.Mesh(lensGeo, headlampLensMat);
      hlLeft.position.set(-0.62, 0.78, 1.91);
      cabin.add(hlLeft);

      const hlRight = new THREE.Mesh(lensGeo, headlampLensMat);
      hlRight.position.set(0.62, 0.78, 1.91);
      cabin.add(hlRight);

      // Blinkers
      const blinkerGeo = new THREE.BoxGeometry(0.18, 0.18, 0.06);
      const blLeft = new THREE.Mesh(blinkerGeo, blinkerMatLeft);
      blLeft.position.set(-0.84, 0.78, 1.9);
      cabin.add(blLeft);
      leftBlinkers.push(blLeft);

      const blRight = new THREE.Mesh(blinkerGeo, blinkerMatRight);
      blRight.position.set(0.84, 0.78, 1.9);
      cabin.add(blRight);
      rightBlinkers.push(blRight);

      // Tail lights
      const tlGeo = new THREE.BoxGeometry(0.2, 0.15, 0.05);
      [-0.55, 0.55].forEach((tx) => {
        const tl = new THREE.Mesh(tlGeo, tailLampMat);
        tl.position.set(tx, 0.58, -2.1);
        chassis.add(tl);
        tailLights.push(tl);
      });

      // Fifth wheel plate
      const fifthWheelGeo = new THREE.CylinderGeometry(0.42, 0.45, 0.12, 16);
      const fifthWheel = new THREE.Mesh(fifthWheelGeo, this.rimMaterial);
      fifthWheel.position.set(0, 0.75, -1.2);
      chassis.add(fifthWheel);
      hitchPos = new THREE.Vector3(0, 0.85, -1.2);

    } else if (model.id === 'mitsubishi_fuso') {
      // 2. MITSUBISHI FUSO - Medium 6x2 with aerodynamic cab roof deflector
      const frameGeo = new THREE.BoxGeometry(1.4, 0.3, 5.6);
      const frame = new THREE.Mesh(frameGeo, this.darkChassisMaterial);
      frame.position.set(0, 0.6, -0.3);
      frame.castShadow = true;
      chassis.add(frame);

      // Cabin
      const cabMainGeo = new THREE.BoxGeometry(2.1, 1.95, 1.8);
      const cabMain = new THREE.Mesh(cabMainGeo, cabMaterial);
      cabMain.position.set(0, 1.65, 1.4);
      cabMain.castShadow = true;
      cabin.add(cabMain);

      // Roof Aero Fairing / Deflector
      const deflectorGeo = new THREE.ConeGeometry(1.1, 0.75, 4);
      deflectorGeo.rotateY(Math.PI / 4);
      const deflector = new THREE.Mesh(deflectorGeo, cabMaterial);
      deflector.position.set(0, 2.85, 1.35);
      deflector.scale.set(1.6, 0.7, 1.2);
      cabin.add(deflector);

      // Windshield
      const winGeo = new THREE.BoxGeometry(1.9, 0.85, 0.08);
      const win = new THREE.Mesh(winGeo, this.glassMaterial);
      win.position.set(0, 1.85, 2.31);
      win.rotation.x = -0.12;
      cabin.add(win);

      // Grille & Chrome bar
      const grilleGeo = new THREE.BoxGeometry(1.5, 0.6, 0.1);
      const grille = new THREE.Mesh(grilleGeo, this.darkChassisMaterial);
      grille.position.set(0, 1.15, 2.32);
      cabin.add(grille);

      const fusoBar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.12), this.chromeMaterial);
      fusoBar.position.set(0, 1.32, 2.33);
      cabin.add(fusoBar);

      // Bumper
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.42, 0.45), this.rimMaterial);
      bumper.position.set(0, 0.62, 2.25);
      chassis.add(bumper);

      // Fuel tanks
      [-1.0, 1.0].forEach((sideX) => {
        const tankGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.4, 14);
        tankGeo.rotateX(Math.PI / 2);
        const tank = new THREE.Mesh(tankGeo, this.rimMaterial);
        tank.position.set(sideX, 0.58, -0.2);
        chassis.add(tank);
      });

      // Steering Wheel
      const swGeo = new THREE.TorusGeometry(0.24, 0.038, 8, 16);
      steeringWheelMesh = new THREE.Mesh(swGeo, this.darkChassisMaterial);
      steeringWheelMesh.position.set(-0.52, 1.6, 1.7);
      steeringWheelMesh.rotation.x = Math.PI / 3;
      cabin.add(steeringWheelMesh);

      // Wheel layout (1 front, 2 rear axles)
      const fwZ = 1.65;
      const rwZ1 = -1.1;
      const rwZ2 = -2.3;
      const trackW = 1.0;

      frontL.position.set(-trackW, 0.5, fwZ);
      frontR.position.set(trackW, 0.5, fwZ);

      [rwZ1, rwZ2].forEach((rz) => {
        const rL = this.createWheel(0.5, 0.46, true);
        const rR = this.createWheel(0.5, 0.46, true);
        rL.position.set(-trackW, 0.5, rz);
        rR.position.set(trackW, 0.5, rz);
        chassis.add(rL);
        chassis.add(rR);
        rearWheels.push(rL, rR);
      });

      // Lights
      const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.06), headlampLensMat);
      hlLeft.position.set(-0.75, 0.85, 2.32);
      cabin.add(hlLeft);

      const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.06), headlampLensMat);
      hlRight.position.set(0.75, 0.85, 2.32);
      cabin.add(hlRight);

      // Blinkers
      const blLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.06), blinkerMatLeft);
      blLeft.position.set(-0.95, 0.85, 2.31);
      cabin.add(blLeft);
      leftBlinkers.push(blLeft);

      const blRight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.06), blinkerMatRight);
      blRight.position.set(0.95, 0.85, 2.31);
      cabin.add(blRight);
      rightBlinkers.push(blRight);

      // Tail lights
      [-0.65, 0.65].forEach((tx) => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.06), tailLampMat);
        tl.position.set(tx, 0.65, -3.05);
        chassis.add(tl);
        tailLights.push(tl);
      });

      // Fifth wheel
      const fifthWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.14, 16), this.rimMaterial);
      fifthWheel.position.set(0, 0.82, -1.7);
      chassis.add(fifthWheel);
      hitchPos = new THREE.Vector3(0, 0.92, -1.7);

    } else if (model.id === 'isuzu_giga') {
      // 3. ISUZU GIGA HEAVY - Tall heavy cab-over 6x4 with high air intake & roof lamps
      const frameGeo = new THREE.BoxGeometry(1.5, 0.35, 6.2);
      const frame = new THREE.Mesh(frameGeo, this.darkChassisMaterial);
      frame.position.set(0, 0.65, -0.4);
      frame.castShadow = true;
      chassis.add(frame);

      // Imposing high cab
      const cabMainGeo = new THREE.BoxGeometry(2.3, 2.3, 1.9);
      const cabMain = new THREE.Mesh(cabMainGeo, cabMaterial);
      cabMain.position.set(0, 1.95, 1.6);
      cabMain.castShadow = true;
      cabin.add(cabMain);

      // Sun visor
      const visor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 0.4), this.rimMaterial);
      visor.position.set(0, 2.9, 2.45);
      visor.rotation.x = 0.25;
      cabin.add(visor);

      // Windshield
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.95, 0.08), this.glassMaterial);
      win.position.set(0, 2.15, 2.56);
      win.rotation.x = -0.1;
      cabin.add(win);

      // Chrome Big Grille
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.12), this.chromeMaterial);
      grille.position.set(0, 1.25, 2.57);
      cabin.add(grille);

      // Bumper with foglights
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.5, 0.5), this.rimMaterial);
      bumper.position.set(0, 0.68, 2.5);
      chassis.add(bumper);

      // Vertical exhaust pipe
      const exhaustGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.8, 12);
      const exhaust = new THREE.Mesh(exhaustGeo, this.chromeMaterial);
      exhaust.position.set(0.9, 2.1, 0.5);
      cabin.add(exhaust);

      // Steering Wheel
      const swGeo = new THREE.TorusGeometry(0.25, 0.04, 8, 16);
      steeringWheelMesh = new THREE.Mesh(swGeo, this.darkChassisMaterial);
      steeringWheelMesh.position.set(-0.58, 1.85, 1.85);
      steeringWheelMesh.rotation.x = Math.PI / 3;
      cabin.add(steeringWheelMesh);

      // Wheel positions
      const fwZ = 1.9;
      const rwZ1 = -1.3;
      const rwZ2 = -2.65;
      const trackW = 1.1;

      frontL.position.set(-trackW, 0.52, fwZ);
      frontR.position.set(trackW, 0.52, fwZ);

      [rwZ1, rwZ2].forEach((rz) => {
        const rL = this.createWheel(0.52, 0.48, true);
        const rR = this.createWheel(0.52, 0.48, true);
        rL.position.set(-trackW, 0.52, rz);
        rR.position.set(trackW, 0.52, rz);
        chassis.add(rL);
        chassis.add(rR);
        rearWheels.push(rL, rR);
      });

      // Lights
      const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.08), headlampLensMat);
      hlLeft.position.set(-0.85, 0.95, 2.58);
      cabin.add(hlLeft);

      const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.08), headlampLensMat);
      hlRight.position.set(0.85, 0.95, 2.58);
      cabin.add(hlRight);

      // Blinkers
      const blLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.08), blinkerMatLeft);
      blLeft.position.set(-1.08, 0.95, 2.55);
      cabin.add(blLeft);
      leftBlinkers.push(blLeft);

      const blRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.08), blinkerMatRight);
      blRight.position.set(1.08, 0.95, 2.55);
      cabin.add(blRight);
      rightBlinkers.push(blRight);

      // Tail lights
      [-0.7, 0.7].forEach((tx) => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.06), tailLampMat);
        tl.position.set(tx, 0.68, -3.45);
        chassis.add(tl);
        tailLights.push(tl);
      });

      // Fifth wheel
      const fifthWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.55, 0.16, 16), this.rimMaterial);
      fifthWheel.position.set(0, 0.9, -1.95);
      chassis.add(fifthWheel);
      hitchPos = new THREE.Vector3(0, 1.0, -1.95);

    } else {
      // 4. KENWORTH RIG MASTER - Conventional Long-Nose Sleeper Cab with Twin Vertical Chrome Stacks
      const frameGeo = new THREE.BoxGeometry(1.5, 0.35, 7.2);
      const frame = new THREE.Mesh(frameGeo, this.darkChassisMaterial);
      frame.position.set(0, 0.65, -0.6);
      frame.castShadow = true;
      chassis.add(frame);

      // Engine Long Hood
      const hoodGeo = new THREE.BoxGeometry(1.7, 1.35, 2.4);
      const hood = new THREE.Mesh(hoodGeo, cabMaterial);
      hood.position.set(0, 1.45, 2.2);
      hood.castShadow = true;
      cabin.add(hood);

      // Imposing Chrome Radiator & Bullbar
      const radiator = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 0.2), this.chromeMaterial);
      radiator.position.set(0, 1.48, 3.42);
      cabin.add(radiator);

      const bullbar = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 0.3), this.chromeMaterial);
      bullbar.position.set(0, 0.85, 3.5);
      chassis.add(bullbar);

      // Sleeper Cabin
      const cabMainGeo = new THREE.BoxGeometry(2.4, 2.2, 2.8);
      const cabMain = new THREE.Mesh(cabMainGeo, cabMaterial);
      cabMain.position.set(0, 1.9, -0.2);
      cabMain.castShadow = true;
      cabin.add(cabMain);

      // Windshield (split screen classic)
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 0.08), this.glassMaterial);
      win.position.set(0, 2.05, 1.02);
      win.rotation.x = -0.18;
      cabin.add(win);

      // Twin Chrome Vertical Exhaust Stacks
      [-1.25, 1.25].forEach((sx) => {
        const stackGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.4, 14);
        const stack = new THREE.Mesh(stackGeo, this.chromeMaterial);
        stack.position.set(sx, 2.4, 0.6);
        cabin.add(stack);

        // Huge cylindrical chrome fuel tank
        const tankGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.9, 14);
        tankGeo.rotateX(Math.PI / 2);
        const tank = new THREE.Mesh(tankGeo, this.chromeMaterial);
        tank.position.set(sx * 0.95, 0.65, 0.6);
        chassis.add(tank);
      });

      // Steering Wheel
      const swGeo = new THREE.TorusGeometry(0.26, 0.04, 8, 16);
      steeringWheelMesh = new THREE.Mesh(swGeo, this.darkChassisMaterial);
      steeringWheelMesh.position.set(-0.6, 1.75, 0.6);
      steeringWheelMesh.rotation.x = Math.PI / 3;
      cabin.add(steeringWheelMesh);

      // Wheel layout (Front axle way forward, tandem rear)
      const fwZ = 2.7;
      const rwZ1 = -1.6;
      const rwZ2 = -3.0;
      const trackW = 1.15;

      frontL.position.set(-trackW, 0.54, fwZ);
      frontR.position.set(trackW, 0.54, fwZ);

      [rwZ1, rwZ2].forEach((rz) => {
        const rL = this.createWheel(0.54, 0.5, true);
        const rR = this.createWheel(0.54, 0.5, true);
        rL.position.set(-trackW, 0.54, rz);
        rR.position.set(trackW, 0.54, rz);
        chassis.add(rL);
        chassis.add(rR);
        rearWheels.push(rL, rR);
      });

      // Headlights on front fenders
      const hlLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16), headlampLensMat);
      hlLeft.rotateX(Math.PI / 2);
      hlLeft.position.set(-0.95, 1.1, 3.3);
      cabin.add(hlLeft);

      const hlRight = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16), headlampLensMat);
      hlRight.rotateX(Math.PI / 2);
      hlRight.position.set(0.95, 1.1, 3.3);
      cabin.add(hlRight);

      // Blinkers
      const blLeft = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.06), blinkerMatLeft);
      blLeft.position.set(-1.18, 1.1, 3.25);
      cabin.add(blLeft);
      leftBlinkers.push(blLeft);

      const blRight = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.06), blinkerMatRight);
      blRight.position.set(1.18, 1.1, 3.25);
      cabin.add(blRight);
      rightBlinkers.push(blRight);

      // Tail lights
      [-0.75, 0.75].forEach((tx) => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.06), tailLampMat);
        tl.position.set(tx, 0.68, -4.1);
        chassis.add(tl);
        tailLights.push(tl);
      });

      // Fifth wheel
      const fifthWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.58, 0.18, 16), this.rimMaterial);
      fifthWheel.position.set(0, 0.95, -2.3);
      chassis.add(fifthWheel);
      hitchPos = new THREE.Vector3(0, 1.05, -2.3);
    }

    // Spotlights for functional headlights
    const leftSpot = new THREE.SpotLight(0xfffaed, 0, 75, Math.PI / 6, 0.45, 1.2);
    leftSpot.position.set(-0.7, 1.0, 2.5);
    leftSpot.target.position.set(-0.7, 0, 30);
    chassis.add(leftSpot);
    chassis.add(leftSpot.target);

    const rightSpot = new THREE.SpotLight(0xfffaed, 0, 75, Math.PI / 6, 0.45, 1.2);
    rightSpot.position.set(0.7, 1.0, 2.5);
    rightSpot.target.position.set(0.7, 0, 30);
    chassis.add(rightSpot);
    chassis.add(rightSpot.target);

    // Left and right headlight dummy meshes for material access
    const dummyLensL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), headlampLensMat);
    const dummyLensR = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), headlampLensMat);

    return {
      rootGroup: root,
      chassisGroup: chassis,
      cabinGroup: cabin,
      frontLeftWheel: frontL,
      frontRightWheel: frontR,
      rearWheels,
      steeringWheel: steeringWheelMesh,
      headlights: {
        leftSpot,
        rightSpot,
        leftLens: dummyLensL,
        rightLens: dummyLensR,
      },
      tailLights,
      leftBlinkers,
      rightBlinkers,
      cabinMaterial: cabMaterial,
      trailerHitchPosition: hitchPos,
    };
  }

  public buildTrailer(type: TrailerType, fillPercent: number = 70): BuiltTrailer {
    const root = new THREE.Group();
    const chassis = new THREE.Group();
    root.add(chassis);

    const wheels: THREE.Group[] = [];
    const tailLights: THREE.Mesh[] = [];
    const leftBlinkers: THREE.Mesh[] = [];
    const rightBlinkers: THREE.Mesh[] = [];
    const cargoGroup = new THREE.Group();
    chassis.add(cargoGroup);

    if (type === 'none') {
      return {
        rootGroup: root,
        chassisGroup: chassis,
        wheels,
        tailLights,
        leftBlinkers,
        rightBlinkers,
        cargoMeshGroup: cargoGroup,
        hitchPivotOffset: 0,
      };
    }

    const tailLampMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0x450a0a,
      roughness: 0.3,
    });

    const blinkerMatLeft = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0x78350f,
      roughness: 0.3,
    });

    const blinkerMatRight = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0x78350f,
      roughness: 0.3,
    });

    let hitchOffset = 1.2;

    if (type === 'flatbed') {
      // 1. UNIVERSAL FLATBED TRAILER
      hitchOffset = 1.0;
      const length = 9.8;
      const width = 2.45;

      // Steel frame + wood deck
      const bedGeo = new THREE.BoxGeometry(width, 0.35, length);
      const bedMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.6, metalness: 0.4 });
      const bed = new THREE.Mesh(bedGeo, bedMat);
      bed.position.set(0, 1.1, -length / 2 + hitchOffset);
      bed.castShadow = true;
      chassis.add(bed);

      // Wood deck planks texture
      const woodDeckGeo = new THREE.BoxGeometry(width - 0.1, 0.08, length - 0.2);
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 });
      const woodDeck = new THREE.Mesh(woodDeckGeo, woodMat);
      woodDeck.position.set(0, 1.3, -length / 2 + hitchOffset);
      chassis.add(woodDeck);

      // Front headache rack
      const rackGeo = new THREE.BoxGeometry(width, 1.4, 0.15);
      const rack = new THREE.Mesh(rackGeo, bedMat);
      rack.position.set(0, 1.8, hitchOffset - 0.1);
      chassis.add(rack);

      // Wheels (tandem axle at rear)
      const axleZ1 = -length + hitchOffset + 2.2;
      const axleZ2 = -length + hitchOffset + 1.0;
      [axleZ1, axleZ2].forEach((az) => {
        const wL = this.createWheel(0.5, 0.48, true);
        const wR = this.createWheel(0.5, 0.48, true);
        wL.position.set(-1.1, 0.5, az);
        wR.position.set(1.1, 0.5, az);
        chassis.add(wL);
        chassis.add(wR);
        wheels.push(wL, wR);
      });

      // Cargo: Structural steel beams and industrial crates
      if (fillPercent > 10) {
        const cargoCount = Math.ceil((fillPercent / 100) * 8);
        for (let i = 0; i < cargoCount; i++) {
          const zPos = hitchOffset - 1.2 - i * 0.9;
          const pipeGeo = new THREE.CylinderGeometry(0.22, 0.22, 2.1, 14);
          pipeGeo.rotateZ(Math.PI / 2);
          const pipeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
          const pipe = new THREE.Mesh(pipeGeo, pipeMat);
          pipe.position.set(0, 1.55, zPos);
          pipe.castShadow = true;
          cargoGroup.add(pipe);

          // Top layer pipe
          if (i % 2 === 0) {
            const topPipe = new THREE.Mesh(pipeGeo, pipeMat);
            topPipe.position.set(0, 1.95, zPos);
            topPipe.castShadow = true;
            cargoGroup.add(topPipe);
          }
        }
      }

      // Tail lights & blinkers at rear bumper
      const rearZ = -length + hitchOffset - 0.15;
      [-0.9, 0.9].forEach((rx) => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.05), tailLampMat);
        tl.position.set(rx, 0.8, rearZ);
        chassis.add(tl);
        tailLights.push(tl);
      });

      const blL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.05), blinkerMatLeft);
      blL.position.set(-1.12, 0.8, rearZ);
      chassis.add(blL);
      leftBlinkers.push(blL);

      const blR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.05), blinkerMatRight);
      blR.position.set(1.12, 0.8, rearZ);
      chassis.add(blR);
      rightBlinkers.push(blR);

    } else if (type === 'box') {
      // 2. FREIGHT BOX TRAILER (Dry Van)
      hitchOffset = 1.2;
      const length = 11.5;
      const width = 2.5;
      const height = 2.8;

      const boxGeo = new THREE.BoxGeometry(width, height, length);
      const boxMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        roughness: 0.35,
        metalness: 0.25,
      });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.set(0, 1.1 + height / 2, -length / 2 + hitchOffset);
      box.castShadow = true;
      chassis.add(box);

      // Corner trims
      const trimGeo = new THREE.BoxGeometry(width + 0.05, height + 0.05, 0.15);
      const trimMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
      const trimFront = new THREE.Mesh(trimGeo, trimMat);
      trimFront.position.set(0, 1.1 + height / 2, hitchOffset);
      chassis.add(trimFront);

      const trimRear = new THREE.Mesh(trimGeo, trimMat);
      trimRear.position.set(0, 1.1 + height / 2, -length + hitchOffset);
      chassis.add(trimRear);

      // Rear tandem wheels
      const axleZ1 = -length + hitchOffset + 2.4;
      const axleZ2 = -length + hitchOffset + 1.1;
      [axleZ1, axleZ2].forEach((az) => {
        const wL = this.createWheel(0.52, 0.48, true);
        const wR = this.createWheel(0.52, 0.48, true);
        wL.position.set(-1.12, 0.52, az);
        wR.position.set(1.12, 0.52, az);
        chassis.add(wL);
        chassis.add(wR);
        wheels.push(wL, wR);
      });

      // Lights
      const rearZ = -length + hitchOffset - 0.08;
      [-0.95, 0.95].forEach((rx) => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.06), tailLampMat);
        tl.position.set(rx, 0.8, rearZ);
        chassis.add(tl);
        tailLights.push(tl);
      });

      const blL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.06), blinkerMatLeft);
      blL.position.set(-1.15, 0.8, rearZ);
      chassis.add(blL);
      leftBlinkers.push(blL);

      const blR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.06), blinkerMatRight);
      blR.position.set(1.15, 0.8, rearZ);
      chassis.add(blR);
      rightBlinkers.push(blR);

    } else if (type === 'tanker') {
      // 3. LIQUID TANKER TRAILER
      hitchOffset = 1.3;
      const length = 11.0;
      const radius = 1.25;

      const tankGeo = new THREE.CylinderGeometry(radius, radius, length, 24);
      tankGeo.rotateX(Math.PI / 2);
      const tankMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.15,
        metalness: 0.95,
      });
      const tank = new THREE.Mesh(tankGeo, tankMat);
      tank.position.set(0, 1.8, -length / 2 + hitchOffset);
      tank.castShadow = true;
      chassis.add(tank);

      // Hemispherical ends
      [-length / 2 + hitchOffset, -length / 2 + hitchOffset].forEach((_, idx) => {
        const capGeo = new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const cap = new THREE.Mesh(capGeo, tankMat);
        if (idx === 0) {
          cap.rotateX(-Math.PI / 2);
          cap.position.set(0, 1.8, hitchOffset);
        } else {
          cap.rotateX(Math.PI / 2);
          cap.position.set(0, 1.8, -length + hitchOffset);
        }
        chassis.add(cap);
      });

      // Top Catwalk & Railing
      const catwalkGeo = new THREE.BoxGeometry(0.65, 0.06, length * 0.85);
      const catwalk = new THREE.Mesh(catwalkGeo, this.rimMaterial);
      catwalk.position.set(0, 1.8 + radius + 0.05, -length / 2 + hitchOffset);
      chassis.add(catwalk);

      // Tandem rear wheels
      const axleZ1 = -length + hitchOffset + 2.5;
      const axleZ2 = -length + hitchOffset + 1.2;
      [axleZ1, axleZ2].forEach((az) => {
        const wL = this.createWheel(0.52, 0.48, true);
        const wR = this.createWheel(0.52, 0.48, true);
        wL.position.set(-1.12, 0.52, az);
        wR.position.set(1.12, 0.52, az);
        chassis.add(wL);
        chassis.add(wR);
        wheels.push(wL, wR);
      });

      // Rear lights
      const rearZ = -length + hitchOffset - 0.4;
      [-0.85, 0.85].forEach((rx) => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.06), tailLampMat);
        tl.position.set(rx, 0.8, rearZ);
        chassis.add(tl);
        tailLights.push(tl);
      });

      const blL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.06), blinkerMatLeft);
      blL.position.set(-1.1, 0.8, rearZ);
      chassis.add(blL);
      leftBlinkers.push(blL);

      const blR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.06), blinkerMatRight);
      blR.position.set(1.1, 0.8, rearZ);
      chassis.add(blR);
      rightBlinkers.push(blR);

    } else if (type === 'lowboy') {
      // 4. HEAVY LOWBOY TRAILER WITH EXCAVATOR
      hitchOffset = 1.5;
      const length = 13.5;
      const deckWidth = 2.7;

      // Gooseneck front
      const neckGeo = new THREE.BoxGeometry(1.6, 0.8, 2.2);
      const neckMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.7 });
      const neck = new THREE.Mesh(neckGeo, neckMat);
      neck.position.set(0, 1.15, hitchOffset - 0.7);
      chassis.add(neck);

      // Low drop-deck
      const deckGeo = new THREE.BoxGeometry(deckWidth, 0.35, 7.5);
      const deck = new THREE.Mesh(deckGeo, neckMat);
      deck.position.set(0, 0.55, -3.8);
      deck.castShadow = true;
      chassis.add(deck);

      // Tri-Axle Rear Bogie
      const rearBogieGeo = new THREE.BoxGeometry(deckWidth, 0.7, 3.8);
      const rearBogie = new THREE.Mesh(rearBogieGeo, neckMat);
      rearBogie.position.set(0, 0.85, -9.5);
      chassis.add(rearBogie);

      // 3 Rear Axles
      [-8.2, -9.5, -10.8].forEach((az) => {
        const wL = this.createWheel(0.48, 0.5, true);
        const wR = this.createWheel(0.48, 0.5, true);
        wL.position.set(-1.25, 0.48, az);
        wR.position.set(1.25, 0.48, az);
        chassis.add(wL);
        chassis.add(wR);
        wheels.push(wL, wR);
      });

      // Cargo: Heavy Yellow 30-Ton Mining Excavator
      if (fillPercent > 20) {
        const excavMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35, metalness: 0.4 });
        const tracksMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

        // Left & right caterpillar tracks
        [-0.95, 0.95].forEach((tx) => {
          const track = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 4.2), tracksMat);
          track.position.set(tx, 0.95, -3.8);
          track.castShadow = true;
          cargoGroup.add(track);
        });

        // Revolving Upper Body Cab
        const cabBody = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.5, 3.2), excavMat);
        cabBody.position.set(0, 2.05, -3.6);
        cabBody.castShadow = true;
        cargoGroup.add(cabBody);

        // Counterweight (black cast iron at back)
        const cw = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 0.8), tracksMat);
        cw.position.set(0, 1.9, -1.8);
        cargoGroup.add(cw);

        // Excavator Boom & Arm
        const boomGeo = new THREE.BoxGeometry(0.45, 0.65, 3.8);
        const boom = new THREE.Mesh(boomGeo, excavMat);
        boom.position.set(0, 2.6, -5.8);
        boom.rotation.x = -0.45;
        boom.castShadow = true;
        cargoGroup.add(boom);

        // Bucket
        const bucketGeo = new THREE.BoxGeometry(1.1, 0.9, 0.9);
        const bucket = new THREE.Mesh(bucketGeo, tracksMat);
        bucket.position.set(0, 1.2, -7.5);
        bucket.castShadow = true;
        cargoGroup.add(bucket);
      }

      // Lights at rear of trailer
      const rearZ = -11.5;
      [-1.1, 1.1].forEach((rx) => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.06), tailLampMat);
        tl.position.set(rx, 0.8, rearZ);
        chassis.add(tl);
        tailLights.push(tl);
      });

      const blL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.06), blinkerMatLeft);
      blL.position.set(-1.3, 0.8, rearZ);
      chassis.add(blL);
      leftBlinkers.push(blL);

      const blR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.06), blinkerMatRight);
      blR.position.set(1.3, 0.8, rearZ);
      chassis.add(blR);
      rightBlinkers.push(blR);
    }

    return {
      rootGroup: root,
      chassisGroup: chassis,
      wheels,
      tailLights,
      leftBlinkers,
      rightBlinkers,
      cargoMeshGroup: cargoGroup,
      hitchPivotOffset: hitchOffset,
    };
  }
}
