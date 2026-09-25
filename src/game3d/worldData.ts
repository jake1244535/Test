import * as THREE from 'three';
import { ProceduralTextures } from './proceduralTextures';
import { WorldTerrainSystem } from './terrainSystem';

export interface WorldData {
  terrainMesh: THREE.Mesh;
  roadMesh: THREE.Mesh;
  decorationsGroup: THREE.Group;
  collisionBoxes: THREE.Box3[];
  trafficWaypoints: THREE.Vector3[];
  streetLampMaterials: THREE.MeshStandardMaterial[];
  streetLampLights: THREE.PointLight[];
  fuelStationZone: THREE.Box3;
}

export function build3DWorld(): WorldData {
  const decorationsGroup = new THREE.Group();
  const collisionBoxes: THREE.Box3[] = [];
  const streetLampMaterials: THREE.MeshStandardMaterial[] = [];
  const streetLampLights: THREE.PointLight[] = [];

  // 1. Terrain Mesh (1400m x 1400m) with 100% unified heightfield
  const terrainSize = 1400;
  const segments = 130;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = WorldTerrainSystem.getGroundElevation(x, z);
    posAttr.setY(i, y);

    // Natural vertex tinting: mountain stone on peaks, lush green in valley, sand near coast
    if (y > 22) {
      // Rocky grey/slate alpine mountain
      colors[i * 3] = 0.42;
      colors[i * 3 + 1] = 0.41;
      colors[i * 3 + 2] = 0.39;
    } else if (y < 0.2 && x > 160 && z > 60) {
      // Coastal sandy shoreline
      colors[i * 3] = 0.82;
      colors[i * 3 + 1] = 0.76;
      colors[i * 3 + 2] = 0.58;
    } else if (y < -3) {
      // River canyon gravel
      colors[i * 3] = 0.32;
      colors[i * 3 + 1] = 0.33;
      colors[i * 3 + 2] = 0.35;
    } else {
      // Lush grassy valley & pine soil
      const grassVariation = 0.05 * Math.sin(x * 0.1) * Math.cos(z * 0.1);
      colors[i * 3] = 0.18 + grassVariation;
      colors[i * 3 + 1] = 0.38 + grassVariation;
      colors[i * 3 + 2] = 0.16;
    }
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.04,
    flatShading: true,
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;

  // 2. High-speed Highway Mesh & Road Markings
  const spline = WorldTerrainSystem.getSpline();
  const roadSamples = 340;
  const roadPoints = spline.getSpacedPoints(roadSamples);
  const roadWidth = WorldTerrainSystem.ROAD_WIDTH; // 15m

  const roadGeo = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Road markings geometry
  const leftLineVerts: number[] = [];
  const rightLineVerts: number[] = [];
  const dashLineIndices: number[] = [];
  const dashLineVerts: number[] = [];

  for (let i = 0; i <= roadSamples; i++) {
    const pt = roadPoints[i % roadSamples];
    const nextPt = roadPoints[(i + 1) % roadSamples];
    const forward = new THREE.Vector3().subVectors(nextPt, pt).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();

    const leftEdge = new THREE.Vector3().copy(pt).addScaledVector(right, -roadWidth / 2);
    const rightEdge = new THREE.Vector3().copy(pt).addScaledVector(right, roadWidth / 2);

    // Height offset 0.12m above terrain to guarantee no z-fighting
    vertices.push(leftEdge.x, pt.y + 0.12, leftEdge.z);
    vertices.push(rightEdge.x, pt.y + 0.12, rightEdge.z);

    const vCoord = i * 0.45;
    uvs.push(0, vCoord, 1, vCoord);

    // Solid white shoulder edge lines (0.35m width, 0.15m height)
    const lineW = 0.35;
    const lLineInner = new THREE.Vector3().copy(pt).addScaledVector(right, -roadWidth / 2 + 0.8);
    const lLineOuter = new THREE.Vector3().copy(lLineInner).addScaledVector(right, -lineW);
    leftLineVerts.push(lLineOuter.x, pt.y + 0.15, lLineOuter.z);
    leftLineVerts.push(lLineInner.x, pt.y + 0.15, lLineInner.z);

    const rLineInner = new THREE.Vector3().copy(pt).addScaledVector(right, roadWidth / 2 - 0.8);
    const rLineOuter = new THREE.Vector3().copy(rLineInner).addScaledVector(right, lineW);
    rightLineVerts.push(rLineInner.x, pt.y + 0.15, rLineInner.z);
    rightLineVerts.push(rLineOuter.x, pt.y + 0.15, rLineOuter.z);

    // Center dashed yellow markings (every alternating 2 segments)
    if (i % 4 < 2) {
      const cLeft = new THREE.Vector3().copy(pt).addScaledVector(right, -0.2);
      const cRight = new THREE.Vector3().copy(pt).addScaledVector(right, 0.2);
      dashLineVerts.push(cLeft.x, pt.y + 0.16, cLeft.z);
      dashLineVerts.push(cRight.x, pt.y + 0.16, cRight.z);
    }
  }

  for (let i = 0; i < roadSamples; i++) {
    const base = i * 2;
    indices.push(base, base + 1, base + 2);
    indices.push(base + 1, base + 3, base + 2);
  }

  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  roadGeo.setIndex(indices);
  roadGeo.computeVertexNormals();

  const asphaltTex = ProceduralTextures.getAsphaltTexture();
  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    color: 0x3a3e47,
    roughness: 0.8,
    metalness: 0.12,
  });

  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;

  // Solid edge line mesh
  const edgeLineMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x334155,
    roughness: 0.5,
  });

  const buildRibbonMesh = (verts: number[], sampleCount: number) => {
    const geo = new THREE.BufferGeometry();
    const ind: number[] = [];
    for (let i = 0; i < sampleCount; i++) {
      const base = i * 2;
      ind.push(base, base + 1, base + 2);
      ind.push(base + 1, base + 3, base + 2);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(ind);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, edgeLineMat);
  };

  decorationsGroup.add(buildRibbonMesh(leftLineVerts, roadSamples));
  decorationsGroup.add(buildRibbonMesh(rightLineVerts, roadSamples));

  // Dashed Yellow Center Line
  const centerYellowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0x854d0e,
    roughness: 0.4,
  });
  const dashGeo = new THREE.BufferGeometry();
  for (let i = 0; i < dashLineVerts.length / 6; i += 2) {
    const base = i * 2;
    if (base + 3 < dashLineVerts.length / 3) {
      dashLineIndices.push(base, base + 1, base + 2);
      dashLineIndices.push(base + 1, base + 3, base + 2);
    }
  }
  dashGeo.setAttribute('position', new THREE.Float32BufferAttribute(dashLineVerts, 3));
  dashGeo.setIndex(dashLineIndices);
  dashGeo.computeVertexNormals();
  const centerMesh = new THREE.Mesh(dashGeo, centerYellowMat);
  decorationsGroup.add(centerMesh);

  // 3. Grand Canyon Suspension Bridge over River Gorge
  buildCanyonSuspensionBridge(decorationsGroup, collisionBoxes);

  // 4. Mountain Highway Tunnel "TÚNEL EL CÓNDOR"
  buildMountainTunnel(decorationsGroup, collisionBoxes);

  // 5. Mega Truck Stop "PETRO-MAX" (Gas Station & Service Area)
  const fuelStationZone = buildPetroMaxTruckStop(decorationsGroup, collisionBoxes);

  // 6. Pacific Container Port with Cranes & Freighter
  buildPacificContainerPort(decorationsGroup, collisionBoxes);

  // 7. Titan Mountain Quarry
  buildTitanQuarry(decorationsGroup, collisionBoxes);

  // 8. Redwood Timber Sawmill
  buildRedwoodSawmill(decorationsGroup, collisionBoxes);

  // 9. Central Metro Logistics Hub
  buildMetroLogisticsHub(decorationsGroup, collisionBoxes);

  // 10. Mountain Guardrails with Silver W-Beams
  buildHighwayGuardrails(decorationsGroup, roadPoints);

  // 11. Overhead Highway Signs
  buildOverheadSigns(decorationsGroup);

  // 12. Flora & Street Lighting
  buildFloraAndLights(decorationsGroup, streetLampMaterials, streetLampLights);

  return {
    terrainMesh,
    roadMesh,
    decorationsGroup,
    collisionBoxes,
    trafficWaypoints: WorldTerrainSystem.WAYPOINTS,
    streetLampMaterials,
    streetLampLights,
    fuelStationZone,
  };
}

// ==========================================
// AAAA LANDMARK BUILDERS
// ==========================================

function buildCanyonSuspensionBridge(group: THREE.Group, collisions: THREE.Box3[]) {
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.8 }); // Golden Gate orange
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.9 });

  // Turquoise River Water in Canyon Bottom
  const waterGeo = new THREE.PlaneGeometry(160, 90);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    map: ProceduralTextures.getWaterTexture(),
    color: 0x0284c7,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.88,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(-115, -7.5, -235);
  group.add(waterMesh);

  // Suspension Towers (x: -90 and x: -140)
  [-90, -140].forEach((tx) => {
    const ty = tx === -90 ? 8.5 : 12.0;
    const tz = tx === -90 ? -240 : -230;

    // Left and Right Tower Columns
    [-9.5, 9.5].forEach((offsetZ) => {
      const colGeo = new THREE.BoxGeometry(3.5, 34, 3.5);
      const col = new THREE.Mesh(colGeo, steelMat);
      col.position.set(tx, ty + 12, tz + offsetZ);
      col.castShadow = true;
      group.add(col);
      collisions.push(new THREE.Box3().setFromObject(col));

      // Pier foundation extending deep into canyon
      const pierGeo = new THREE.BoxGeometry(6, 26, 6);
      const pier = new THREE.Mesh(pierGeo, concreteMat);
      pier.position.set(tx, ty - 12, tz + offsetZ);
      group.add(pier);

      // Warning beacon light atop tower
      const beaconGeo = new THREE.SphereGeometry(0.5, 8, 8);
      const beaconMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.0 });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(tx, ty + 29.5, tz + offsetZ);
      group.add(beacon);
    });

    // Horizontal Portal Struts
    const strutGeo = new THREE.BoxGeometry(3.2, 2.5, 19);
    const strut = new THREE.Mesh(strutGeo, steelMat);
    strut.position.set(tx, ty + 26, tz);
    group.add(strut);
  });

  // Main Suspension Cables spanning across towers
  [-9.5, 9.5].forEach((offsetZ) => {
    const cableGeo = new THREE.CylinderGeometry(0.18, 0.18, 120, 10);
    cableGeo.rotateZ(Math.PI / 2);
    const cable = new THREE.Mesh(cableGeo, cableMat);
    cable.position.set(-115, 28, -235 + offsetZ);
    group.add(cable);
  });
}

function buildMountainTunnel(group: THREE.Group, collisions: THREE.Box3[]) {
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });

  // North Portal (x: -270, y: 31, z: -360) and South Portal (x: -180, y: 18, z: -270)
  const portals = [
    { x: -270, y: 31, z: -360, rotY: Math.PI * 0.25 },
    { x: -180, y: 18, z: -270, rotY: Math.PI * 0.25 },
  ];

  portals.forEach((p, idx) => {
    const portalGroup = new THREE.Group();
    portalGroup.position.set(p.x, p.y, p.z);
    portalGroup.rotation.y = p.rotY;

    // Heavy concrete arch frame
    const frameGeo = new THREE.BoxGeometry(22, 12, 5);
    const frame = new THREE.Mesh(frameGeo, concreteMat);
    frame.position.y = 5.5;
    portalGroup.add(frame);
    collisions.push(new THREE.Box3().setFromObject(frame));

    // Signboard atop arch: "TÚNEL EL CÓNDOR"
    const signGeo = new THREE.BoxGeometry(14, 2.2, 0.5);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.6,
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 12.0, idx === 0 ? 2.6 : -2.6);
    portalGroup.add(sign);

    group.add(portalGroup);
  });

  // Tunnel interior curved vault ceiling
  const tunnelGeo = new THREE.CylinderGeometry(11, 11, 125, 18, 1, true, 0, Math.PI);
  tunnelGeo.rotateZ(Math.PI / 2);
  const tunnelVault = new THREE.Mesh(tunnelGeo, tileMat);
  tunnelVault.position.set(-225, 24.5, -315);
  tunnelVault.rotation.y = Math.PI * 0.25;
  group.add(tunnelVault);

  // Interior Yellow Strip Fluorescent Lights
  for (let s = -45; s <= 45; s += 22) {
    const lightGeo = new THREE.BoxGeometry(4, 0.2, 0.4);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 1.8,
    });
    const strip = new THREE.Mesh(lightGeo, lightMat);
    strip.position.set(-225 + s * 0.7, 30.5 - s * 0.1, -315 + s * 0.7);
    strip.rotation.y = Math.PI * 0.25;
    group.add(strip);
  }
}

function buildPetroMaxTruckStop(group: THREE.Group, collisions: THREE.Box3[]): THREE.Box3 {
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
  const neonMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 1.2 });
  const storeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  const asphaltPadMat = new THREE.MeshStandardMaterial({ color: 0x1e2126, roughness: 0.85 });

  // Main Concrete / Asphalt Pad (x: 180, z: -260)
  const padGeo = new THREE.BoxGeometry(75, 0.3, 75);
  const pad = new THREE.Mesh(padGeo, asphaltPadMat);
  pad.position.set(180, 0.2, -260);
  pad.receiveShadow = true;
  group.add(pad);

  // Large Gas Station Canopy Roof (32m x 22m)
  const canopyGeo = new THREE.BoxGeometry(32, 1.4, 22);
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.set(175, 7.0, -250);
  canopy.castShadow = true;
  group.add(canopy);

  // Canopy Fascia Sign "PETRO-MAX DIESEL 24H"
  const fasciaGeo = new THREE.BoxGeometry(20, 1.2, 0.3);
  const fascia = new THREE.Mesh(fasciaGeo, neonMat);
  fascia.position.set(175, 7.0, -238.8);
  group.add(fascia);

  // Canopy Support Columns
  [-11, 11].forEach((cx) => {
    [-7, 7].forEach((cz) => {
      const colGeo = new THREE.CylinderGeometry(0.5, 0.5, 6.5, 12);
      const col = new THREE.Mesh(colGeo, canopyMat);
      col.position.set(175 + cx, 3.5, -250 + cz);
      group.add(col);
      collisions.push(new THREE.Box3().setFromObject(col));
    });
  });

  // 4 Commercial Diesel Fuel Pumps with islands
  for (let i = -8; i <= 8; i += 16) {
    const islandGeo = new THREE.BoxGeometry(2.4, 0.4, 14);
    const island = new THREE.Mesh(islandGeo, storeMat);
    island.position.set(175 + i, 0.4, -250);
    group.add(island);

    [-3.5, 3.5].forEach((pz) => {
      const pumpGeo = new THREE.BoxGeometry(1.2, 2.5, 1.4);
      const pump = new THREE.Mesh(pumpGeo, canopyMat);
      pump.position.set(175 + i, 1.6, -250 + pz);
      group.add(pump);
      collisions.push(new THREE.Box3().setFromObject(pump));
    });
  }

  // Interactive Refueling & Repair Holographic Zone (pulsing green marker)
  const refuelZoneGeo = new THREE.RingGeometry(4.5, 5.0, 32);
  refuelZoneGeo.rotateX(-Math.PI / 2);
  const refuelZoneMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
  });
  const refuelRing = new THREE.Mesh(refuelZoneGeo, refuelZoneMat);
  refuelRing.position.set(175, 0.45, -250);
  group.add(refuelRing);

  // Convenience Store & Trucker Diner
  const storeGeo = new THREE.BoxGeometry(42, 9, 20);
  const store = new THREE.Mesh(storeGeo, storeMat);
  store.position.set(175, 4.8, -282);
  store.castShadow = true;
  group.add(store);
  collisions.push(new THREE.Box3().setFromObject(store));

  // Huge Fuel Price Billboard
  const signTowerGeo = new THREE.BoxGeometry(0.8, 14, 0.8);
  const signTower = new THREE.Mesh(signTowerGeo, canopyMat);
  signTower.position.set(150, 7.0, -225);
  group.add(signTower);
  collisions.push(new THREE.Box3().setFromObject(signTower));

  const signBoardGeo = new THREE.BoxGeometry(5.0, 4.0, 0.4);
  const signBoard = new THREE.Mesh(signBoardGeo, neonMat);
  signBoard.position.set(150, 12.0, -225);
  group.add(signBoard);

  // Return fuel station bounding box for refuel trigger detection
  return new THREE.Box3(
    new THREE.Vector3(158, 0, -265),
    new THREE.Vector3(192, 8, -235)
  );
}

function buildPacificContainerPort(group: THREE.Group, collisions: THREE.Box3[]) {
  const craneMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.6 });
  const containerColors = [0x2563eb, 0xdc2626, 0x059669, 0xd97706, 0x475569, 0x0284c7];

  // Port Concrete Pier (x: 285, z: 185)
  const pierGeo = new THREE.BoxGeometry(90, 1.2, 90);
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
  const pier = new THREE.Mesh(pierGeo, pierMat);
  pier.position.set(285, 0.6, 185);
  pier.receiveShadow = true;
  group.add(pier);

  // Massive Gantry Crane
  const gantryGeo = new THREE.BoxGeometry(6, 36, 6);
  const gantry = new THREE.Mesh(gantryGeo, craneMat);
  gantry.position.set(315, 18, 205);
  gantry.castShadow = true;
  group.add(gantry);
  collisions.push(new THREE.Box3().setFromObject(gantry));

  const boomGeo = new THREE.BoxGeometry(45, 3.2, 4);
  const boom = new THREE.Mesh(boomGeo, craneMat);
  boom.position.set(300, 32, 205);
  group.add(boom);

  // Stacks of Shipping Containers
  let colIdx = 0;
  for (let x = 265; x <= 305; x += 15) {
    for (let z = 150; z <= 180; z += 9) {
      const tiers = ((x + z) % 3) + 1;
      for (let h = 0; h < tiers; h++) {
        const cGeo = new THREE.BoxGeometry(5.8, 3.1, 12.0);
        const cMat = new THREE.MeshStandardMaterial({
          color: containerColors[colIdx % containerColors.length],
          metalness: 0.5,
          roughness: 0.45,
        });
        const container = new THREE.Mesh(cGeo, cMat);
        container.position.set(x, 1.8 + h * 3.1, z);
        container.castShadow = true;
        group.add(container);
        collisions.push(new THREE.Box3().setFromObject(container));
        colIdx++;
      }
    }
  }

  // Cargo Freighter Ship in ocean water
  const shipHullGeo = new THREE.BoxGeometry(26, 16, 95);
  const shipMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  const ship = new THREE.Mesh(shipHullGeo, shipMat);
  ship.position.set(345, 4.0, 195);
  group.add(ship);
  collisions.push(new THREE.Box3().setFromObject(ship));
}

function buildTitanQuarry(group: THREE.Group, collisions: THREE.Box3[]) {
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.95, flatShading: true });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.7 });

  // Heavy Mining Excavator
  const excavatorGroup = new THREE.Group();
  excavatorGroup.position.set(-345, 38.5, -345);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(6, 4.5, 7), steelMat);
  cab.position.y = 3.5;
  excavatorGroup.add(cab);

  const tracks = new THREE.Mesh(new THREE.BoxGeometry(7.5, 2, 9), new THREE.MeshStandardMaterial({ color: 0x18181b }));
  tracks.position.y = 1;
  excavatorGroup.add(tracks);

  // Boom Arm
  const boom = new THREE.Mesh(new THREE.BoxGeometry(1.5, 12, 1.5), steelMat);
  boom.position.set(0, 8, -4);
  boom.rotation.x = -Math.PI / 4;
  excavatorGroup.add(boom);

  group.add(excavatorGroup);
  collisions.push(new THREE.Box3().setFromObject(excavatorGroup));

  // Gravel Hopper Silos
  [-325, -305].forEach((sx) => {
    const siloGeo = new THREE.CylinderGeometry(5.0, 5.0, 16, 16);
    const siloMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.4 });
    const silo = new THREE.Mesh(siloGeo, siloMat);
    silo.position.set(sx, 44, -385);
    silo.castShadow = true;
    group.add(silo);
    collisions.push(new THREE.Box3().setFromObject(silo));
  });

  // Giant Mountain Boulders
  const boulders = [
    { x: -350, y: 39, z: -325, r: 7.5 },
    { x: -290, y: 31, z: -270, r: 5.5 },
    { x: -360, y: 41, z: -365, r: 8.5 },
  ];
  boulders.forEach((b) => {
    const bMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(b.r, 1), rockMat);
    bMesh.position.set(b.x, b.y, b.z);
    bMesh.castShadow = true;
    group.add(bMesh);
    collisions.push(new THREE.Box3().setFromObject(bMesh));
  });
}

function buildRedwoodSawmill(group: THREE.Group, collisions: THREE.Box3[]) {
  const woodLogMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
  const shedMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });

  // Wooden Processing Shed
  const shedGeo = new THREE.BoxGeometry(26, 9, 36);
  const shed = new THREE.Mesh(shedGeo, shedMat);
  shed.position.set(-395, 10.5, 190);
  shed.castShadow = true;
  group.add(shed);
  collisions.push(new THREE.Box3().setFromObject(shed));

  // Timber Log Piles
  for (let s = -12; s <= 12; s += 8) {
    const logGeo = new THREE.CylinderGeometry(0.8, 0.8, 12, 10);
    logGeo.rotateZ(Math.PI / 2);
    for (let layer = 0; layer < 3; layer++) {
      const log = new THREE.Mesh(logGeo, woodLogMat);
      log.position.set(-365, 7.0 + layer * 1.4, 180 + s);
      log.castShadow = true;
      group.add(log);
    }
  }
}

function buildMetroLogisticsHub(group: THREE.Group, collisions: THREE.Box3[]) {
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.4 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });

  // Main Depot Distribution Facility
  const bldg = new THREE.Mesh(new THREE.BoxGeometry(50, 14, 75), hubMat);
  bldg.position.set(45, 7.5, -20);
  bldg.castShadow = true;
  group.add(bldg);
  collisions.push(new THREE.Box3().setFromObject(bldg));

  // Loading Dock Bay Portals (Bay 1 to 4)
  for (let i = -24; i <= 24; i += 16) {
    const bay = new THREE.Mesh(new THREE.BoxGeometry(2.5, 7, 10), roofMat);
    bay.position.set(19.0, 3.8, -20 + i);
    group.add(bay);
  }

  // Concrete Staging Pad
  const pad = new THREE.Mesh(new THREE.BoxGeometry(65, 0.3, 95), padMat);
  pad.position.set(0, 0.2, -20);
  pad.receiveShadow = true;
  group.add(pad);
}

function buildHighwayGuardrails(group: THREE.Group, points: THREE.Vector3[]) {
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.85,
    roughness: 0.25,
  });

  // Guardrails along mountain passes & bridge edges
  for (let i = 0; i < points.length; i += 3) {
    const pt = points[i];
    // Put guardrail if high elevation OR near canyon
    if (pt.y > 4.5) {
      const nextPt = points[(i + 1) % points.length];
      const forward = new THREE.Vector3().subVectors(nextPt, pt).normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      // Outside cliff shoulder
      const railPos = new THREE.Vector3().copy(pt).addScaledVector(right, 8.2);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 8), railMat);
      post.position.set(railPos.x, pt.y + 0.7, railPos.z);
      group.add(post);

      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.45, 5.0), railMat);
      beam.position.set(railPos.x, pt.y + 0.9, railPos.z);
      beam.lookAt(new THREE.Vector3().copy(railPos).add(forward));
      group.add(beam);
    }
  }
}

function buildOverheadSigns(group: THREE.Group) {
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });

  // 1. Gantry sign toward Pacific Container Port (x: 180, z: 110)
  const gantryGroup1 = new THREE.Group();
  gantryGroup1.position.set(180, 0.5, 110);

  // Vertical Posts
  [-8.5, 8.5].forEach((offset) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 10, 12), steelMat);
    post.position.set(0, 5, offset);
    gantryGroup1.add(post);
  });
  // Cross Truss
  const truss = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 18), steelMat);
  truss.position.set(0, 9.5, 0);
  gantryGroup1.add(truss);

  // Sign Plate
  const signTex = ProceduralTextures.getHighwaySignTexture('PUERTO DE CONTENEDORES', 'SALIDA 4 - 500m', 'right');
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 3.2, 7.5),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })
  );
  signBoard.position.set(0, 8.2, 2.5);
  gantryGroup1.add(signBoard);

  group.add(gantryGroup1);
}

function buildFloraAndLights(
  group: THREE.Group,
  lampMaterials: THREE.MeshStandardMaterial[],
  lampLights: THREE.PointLight[]
) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
  const broadleafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });

  // Scattered trees perfectly anchored to exact ground height
  const treeLocations = [
    { x: -50, z: -80 }, { x: -90, z: -60 }, { x: 70, z: -100 }, { x: 120, z: -70 },
    { x: 40, z: 100 }, { x: 90, z: 150 }, { x: -170, z: 120 }, { x: -280, z: 110 },
    { x: -330, z: 90 }, { x: -240, z: -40 }, { x: -160, z: -50 }, { x: -50, z: 150 },
    { x: 20, z: 190 }, { x: 180, z: 30 }, { x: 230, z: -160 }, { x: -120, z: -320 },
    { x: -210, z: -160 }, { x: -250, z: -100 }, { x: -130, z: 80 }, { x: 110, z: -200 }
  ];

  treeLocations.forEach((pos, idx) => {
    const groundY = WorldTerrainSystem.getGroundElevation(pos.x, pos.z);
    const isPine = idx % 2 === 0;

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 3.0, 8), trunkMat);
    trunk.position.set(pos.x, groundY + 1.5, pos.z);
    trunk.castShadow = true;
    group.add(trunk);

    if (isPine) {
      const pine = new THREE.Mesh(new THREE.ConeGeometry(2.8, 6.5, 8), pineMat);
      pine.position.set(pos.x, groundY + 5.5, pos.z);
      pine.castShadow = true;
      group.add(pine);
    } else {
      const oak = new THREE.Mesh(new THREE.SphereGeometry(3.2, 8, 8), broadleafMat);
      oak.position.set(pos.x, groundY + 4.8, pos.z);
      oak.castShadow = true;
      group.add(oak);
    }
  });

  // Highway streetlamps
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
  for (let z = -220; z <= 120; z += 50) {
    const groundY = WorldTerrainSystem.getGroundElevation(9.5, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 8.5, 8), poleMat);
    pole.position.set(9.5, groundY + 4.25, z);
    group.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 0.2), poleMat);
    arm.position.set(8.0, groundY + 8.4, z);
    group.add(arm);

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff7ed,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.2,
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), bulbMat);
    bulb.position.set(6.6, groundY + 8.1, z);
    group.add(bulb);
    lampMaterials.push(bulbMat);

    if (Math.abs(z) % 100 === 0) {
      const pLight = new THREE.PointLight(0xffedd5, 0, 38, 1.8);
      pLight.position.set(6.6, groundY + 7.9, z);
      group.add(pLight);
      lampLights.push(pLight);
    }
  }
}
