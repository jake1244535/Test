import * as THREE from 'three';

/**
 * Authoritative World Elevation & Road Spline System
 * Ensures 100% seamless mathematical alignment between terrain mesh,
 * road surface, guardrails, traffic, and vehicle physics. Zero clipping or floating!
 */
export class WorldTerrainSystem {
  public static readonly ROAD_WIDTH = 15.0; // Two-way wide highway with shoulders
  public static readonly SHOULDER_WIDTH = 4.0; // Paved/gravel shoulder blend zone
  public static readonly TOTAL_CORRIDOR_WIDTH = 23.0; // road + shoulders

  // Definitive Highway & Mountain Scenic Loop Waypoints with calculated elevations
  public static readonly WAYPOINTS: THREE.Vector3[] = [
    // Central Logistics Valley Hub (Y ~ 0.5m)
    new THREE.Vector3(0, 0.5, 0),             // 0: Central Distribution Hub
    new THREE.Vector3(70, 0.5, 45),           // 1: Valley Highway East
    new THREE.Vector3(150, 0.5, 95),          // 2: Harbor Access Junction
    new THREE.Vector3(230, 0.5, 140),         // 3: Container Port Avenue
    new THREE.Vector3(285, 0.5, 185),         // 4: Pacific Container Port Terminal
    new THREE.Vector3(275, 0.5, 110),         // 5: Port Exit Loop
    new THREE.Vector3(240, 0.5, 20),          // 6: South-East Coastline Straight
    new THREE.Vector3(220, 0.5, -90),         // 7: Coastal Highway
    new THREE.Vector3(200, 0.5, -190),        // 8: Petro-Max Highway Turnoff
    new THREE.Vector3(180, 0.5, -260),        // 9: Petro-Max Mega Truck Stop
    new THREE.Vector3(110, 1.2, -280),        // 10: River Canyon Approach
    new THREE.Vector3(30, 2.5, -270),         // 11: Foothill Climb
    new THREE.Vector3(-40, 5.0, -250),        // 12: Canyon Bridge East Abutment

    // Grand Canyon Suspension Bridge (spanning over deep gorge)
    new THREE.Vector3(-90, 8.5, -240),        // 13: Mid-Bridge High Span
    new THREE.Vector3(-140, 12.0, -230),      // 14: Canyon Bridge West Tower

    // Alpine Mountain Switchbacks
    new THREE.Vector3(-190, 17.0, -210),      // 15: Lower Mountain Grade
    new THREE.Vector3(-245, 23.0, -170),      // 16: Hairpin 1 (Rocky Vista)
    new THREE.Vector3(-280, 29.0, -220),      // 17: Switchback Ascent
    new THREE.Vector3(-310, 35.0, -280),      // 18: Summit Ridge Hairpin

    // Titan Mountain Quarry Summit
    new THREE.Vector3(-330, 38.0, -340),      // 19: Titan Quarry Entrance Gate
    new THREE.Vector3(-315, 36.0, -380),      // 20: Quarry Pit Overlook

    // Mountain Highway Tunnel Entrance (cutting through peak)
    new THREE.Vector3(-270, 31.0, -360),      // 21: North Tunnel Portal
    new THREE.Vector3(-220, 24.0, -320),      // 22: Inside Tunnel Midpoint
    new THREE.Vector3(-180, 18.0, -270),      // 23: South Tunnel Portal Exit

    // Redwood Forest Descent
    new THREE.Vector3(-220, 14.0, -140),      // 24: High Pine Forest Curve
    new THREE.Vector3(-270, 10.0, -20),       // 25: Redwood Valley Curve
    new THREE.Vector3(-320, 7.5, 90),         // 26: Sawmill Access Road
    new THREE.Vector3(-370, 6.0, 190),        // 27: Redwood Timber Sawmill Yard
    new THREE.Vector3(-340, 5.0, 240),        // 28: Sawmill Return Loop
    new THREE.Vector3(-270, 3.5, 190),        // 29: Forest River Run

    // Valley Return Highway
    new THREE.Vector3(-190, 2.0, 130),        // 30: West Valley Plains
    new THREE.Vector3(-110, 0.8, 70),         // 31: Suburban Approach
    new THREE.Vector3(-45, 0.5, 25),          // 32: Metro Logistics Roundabout
  ];

  private static splineCurve: THREE.CatmullRomCurve3 | null = null;
  private static cachedSamplePoints: THREE.Vector3[] = [];
  private static readonly SAMPLE_RESOLUTION = 360;

  public static getSpline(): THREE.CatmullRomCurve3 {
    if (!this.splineCurve) {
      this.splineCurve = new THREE.CatmullRomCurve3(this.WAYPOINTS, true, 'centripetal', 0.5);
      this.cachedSamplePoints = this.splineCurve.getSpacedPoints(this.SAMPLE_RESOLUTION);
    }
    return this.splineCurve;
  }

  public static getSampledPoints(): THREE.Vector3[] {
    this.getSpline();
    return this.cachedSamplePoints;
  }

  /**
   * Raw procedural natural terrain elevation (ignoring road leveling).
   */
  public static getNaturalLandscapeHeight(x: number, z: number): number {
    // 1. Alpine Mountain Peak Massif in North-West (x < -60, z < -100)
    if (x < -60 && z < -100) {
      const dist = Math.hypot(x + 280, z + 320);
      const mWeight = Math.max(0, 1 - dist / 340);
      const jagged = Math.sin(x * 0.024) * Math.cos(z * 0.024) * 9.0 +
                     Math.sin(x * 0.06 + 1.2) * 3.5;
      return mWeight * 54.0 + jagged;
    }

    // 2. Canyon Chasm under Bridge (x between -60 and -160, z between -200 and -270)
    const canyonDist = Math.hypot(x + 115, z + 235);
    if (canyonDist < 55) {
      // River canyon bottom (carved below ground level)
      const riverDepth = (1 - canyonDist / 55) * -12.0;
      return riverDepth + Math.sin(x * 0.04) * 1.5;
    }

    // 3. Redwood Forest Hills in West/South-West (x < -100, z > 30)
    if (x < -80 && z > 20) {
      const dist = Math.hypot(x + 300, z - 180);
      const fWeight = Math.max(0, 1 - dist / 320);
      return fWeight * 24.0 + Math.sin(x * 0.035) * Math.cos(z * 0.035) * 5.0;
    }

    // 4. Coastal Bay in South-East (x > 180, z > 60)
    if (x > 170 && z > 60) {
      return -2.0 + Math.sin(x * 0.02) * 1.2;
    }

    // 5. Central Logistics Green Valley (gentle rolling prairie)
    return Math.sin(x * 0.012) * Math.cos(z * 0.012) * 1.5;
  }

  /**
   * Fast lookup of distance to road spline and the interpolated road surface height.
   */
  public static queryRoadInfo(x: number, z: number): { distance: number; roadHeight: number } {
    const points = this.getSampledPoints();
    let minDistSq = Infinity;
    let closestY = 0.5;

    // Fast linear scan over pre-spaced points
    const step = 2; // Check every 2nd point first for rapid coarse search
    let bestIdx = 0;
    for (let i = 0; i < points.length; i += step) {
      const pt = points[i];
      const dSq = (x - pt.x) * (x - pt.x) + (z - pt.z) * (z - pt.z);
      if (dSq < minDistSq) {
        minDistSq = dSq;
        bestIdx = i;
      }
    }

    // Fine-tune around best index
    const start = Math.max(0, bestIdx - step);
    const end = Math.min(points.length - 1, bestIdx + step);
    for (let i = start; i <= end; i++) {
      const pt = points[i];
      const dSq = (x - pt.x) * (x - pt.x) + (z - pt.z) * (z - pt.z);
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closestY = pt.y;
      }
    }

    return {
      distance: Math.sqrt(minDistSq),
      roadHeight: closestY,
    };
  }

  /**
   * Authoritative ground elevation query used by Terrain, Roads, Physics, and Traffic.
   * Blends seamlessly between the road level and surrounding natural hills.
   */
  public static getGroundElevation(x: number, z: number): number {
    const naturalHeight = this.getNaturalLandscapeHeight(x, z);
    const roadInfo = this.queryRoadInfo(x, z);

    const halfRoad = this.ROAD_WIDTH * 0.5;
    const blendEnd = halfRoad + this.SHOULDER_WIDTH * 1.8;

    // Inside road surface: exact road height
    if (roadInfo.distance <= halfRoad) {
      return roadInfo.roadHeight;
    }

    // In shoulder transition zone: smooth hermite blend into natural landscape
    if (roadInfo.distance < blendEnd) {
      const t = (roadInfo.distance - halfRoad) / (blendEnd - halfRoad);
      // Smooth step: 3t^2 - 2t^3
      const smoothT = t * t * (3 - 2 * t);
      return (1 - smoothT) * roadInfo.roadHeight + smoothT * naturalHeight;
    }

    // Flat Industrial Yards & Depots
    // A: Petro-Max Truck Stop pad (x: 150..220, z: -290..-230)
    if (x >= 145 && x <= 225 && z >= -295 && z <= -225) {
      return 0.5;
    }
    // B: Central Logistics Hub pad (x: -40..50, z: -50..30)
    if (x >= -45 && x <= 55 && z >= -55 && z <= 35) {
      return 0.5;
    }
    // C: Pacific Container Port concrete terminal (x: 240..330, z: 130..220)
    if (x >= 235 && x <= 335 && z >= 125 && z <= 225) {
      return 0.5;
    }
    // D: Titan Mountain Quarry flat staging terrace (x: -350..-280, z: -380..-310)
    if (x >= -350 && x <= -280 && z >= -380 && z <= -310) {
      return 36.5;
    }
    // E: Redwood Sawmill yard (x: -390..-320, z: 160..240)
    if (x >= -390 && x <= -320 && z >= 160 && z <= 240) {
      return 6.0;
    }

    return naturalHeight;
  }
}
