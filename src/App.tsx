import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  TruckPhysicsState,
  DrivingControls,
  CameraMode,
  TrafficLevel,
  GameMode,
  PlayerSaveData,
  MissionContract,
  TruckModel,
  TrailerModel,
  TrailerType,
  Achievement,
  DayNightInfo
} from './types/game';
import {
  TRUCK_MODELS,
  TRAILER_MODELS,
  DEFAULT_MISSIONS,
  INITIAL_ACHIEVEMENTS,
  INITIAL_PLAYER_DATA
} from './data/gameData';
import * as THREE from 'three';
import { SceneManager, WeatherMode } from './game3d/SceneManager';
import { TruckPhysicsEngine } from './game3d/physicsEngine';
import { audioEngine } from './audio/audioEngine';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { MissionsModal } from './components/MissionsModal';
import { DealershipModal } from './components/DealershipModal';
import { GarageModal } from './components/GarageModal';
import { TrailerPickerModal } from './components/TrailerPickerModal';
import { AchievementsModal } from './components/AchievementsModal';
import { SettingsModal } from './components/SettingsModal';

const SAVE_STORAGE_KEY = 'heavy_haul_3d_save_v1';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const physicsEngineRef = useRef<TruckPhysicsEngine | null>(null);

  // Game Lifecycle States
  const [inGame, setInGame] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<GameMode>('career');

  // Modals
  const [showMissions, setShowMissions] = useState<boolean>(false);
  const [showDealership, setShowDealership] = useState<boolean>(false);
  const [showGarage, setShowGarage] = useState<boolean>(false);
  const [showTrailers, setShowTrailers] = useState<boolean>(false);
  const [showAchievements, setShowAchievements] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Player Saved Progression
  const [playerData, setPlayerData] = useState<PlayerSaveData>(() => {
    try {
      const saved = localStorage.getItem(SAVE_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return INITIAL_PLAYER_DATA;
  });

  // Active Vehicle Selection
  const currentTruck: TruckModel =
    TRUCK_MODELS.find((t) => t.id === playerData.currentTruckId) || TRUCK_MODELS[0];
  const currentTrailer: TrailerModel =
    TRAILER_MODELS.find((t) => t.id === playerData.activeTrailer) || TRAILER_MODELS[1];
  const currentUpgrades = playerData.truckUpgrades[currentTruck.id] || {
    engine: 0,
    brakes: 0,
    suspension: 0,
    tires: 0,
    paintColor: currentTruck.defaultColor,
  };

  // Missions & Achievements
  const [activeMission, setActiveMission] = useState<MissionContract | null>(null);
  const [canDeliverCargo, setCanDeliverCargo] = useState<boolean>(false);
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    return INITIAL_ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: !!playerData.achievements[a.id],
    }));
  });

  // Driving Controls State
  const [controls, setControls] = useState<DrivingControls>({
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    gear: 'D',
    lights: 'off',
    blinkers: 'off',
    horn: false,
    engineStarted: true,
  });
  const controlsRef = useRef<DrivingControls>(controls);
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  // Physics Output State for HUD
  const [physicsState, setPhysicsState] = useState<TruckPhysicsState>({
    x: 0,
    y: 0.5,
    z: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
    speedKmh: 0,
    rpm: 750,
    currentGearRatioIndex: 1,
    lateralG: 0,
    isRolledOver: false,
    trailerCoupled: true,
    trailerYaw: 0,
    trailerPitch: 0,
    trailerRoll: 0,
    trailerX: 0,
    trailerY: 0.5,
    trailerZ: -5,
    suspensionOffsetLF: 0,
    suspensionOffsetRF: 0,
    suspensionOffsetLR: 0,
    suspensionOffsetRR: 0,
    damage: 0,
    fuel: 100,
  });

  // Camera & Audio & Day/Night
  const [cameraMode, setCameraMode] = useState<CameraMode>('third_person');
  const [radioStation, setRadioStation] = useState<number>(playerData.settings.musicTrack);
  const [sfxVolume, setSfxVolume] = useState<number>(playerData.settings.soundVolume);
  const [radioVolume, setRadioVolume] = useState<number>(playerData.settings.radioVolume);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [dayNightInfo, setDayNightInfo] = useState<DayNightInfo | null>(null);
  const [currentWeather, setCurrentWeather] = useState<WeatherMode>('clear');
  const [isNearFuelStation, setIsNearFuelStation] = useState<boolean>(false);

  // Auto-save helper
  const persistPlayerData = useCallback((updated: PlayerSaveData) => {
    setPlayerData(updated);
    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, []);

  // Unlock Achievement helper
  const unlockAchievement = useCallback(
    (id: string) => {
      setAchievements((prev) => {
        const found = prev.find((a) => a.id === id);
        if (!found || found.unlocked) return prev;

        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
        audioEngine.playSuccessChime();

        persistPlayerData({
          ...playerData,
          money: playerData.money + found.rewardCash,
          achievements: { ...playerData.achievements, [id]: true },
        });

        return prev.map((a) => (a.id === id ? { ...a, unlocked: true } : a));
      });
    },
    [persistPlayerData, playerData]
  );

  // Initialize Three.js and Physics Engine
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const sceneMgr = new SceneManager(canvasContainerRef.current);
    sceneManagerRef.current = sceneMgr;

    const physEngine = new TruckPhysicsEngine(
      currentTruck,
      currentTrailer,
      currentUpgrades,
      playerData.cargoLoadPercent
    );
    physicsEngineRef.current = physEngine;

    sceneMgr.spawnTruck(currentTruck, currentTrailer, currentUpgrades, playerData.cargoLoadPercent);
    sceneMgr.setTrafficLevel(playerData.settings.trafficLevel);

    // Audio init
    audioEngine.init();
    audioEngine.setRadioStation(playerData.settings.musicTrack);
    audioEngine.setVolumes(playerData.settings.soundVolume, playerData.settings.radioVolume);

    // Main animation frame tick callback
    sceneMgr.setOnFrameCallback((dt) => {
      const activeControls = controlsRef.current;
      const p = physEngine.update(dt, activeControls);
      setPhysicsState(p);

      // Audio engine update
      audioEngine.updateEngineSound(p.rpm, activeControls.throttle, activeControls.engineStarted);

      // Sync 3D model transforms & day-night cycle
      sceneMgr.updateVehicleVisuals(p, activeControls, currentTruck, currentUpgrades, dt);

      // Read current day/night atmosphere state
      const dn = sceneMgr.getDayNightState();
      if (dn) {
        setDayNightInfo({
          timeHours: dn.timeHours,
          timeString: dn.timeString,
          periodName: dn.periodName,
          isNight: dn.isNight,
        });

        // Automatic headlights toggle for player truck if night falls
        if (dn.isNight && controls.lights === 'off') {
          setControls((c) => (c.lights === 'off' ? { ...c, lights: 'low' } : c));
        }
      }

      // Check distance to active mission delivery point
      if (activeMission) {
        const dist = Math.hypot(p.x - activeMission.dropoffLocation.x, p.z - activeMission.dropoffLocation.z);
        if (dist < 18) {
          setCanDeliverCargo(true);
        } else {
          setCanDeliverCargo(false);
        }
      }

      // Check proximity to Petro-Max Fuel Station
      const fuelZone = sceneMgr.getFuelStationZone();
      const nearFuel = fuelZone.containsPoint(new THREE.Vector3(p.x, p.y, p.z));
      setIsNearFuelStation(nearFuel);

      // Check speed achievement
      if (p.speedKmh > 95) {
        unlockAchievement('speed_demon');
      }

      // Check rollover event
      if (p.isRolledOver) {
        audioEngine.playCrash();
      }
    });

    return () => {
      sceneMgr.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update 3D truck when truck model, upgrades, or trailer change
  useEffect(() => {
    if (!sceneManagerRef.current || !physicsEngineRef.current) return;

    physicsEngineRef.current.setTruck(currentTruck, currentUpgrades);
    physicsEngineRef.current.setTrailer(currentTrailer, playerData.cargoLoadPercent);
    sceneManagerRef.current.spawnTruck(currentTruck, currentTrailer, currentUpgrades, playerData.cargoLoadPercent);
  }, [currentTruck, currentTrailer, currentUpgrades, playerData.cargoLoadPercent]);

  // Update Waypoint in 3D world when active mission changes
  useEffect(() => {
    if (!sceneManagerRef.current) return;
    if (activeMission) {
      sceneManagerRef.current.setObjectiveWaypoint({
        x: activeMission.dropoffLocation.x,
        z: activeMission.dropoffLocation.z,
      });
    } else {
      sceneManagerRef.current.setObjectiveWaypoint(null);
    }
  }, [activeMission]);

  // Keyboard input management
  useEffect(() => {
    const activeKeys = new Set<string>();

    const updateControlsFromKeys = () => {
      let t = 0;
      let b = 0;
      let s = 0;

      if (activeKeys.has('KeyW') || activeKeys.has('ArrowUp')) t = 1;
      if (activeKeys.has('KeyS') || activeKeys.has('ArrowDown')) b = 1;
      if (activeKeys.has('KeyA') || activeKeys.has('ArrowLeft')) s = -1;
      if (activeKeys.has('KeyD') || activeKeys.has('ArrowRight')) s = 1;

      const space = activeKeys.has('Space');
      const hornKey = activeKeys.has('KeyH');

      setControls((prev) => {
        // Play air brake sound when releasing heavy braking
        if (prev.brake > 0.5 && b === 0) {
          audioEngine.playAirBrake();
        }

        // Horn audio toggle
        if (!prev.horn && hornKey) {
          audioEngine.setHorn(true);
        } else if (prev.horn && !hornKey) {
          audioEngine.setHorn(false);
        }

        return {
          ...prev,
          throttle: t,
          brake: b,
          steer: s,
          handbrake: space,
          horn: hornKey,
        };
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Resume audio context on first key press
      audioEngine.resume();

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      // Hotkey single triggers
      if (e.code === 'KeyG' && !e.repeat) {
        // Cycle Transmission Gear: D -> N -> R -> L -> D
        setControls((prev) => {
          const gears: Array<'D' | 'N' | 'R' | 'L'> = ['D', 'N', 'R', 'L'];
          const nextIdx = (gears.indexOf(prev.gear) + 1) % gears.length;
          return { ...prev, gear: gears[nextIdx] };
        });
        return;
      }

      if (e.code === 'KeyC' && !e.repeat) {
        // Cycle Camera Mode
        setCameraMode((prev) => {
          const modes: CameraMode[] = ['third_person', 'first_person', 'second_person', 'orbit'];
          const next = modes[(modes.indexOf(prev) + 1) % modes.length];
          sceneManagerRef.current?.setCameraMode(next);
          return next;
        });
        return;
      }

      if (e.code === 'KeyL' && !e.repeat) {
        // Toggle Headlights: off -> low -> high -> off
        setControls((prev) => {
          const next = prev.lights === 'off' ? 'low' : prev.lights === 'low' ? 'high' : 'off';
          return { ...prev, lights: next };
        });
        return;
      }

      if (e.code === 'KeyQ' && !e.repeat) {
        // Turn signal Left
        setControls((prev) => ({ ...prev, blinkers: prev.blinkers === 'left' ? 'off' : 'left' }));
        return;
      }

      if (e.code === 'KeyE' && !e.repeat) {
        // Turn signal Right
        setControls((prev) => ({ ...prev, blinkers: prev.blinkers === 'right' ? 'off' : 'right' }));
        return;
      }

      if (e.code === 'KeyX' && !e.repeat) {
        // Hazard flashers
        setControls((prev) => ({ ...prev, blinkers: prev.blinkers === 'hazard' ? 'off' : 'hazard' }));
        return;
      }

      if (e.code === 'KeyR' && !e.repeat) {
        // Reset upright
        handleResetUpright();
        return;
      }

      activeKeys.add(e.code);
      updateControlsFromKeys();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.delete(e.code);
      updateControlsFromKeys();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Upright reset handler
  const handleResetUpright = () => {
    physicsEngineRef.current?.resetUpright();
    if (physicsState.isRolledOver) {
      unlockAchievement('rollover_survivor');
    }
  };

  // Turbo Boost Handler
  const handleActivateTurbo = () => {
    physicsEngineRef.current?.activateTurbo();
    audioEngine.playTurboWhistle();
  };

  // Refuel & Repair at Petro-Max
  const handleRefuel = () => {
    if (gameMode === 'sandbox' || playerData.money >= 40) {
      physicsEngineRef.current?.refuel(100);
      audioEngine.playFueling();
      if (gameMode !== 'sandbox') {
        persistPlayerData({ ...playerData, money: Math.max(0, playerData.money - 40) });
      }
    }
  };

  const handleRepair = () => {
    if (gameMode === 'sandbox' || playerData.money >= 80) {
      physicsEngineRef.current?.repairTruck(100);
      audioEngine.playHapticClick();
      if (gameMode !== 'sandbox') {
        persistPlayerData({ ...playerData, money: Math.max(0, playerData.money - 80) });
      }
    }
  };

  // Weather mode cycle
  const handleCycleWeather = () => {
    const weathers: WeatherMode[] = ['clear', 'rain', 'fog', 'storm'];
    const next = weathers[(weathers.indexOf(currentWeather) + 1) % weathers.length];
    setCurrentWeather(next);
    sceneManagerRef.current?.setWeather(next);
  };

  // Complete Mission Delivery Handler
  const handleDeliverCargo = () => {
    if (!activeMission) return;

    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    audioEngine.playSuccessChime();

    const payout = activeMission.rewardCash;
    const earnedXP = activeMission.rewardXP;
    const newDeliveriesCount = playerData.completedDeliveries + 1;
    const newLevel = Math.floor((playerData.xp + earnedXP) / 500) + 1;

    persistPlayerData({
      ...playerData,
      money: playerData.money + payout,
      xp: playerData.xp + earnedXP,
      level: newLevel,
      completedDeliveries: newDeliveriesCount,
    });

    // Check delivery achievements
    unlockAchievement('first_delivery');
    if (activeMission.id === 'm3_fuel_climb') {
      unlockAchievement('mountain_king');
    }
    if (activeMission.id === 'm4_excavator_haul') {
      unlockAchievement('heavy_master');
    }

    setActiveMission(null);
    setCanDeliverCargo(false);
  };

  // Buy Truck Handler
  const handleBuyTruck = (truck: TruckModel) => {
    if (gameMode !== 'sandbox' && playerData.money < truck.price) return;

    const newOwned = [...playerData.ownedTruckIds, truck.id];
    const newMoney = gameMode === 'sandbox' ? playerData.money : playerData.money - truck.price;

    persistPlayerData({
      ...playerData,
      money: newMoney,
      ownedTruckIds: newOwned,
      currentTruckId: truck.id,
    });

    if (newOwned.length >= TRUCK_MODELS.length) {
      unlockAchievement('fleet_owner');
    }
  };

  // Upgrade Truck Part Handler
  const handleUpgradePart = (part: 'engine' | 'brakes' | 'suspension' | 'tires', cost: number) => {
    if (gameMode !== 'sandbox' && playerData.money < cost) return;

    const truckUpgrades = { ...playerData.truckUpgrades };
    const current = truckUpgrades[currentTruck.id] || {
      engine: 0,
      brakes: 0,
      suspension: 0,
      tires: 0,
      paintColor: currentTruck.defaultColor,
    };

    if (current[part] >= 4) return;

    truckUpgrades[currentTruck.id] = {
      ...current,
      [part]: current[part] + 1,
    };

    persistPlayerData({
      ...playerData,
      money: gameMode === 'sandbox' ? playerData.money : playerData.money - cost,
      truckUpgrades,
    });
  };

  // Change Paint Color Handler
  const handleChangeColor = (colorHex: string) => {
    const truckUpgrades = { ...playerData.truckUpgrades };
    const current = truckUpgrades[currentTruck.id] || {
      engine: 0,
      brakes: 0,
      suspension: 0,
      tires: 0,
      paintColor: currentTruck.defaultColor,
    };
    truckUpgrades[currentTruck.id] = { ...current, paintColor: colorHex };

    persistPlayerData({
      ...playerData,
      truckUpgrades,
    });
  };

  // Select Trailer
  const handleSelectTrailer = (trailerType: TrailerType) => {
    persistPlayerData({
      ...playerData,
      activeTrailer: trailerType,
    });
  };

  // Change Cargo Fill Level
  const handleChangeCargoFill = (percent: number) => {
    persistPlayerData({
      ...playerData,
      cargoLoadPercent: percent,
    });
  };

  // Radio station cycle
  const handleNextRadioStation = () => {
    const next = (radioStation + 1) % 4;
    setRadioStation(next);
    audioEngine.setRadioStation(next);
    persistPlayerData({
      ...playerData,
      settings: { ...playerData.settings, musicTrack: next },
    });
  };

  // Traffic density toggle
  const handleToggleTraffic = () => {
    const levels: TrafficLevel[] = ['off', 'low', 'medium', 'high'];
    const next = levels[(levels.indexOf(playerData.settings.trafficLevel) + 1) % levels.length];
    sceneManagerRef.current?.setTrafficLevel(next);
    persistPlayerData({
      ...playerData,
      settings: { ...playerData.settings, trafficLevel: next },
    });
  };

  // Audio mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      audioEngine.setVolumes(0, 0);
    } else {
      audioEngine.setVolumes(sfxVolume, radioVolume);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Main Menu Overlay */}
      {!inGame && (
        <MainMenu
          playerData={playerData}
          activeTruck={currentTruck}
          onStartCareer={() => {
            setGameMode('career');
            setInGame(true);
            audioEngine.resume();
          }}
          onStartSandbox={() => {
            setGameMode('sandbox');
            setInGame(true);
            audioEngine.resume();
          }}
          onOpenDealership={() => setShowDealership(true)}
          onOpenGarage={() => setShowGarage(true)}
          onOpenTrailers={() => setShowTrailers(true)}
          onOpenMissions={() => setShowMissions(true)}
          onOpenAchievements={() => setShowAchievements(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* In-Game HUD Overlay */}
      {inGame && (
        <HUD
          physics={physicsState}
          controls={controls}
          cameraMode={cameraMode}
          truckModel={currentTruck}
          trailerModel={currentTrailer}
          activeMission={activeMission}
          trafficLevel={playerData.settings.trafficLevel}
          radioStation={radioStation}
          isMuted={isMuted}
          canDeliverCargo={canDeliverCargo}
          dayNight={dayNightInfo}
          weatherMode={currentWeather}
          isNearFuelStation={isNearFuelStation}
          onSetControls={setControls}
          onSetCameraMode={(mode) => {
            setCameraMode(mode);
            sceneManagerRef.current?.setCameraMode(mode);
          }}
          onToggleTraffic={handleToggleTraffic}
          onNextRadioStation={handleNextRadioStation}
          onToggleMute={handleToggleMute}
          onResetUpright={handleResetUpright}
          onDeliverCargo={handleDeliverCargo}
          onOpenMenu={() => setInGame(false)}
          onOpenMissions={() => setShowMissions(true)}
          onOpenTrailers={() => setShowTrailers(true)}
          onAdvanceTime={(hrs) => {
            sceneManagerRef.current?.addTimeOfDay(hrs);
          }}
          onCycleWeather={handleCycleWeather}
          onActivateTurbo={handleActivateTurbo}
          onRefuel={handleRefuel}
          onRepair={handleRepair}
        />
      )}

      {/* MODALS */}
      {showMissions && (
        <MissionsModal
          missions={DEFAULT_MISSIONS}
          activeMission={activeMission}
          currentTrailer={currentTrailer.type}
          onSelectMission={(m) => {
            setActiveMission(m);
            setShowMissions(false);
          }}
          onCancelMission={() => {
            setActiveMission(null);
            setCanDeliverCargo(false);
          }}
          onClose={() => setShowMissions(false)}
        />
      )}

      {showDealership && (
        <DealershipModal
          trucks={TRUCK_MODELS}
          ownedTruckIds={playerData.ownedTruckIds}
          currentTruckId={playerData.currentTruckId}
          playerMoney={playerData.money}
          isSandbox={gameMode === 'sandbox'}
          onBuyTruck={handleBuyTruck}
          onSelectTruck={(truckId) => {
            persistPlayerData({ ...playerData, currentTruckId: truckId });
            setShowDealership(false);
          }}
          onClose={() => setShowDealership(false)}
        />
      )}

      {showGarage && (
        <GarageModal
          truck={currentTruck}
          upgrades={currentUpgrades}
          playerMoney={playerData.money}
          isSandbox={gameMode === 'sandbox'}
          onUpgradePart={handleUpgradePart}
          onChangeColor={handleChangeColor}
          onClose={() => setShowGarage(false)}
        />
      )}

      {showTrailers && (
        <TrailerPickerModal
          trailers={TRAILER_MODELS}
          currentTrailer={currentTrailer.type}
          currentTruck={currentTruck}
          cargoFillPercent={playerData.cargoLoadPercent}
          onSelectTrailer={handleSelectTrailer}
          onChangeCargoFill={handleChangeCargoFill}
          onClose={() => setShowTrailers(false)}
        />
      )}

      {showAchievements && (
        <AchievementsModal
          achievements={achievements}
          onClose={() => setShowAchievements(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          trafficLevel={playerData.settings.trafficLevel}
          sfxVolume={sfxVolume}
          radioVolume={radioVolume}
          radioStation={radioStation}
          onSetTrafficLevel={(level) => {
            sceneManagerRef.current?.setTrafficLevel(level);
            persistPlayerData({
              ...playerData,
              settings: { ...playerData.settings, trafficLevel: level },
            });
          }}
          onSetSfxVolume={(vol) => {
            setSfxVolume(vol);
            audioEngine.setVolumes(vol, radioVolume);
          }}
          onSetRadioVolume={(vol) => {
            setRadioVolume(vol);
            audioEngine.setVolumes(sfxVolume, vol);
          }}
          onSetRadioStation={(st) => {
            setRadioStation(st);
            audioEngine.setRadioStation(st);
          }}
          onResetProgress={() => {
            localStorage.removeItem(SAVE_STORAGE_KEY);
            setPlayerData(INITIAL_PLAYER_DATA);
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
