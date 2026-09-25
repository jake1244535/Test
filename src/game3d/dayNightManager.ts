import * as THREE from 'three';

export interface DayNightState {
  timeHours: number; // 0.0 to 24.0
  timeString: string;
  periodName: 'Amanecer' | 'Mediodía' | 'Atardecer' | 'Noche' | 'Medianoche';
  isNight: boolean;
  ambientIntensity: number;
  sunIntensity: number;
  sunColor: THREE.Color;
  skyColor: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
}

export class DayNightCycleManager {
  public timeHours: number = 14.5; // Start around mid-afternoon (good light)
  public timeSpeed: number = 0.08; // 24h cycle in ~5 minutes, or manual advance
  public isPaused: boolean = false;

  private sunLight: THREE.DirectionalLight;
  private moonLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private skyMesh: THREE.Mesh;
  private starsParticles: THREE.Points;
  private scene: THREE.Scene;

  // Street lamps collection to toggle on/off
  private streetLampsMaterials: THREE.MeshStandardMaterial[] = [];
  private streetLampsPointLights: THREE.PointLight[] = [];

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;

    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(this.ambientLight);

    // Hemisphere light for ground bounce vs sky
    this.hemiLight = new THREE.HemisphereLight(0xbfdbfe, 0x3f3f46, 0.4);
    scene.add(this.hemiLight);

    // Sun directional light
    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.25);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 600;
    this.sunLight.shadow.camera.left = -160;
    this.sunLight.shadow.camera.right = 160;
    this.sunLight.shadow.camera.top = 160;
    this.sunLight.shadow.camera.bottom = -160;
    this.sunLight.shadow.bias = -0.0005;
    scene.add(this.sunLight);

    // Moon directional light (colder, softer)
    this.moonLight = new THREE.DirectionalLight(0x7dd3fc, 0.3);
    this.moonLight.castShadow = false; // Save performance
    scene.add(this.moonLight);

    // Sky Dome
    const skyGeo = new THREE.SphereGeometry(1200, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      side: THREE.BackSide,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(this.skyMesh);

    // Starfield
    const starCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1150;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 50; // upper hemisphere
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.5,
      transparent: true,
      opacity: 0,
    });
    this.starsParticles = new THREE.Points(starGeo, starMat);
    scene.add(this.starsParticles);

    // Initial scene fog
    scene.fog = new THREE.FogExp2(0xdbeafe, 0.0016);

    this.updateAtmosphere(0);
  }

  public registerStreetLamp(lampMat: THREE.MeshStandardMaterial, pointLight?: THREE.PointLight) {
    this.streetLampsMaterials.push(lampMat);
    if (pointLight) {
      this.streetLampsPointLights.push(pointLight);
    }
  }

  public setTime(hours: number) {
    this.timeHours = (hours % 24 + 24) % 24;
    this.updateAtmosphere(0);
  }

  public addHours(deltaHours: number) {
    this.setTime(this.timeHours + deltaHours);
  }

  public update(deltaSeconds: number, targetPosition: THREE.Vector3): DayNightState {
    if (!this.isPaused) {
      this.timeHours += deltaSeconds * this.timeSpeed;
      if (this.timeHours >= 24) this.timeHours -= 24;
    }

    return this.updateAtmosphere(deltaSeconds, targetPosition);
  }

  private updateAtmosphere(deltaSeconds: number, targetPosition?: THREE.Vector3): DayNightState {
    const t = this.timeHours;

    // Center directional lights and skybox on target player
    if (targetPosition) {
      this.skyMesh.position.copy(targetPosition);
      this.starsParticles.position.copy(targetPosition);
      this.sunLight.target.position.copy(targetPosition);
      this.sunLight.target.updateMatrixWorld();
    }

    // Calculate sun and moon angles (0h = midnight, 6h = sunrise, 12h = noon, 18h = sunset)
    const sunAngle = ((t - 6) / 24) * Math.PI * 2;
    const sunDist = 300;
    const sunX = Math.cos(sunAngle) * sunDist;
    const sunY = Math.sin(sunAngle) * sunDist;
    const sunZ = Math.sin(sunAngle * 0.5) * 80;

    const basePos = targetPosition ? targetPosition : new THREE.Vector3(0, 0, 0);
    this.sunLight.position.set(basePos.x + sunX, basePos.y + sunY, basePos.z + sunZ);
    this.moonLight.position.set(basePos.x - sunX, basePos.y - sunY, basePos.z - sunZ);

    const isSunUp = sunY > 0;
    const sunElevation = Math.max(0, sunY / sunDist); // 0 (horizon) to 1 (zenith)
    const isNight = t < 6.0 || t > 19.5;

    let periodName: 'Amanecer' | 'Mediodía' | 'Atardecer' | 'Noche' | 'Medianoche' = 'Mediodía';
    let skyColor = new THREE.Color(0x38bdf8);
    let sunColor = new THREE.Color(0xfff7ed);
    let fogColor = new THREE.Color(0xdbeafe);
    let ambientInt = 0.45;
    let sunInt = 1.25;
    let starOpacity = 0;

    if (t >= 5.5 && t < 7.5) {
      // Sunrise
      periodName = 'Amanecer';
      const progress = (t - 5.5) / 2.0;
      skyColor.setHSL(0.08, 0.85, 0.45 + progress * 0.25);
      sunColor.setHSL(0.09, 0.95, 0.65);
      fogColor.setHSL(0.08, 0.6, 0.55 + progress * 0.2);
      ambientInt = 0.25 + progress * 0.2;
      sunInt = 0.4 + progress * 0.7;
      starOpacity = Math.max(0, 1 - progress * 2);
    } else if (t >= 7.5 && t < 17.5) {
      // Day
      periodName = 'Mediodía';
      skyColor.setHSL(0.58, 0.7, 0.62);
      sunColor.setHSL(0.12, 0.2, 0.95);
      fogColor.setHSL(0.58, 0.4, 0.8);
      ambientInt = 0.45;
      sunInt = 1.35;
      starOpacity = 0;
    } else if (t >= 17.5 && t < 20.0) {
      // Golden hour to Sunset
      periodName = 'Atardecer';
      const progress = (t - 17.5) / 2.5;
      skyColor.setHSL(0.05, 0.9, 0.45 - progress * 0.25);
      sunColor.setHSL(0.06, 0.95, 0.6);
      fogColor.setHSL(0.05, 0.75, 0.45 - progress * 0.2);
      ambientInt = 0.45 - progress * 0.3;
      sunInt = Math.max(0.1, 1.25 - progress * 1.15);
      starOpacity = progress * 0.8;
    } else {
      // Night / Midnight
      periodName = t > 23 || t < 2 ? 'Medianoche' : 'Noche';
      skyColor.setHSL(0.62, 0.65, 0.04);
      sunColor.setHSL(0.6, 0.3, 0.1);
      fogColor.setHSL(0.62, 0.5, 0.06);
      ambientInt = 0.12;
      sunInt = 0.0;
      starOpacity = 1.0;
    }

    // Apply colors and intensities
    this.ambientLight.intensity = ambientInt;
    this.ambientLight.color.copy(skyColor);
    this.hemiLight.color.copy(skyColor);
    this.hemiLight.intensity = isNight ? 0.12 : 0.4;

    this.sunLight.intensity = isSunUp ? sunInt : 0.0;
    this.sunLight.color.copy(sunColor);

    this.moonLight.intensity = isNight ? 0.35 : 0.0;

    (this.skyMesh.material as THREE.MeshBasicMaterial).color.copy(skyColor);
    (this.starsParticles.material as THREE.PointsMaterial).opacity = starOpacity;

    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(fogColor);
      this.scene.fog.density = isNight ? 0.0022 : 0.0015;
    }

    // Toggle street lamps and building windows based on night
    const lampEmissive = isNight ? new THREE.Color(0xffb703) : new THREE.Color(0x000000);
    const lampEmissiveInt = isNight ? 1.5 : 0;
    for (const mat of this.streetLampsMaterials) {
      mat.emissive.copy(lampEmissive);
      mat.emissiveIntensity = lampEmissiveInt;
    }
    for (const pLight of this.streetLampsPointLights) {
      pLight.intensity = isNight ? 2.5 : 0;
    }

    // Formatted time string
    const hrs = Math.floor(t);
    const mins = Math.floor((t - hrs) * 60);
    const timeString = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

    return {
      timeHours: t,
      timeString,
      periodName,
      isNight,
      ambientIntensity: ambientInt,
      sunIntensity: sunInt,
      sunColor,
      skyColor,
      fogColor,
      fogDensity: isNight ? 0.0022 : 0.0015,
    };
  }
}
