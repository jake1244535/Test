import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  TruckPhysicsState,
  DrivingControls,
  CameraMode,
  Gear,
  LightMode,
  MissionContract,
  TrafficLevel,
  TruckModel,
  TrailerModel,
  DayNightInfo
} from '../types/game';
import {
  Volume2,
  VolumeX,
  Radio,
  Camera,
  RotateCw,
  Lightbulb,
  AlertTriangle,
  Menu,
  Navigation,
  CheckCircle2,
  Sun,
  Moon,
  Clock,
  HelpCircle,
  X,
  Zap,
  Power,
  CloudRain,
  CloudFog,
  CloudLightning,
  Flame,
  Wrench,
  Fuel,
  Radio as MicIcon,
  ShieldAlert
} from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';
import { WeatherMode } from '../game3d/SceneManager';

interface HUDProps {
  physics: TruckPhysicsState;
  controls: DrivingControls;
  cameraMode: CameraMode;
  truckModel: TruckModel;
  trailerModel: TrailerModel;
  activeMission: MissionContract | null;
  trafficLevel: TrafficLevel;
  radioStation: number;
  isMuted: boolean;
  canDeliverCargo: boolean;
  dayNight: DayNightInfo | null;
  weatherMode?: WeatherMode;
  isNearFuelStation?: boolean;
  onSetControls: (updater: (prev: DrivingControls) => DrivingControls) => void;
  onSetCameraMode: (mode: CameraMode) => void;
  onToggleTraffic: () => void;
  onNextRadioStation: () => void;
  onToggleMute: () => void;
  onResetUpright: () => void;
  onDeliverCargo: () => void;
  onOpenMenu: () => void;
  onOpenMissions: () => void;
  onOpenTrailers: () => void;
  onAdvanceTime: (hours: number) => void;
  onCycleWeather?: () => void;
  onActivateTurbo?: () => void;
  onRefuel?: () => void;
  onRepair?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  physics,
  controls,
  cameraMode,
  truckModel,
  trailerModel,
  activeMission,
  trafficLevel,
  radioStation,
  isMuted,
  canDeliverCargo,
  dayNight,
  weatherMode = 'clear',
  isNearFuelStation = false,
  onSetControls,
  onSetCameraMode,
  onToggleTraffic,
  onNextRadioStation,
  onToggleMute,
  onResetUpright,
  onDeliverCargo,
  onOpenMenu,
  onOpenMissions,
  onOpenTrailers,
  onAdvanceTime,
  onCycleWeather,
  onActivateTurbo,
  onRefuel,
  onRepair,
}) => {
  const isRolledOver = physics.isRolledOver;
  const isHighRolloverRisk = Math.abs(physics.lateralG) > 0.38 && !isRolledOver;

  // Steering mode: 'wheel' or 'buttons' (tap left/right arrows)
  const [steerMode, setSteerMode] = useState<'wheel' | 'buttons'>('wheel');
  const [showGuide, setShowGuide] = useState(false);
  const [isStartingEngine, setIsStartingEngine] = useState(false);

  // Turbo boost cooldown state
  const [turboCooldown, setTurboCooldown] = useState(0);

  // CB Radio dispatch announcement message
  const [cbMessage, setCbMessage] = useState<string | null>(null);

  // Speed radar flash trigger
  const [showRadarFlash, setShowRadarFlash] = useState(false);
  const isSpeeding = Math.abs(physics.speedKmh) > 85;

  // Virtual Steering Wheel Drag State
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isDraggingWheel, setIsDraggingWheel] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const wheelPointerId = useRef<number | null>(null);
  const returnAnimFrame = useRef<number | null>(null);
  const currentAngleRef = useRef<number>(0);

  // Smooth Gauge Lerp Values (Analog Needle Weight)
  const [lerpedSpeed, setLerpedSpeed] = useState(0);
  const [lerpedRpm, setLerpedRpm] = useState(750);
  const gaugeAnimRef = useRef<number | null>(null);
  const targetSpeedRef = useRef(0);
  const targetRpmRef = useRef(750);

  targetSpeedRef.current = Math.abs(physics.speedKmh);
  targetRpmRef.current = physics.rpm;

  // Gauge needle lerp loop for smooth analog behavior
  useEffect(() => {
    let speedVal = 0;
    let rpmVal = 750;

    const animateGauges = () => {
      speedVal += (targetSpeedRef.current - speedVal) * 0.16;
      rpmVal += (targetRpmRef.current - rpmVal) * 0.20;

      setLerpedSpeed(speedVal);
      setLerpedRpm(rpmVal);

      gaugeAnimRef.current = requestAnimationFrame(animateGauges);
    };

    gaugeAnimRef.current = requestAnimationFrame(animateGauges);
    return () => {
      if (gaugeAnimRef.current) cancelAnimationFrame(gaugeAnimRef.current);
    };
  }, []);

  // Radio Station labels
  const radioLabels = ['Radio Apagada', 'FM 98.4 Lo-Fi Road', 'FM 104.2 Synthwave', 'FM 91.5 Trucker Rock'];

  // Turbo cooldown timer
  useEffect(() => {
    if (turboCooldown <= 0) return;
    const interval = setInterval(() => {
      setTurboCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [turboCooldown]);

  // Speed radar photo flash effect
  useEffect(() => {
    if (isSpeeding && Math.random() > 0.85) {
      setShowRadarFlash(true);
      const t = setTimeout(() => setShowRadarFlash(false), 220);
      return () => clearTimeout(t);
    }
  }, [isSpeeding]);

  const handleTriggerTurbo = () => {
    if (turboCooldown > 0 || !onActivateTurbo) return;
    audioEngine.playHapticClick();
    onActivateTurbo();
    setTurboCooldown(8);
  };

  const handleTriggerCBRadio = () => {
    audioEngine.playCBRadio();
    const messages = [
      '📻 Breaker 1-9: Autopista central despejada rumbo al Puerto.',
      '📻 Central: "Atención unidades, moderen velocidad en curvas del Cañón."',
      '📻 Radio Camionero: "Precios de diésel con descuento en Petro-Max."',
      '📻 Alerta Vía: "Cantera de montaña con neblina, enciendan luces altas."',
      '📻 Despacho: "Buen viaje compa, mantén la carga asegurada."',
    ];
    const picked = messages[Math.floor(Math.random() * messages.length)];
    setCbMessage(picked);
    setTimeout(() => setCbMessage(null), 4500);
  };

  // Toggle Engine Ignition
  const handleToggleEngine = () => {
    audioEngine.playHapticClick();
    if (!controls.engineStarted) {
      setIsStartingEngine(true);
      audioEngine.playIgnition();
      setTimeout(() => {
        onSetControls((p) => ({ ...p, engineStarted: true }));
        setIsStartingEngine(false);
      }, 700);
    } else {
      onSetControls((p) => ({ ...p, engineStarted: false, throttle: 0 }));
    }
  };

  // Transmission Shift
  const setGear = (gear: Gear) => {
    audioEngine.playHapticClick();
    onSetControls((prev) => ({ ...prev, gear }));
  };

  // Light switch cycle: off -> low -> high -> off
  const cycleLights = () => {
    audioEngine.playHapticClick();
    onSetControls((prev) => {
      const next: LightMode = prev.lights === 'off' ? 'low' : prev.lights === 'low' ? 'high' : 'off';
      return { ...prev, lights: next };
    });
  };

  // Blinker handlers
  const toggleBlinker = (mode: 'left' | 'right' | 'hazard') => {
    audioEngine.playHapticClick();
    onSetControls((prev) => ({
      ...prev,
      blinkers: prev.blinkers === mode ? 'off' : mode,
    }));
  };

  // Camera cycle
  const cycleCamera = () => {
    audioEngine.playHapticClick();
    const modes: CameraMode[] = ['third_person', 'first_person', 'second_person', 'orbit'];
    const nextIdx = (modes.indexOf(cameraMode) + 1) % modes.length;
    onSetCameraMode(modes[nextIdx]);
  };

  // Smooth Virtual Steering Wheel with Multitouch & Auto-Return
  const updateWheelFromCoords = useCallback((clientX: number, clientY: number) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    let angleRad = Math.atan2(deltaY, deltaX) + Math.PI / 2;
    if (angleRad > Math.PI) angleRad -= 2 * Math.PI;

    const maxAngleDeg = 120;
    let angleDeg = (angleRad * 180) / Math.PI;
    angleDeg = Math.max(-maxAngleDeg, Math.min(maxAngleDeg, angleDeg));

    currentAngleRef.current = angleDeg;
    setWheelAngle(angleDeg);
    const steerFactor = angleDeg / maxAngleDeg;
    onSetControls((p) => ({ ...p, steer: steerFactor }));
  }, [onSetControls]);

  const handleWheelPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (returnAnimFrame.current) {
      cancelAnimationFrame(returnAnimFrame.current);
      returnAnimFrame.current = null;
    }
    wheelPointerId.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingWheel(true);
    audioEngine.resume();
    updateWheelFromCoords(e.clientX, e.clientY);
  };

  const handleWheelPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingWheel || wheelPointerId.current !== e.pointerId) return;
    e.preventDefault();
    updateWheelFromCoords(e.clientX, e.clientY);
  };

  const startSmoothAutoReturn = useCallback(() => {
    if (returnAnimFrame.current) cancelAnimationFrame(returnAnimFrame.current);

    const stepReturn = () => {
      currentAngleRef.current *= 0.82; // Smooth progressive decay
      if (Math.abs(currentAngleRef.current) < 0.6) {
        currentAngleRef.current = 0;
        setWheelAngle(0);
        onSetControls((p) => ({ ...p, steer: 0 }));
        returnAnimFrame.current = null;
      } else {
        setWheelAngle(currentAngleRef.current);
        onSetControls((p) => ({ ...p, steer: currentAngleRef.current / 120 }));
        returnAnimFrame.current = requestAnimationFrame(stepReturn);
      }
    };

    returnAnimFrame.current = requestAnimationFrame(stepReturn);
  }, [onSetControls]);

  const handleWheelPointerUp = (e: React.PointerEvent) => {
    if (wheelPointerId.current === e.pointerId) {
      e.preventDefault();
      wheelPointerId.current = null;
      setIsDraggingWheel(false);
      startSmoothAutoReturn();
    }
  };

  // Touch pedals
  const handleThrottleStart = (e: React.PointerEvent) => {
    e.preventDefault();
    audioEngine.resume();
    audioEngine.playHapticClick();
    onSetControls((p) => ({ ...p, throttle: 1.0, brake: 0 }));
  };
  const handleThrottleEnd = (e: React.PointerEvent) => {
    e.preventDefault();
    onSetControls((p) => ({ ...p, throttle: 0 }));
  };

  const handleBrakeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    audioEngine.resume();
    audioEngine.playHapticClick();
    onSetControls((p) => ({ ...p, brake: 1.0, throttle: 0 }));
  };
  const handleBrakeEnd = (e: React.PointerEvent) => {
    e.preventDefault();
    onSetControls((p) => ({ ...p, brake: 0 }));
  };

  // Steer button handlers (Alternative to wheel on mobile)
  // Left: strictly LEFT (steer = -1)
  const handleSteerLeftStart = (e: React.PointerEvent) => {
    e.preventDefault();
    audioEngine.playHapticClick();
    onSetControls((p) => ({ ...p, steer: -1 }));
  };
  // Right: strictly RIGHT (steer = 1)
  const handleSteerRightStart = (e: React.PointerEvent) => {
    e.preventDefault();
    audioEngine.playHapticClick();
    onSetControls((p) => ({ ...p, steer: 1 }));
  };
  const handleSteerEnd = (e: React.PointerEvent) => {
    e.preventDefault();
    onSetControls((p) => ({ ...p, steer: 0 }));
  };

  // Smooth lerped needle angles
  const speedAngle = -120 + Math.min(140, lerpedSpeed) * (240 / 140);
  const rpmAngle = -120 + Math.min(3000, lerpedRpm) * (240 / 3000);
  const displaySpeed = Math.round(lerpedSpeed);
  const displayRpm = Math.round(lerpedRpm);

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-2 sm:p-4 text-white font-sans overflow-hidden touch-game">
      {/* Photo Radar Flash Simulation */}
      {showRadarFlash && (
        <div className="fixed inset-0 bg-white/70 z-50 pointer-events-none animate-ping" />
      )}

      {/* ========================================================= */}
      {/* TOP STATUS BAR (Glassmorphism & Neon Glow) */}
      {/* ========================================================= */}
      <div className="flex items-start justify-between gap-1.5 pointer-events-auto">
        {/* Left: Menu & Vehicle Info */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={onOpenMenu}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-100 rounded-2xl border border-cyan-500/30 backdrop-blur-xl text-xs font-black shadow-lg shadow-cyan-950/40 cursor-pointer active:scale-95 transition"
          >
            <Menu className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">GARAGE</span>
          </button>

          <div className="flex flex-col bg-slate-950/85 px-3 py-1.5 rounded-2xl border border-slate-700/60 backdrop-blur-xl shadow-lg text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-amber-400 tracking-wide">{truckModel.brand}</span>
              <span className="text-slate-300 font-bold">{truckModel.badge}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
              <span>{trailerModel.type !== 'none' ? `${trailerModel.name}` : 'Sin Remolque'}</span>
              {!physics.isOnRoad && (
                <span className="text-amber-400 font-black animate-pulse">[OFF-ROAD]</span>
              )}
            </div>
          </div>

          <button
            onClick={onOpenTrailers}
            className="px-2.5 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-2xl border border-slate-700/60 backdrop-blur-xl text-xs font-bold cursor-pointer transition shadow active:scale-95"
          >
            Remolque
          </button>

          {/* Quick Driving Guide button */}
          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-2xl font-black text-xs cursor-pointer shadow-lg shadow-amber-500/30 transition active:scale-95"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden md:inline">¿CÓMO MANEJAR?</span>
          </button>
        </div>

        {/* Center: Day/Night Clock, Weather, Alerts & Mission delivery */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {/* Day / Night 24h Clock Widget */}
            {dayNight && (
              <div className="flex items-center gap-2 bg-slate-950/90 border border-cyan-500/40 px-3 py-1.5 rounded-2xl backdrop-blur-xl shadow-xl shadow-cyan-950/50 text-xs">
                {dayNight.isNight ? (
                  <Moon className="w-4 h-4 text-cyan-400 animate-pulse" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400 animate-spin" />
                )}
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="font-extrabold text-sm text-cyan-300">{dayNight.timeString}</span>
                  <span className="text-[10px] text-amber-300 uppercase font-sans font-black">
                    {dayNight.periodName}
                  </span>
                </div>
                <button
                  onClick={() => onAdvanceTime(3)}
                  title="Adelantar hora (+3h)"
                  className="ml-1 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Dynamic Weather Switcher Widget */}
            {onCycleWeather && (
              <button
                onClick={onCycleWeather}
                title="Cambiar clima"
                className="flex items-center gap-1.5 bg-slate-950/90 border border-blue-500/40 px-3 py-1.5 rounded-2xl backdrop-blur-xl shadow-xl text-xs font-black cursor-pointer active:scale-95 transition"
              >
                {weatherMode === 'clear' && <Sun className="w-4 h-4 text-amber-400" />}
                {weatherMode === 'rain' && <CloudRain className="w-4 h-4 text-cyan-400 animate-bounce" />}
                {weatherMode === 'fog' && <CloudFog className="w-4 h-4 text-slate-300" />}
                {weatherMode === 'storm' && <CloudLightning className="w-4 h-4 text-yellow-300 animate-pulse" />}
                <span className="capitalize text-slate-200">
                  {weatherMode === 'clear' ? 'Soleado' : weatherMode === 'rain' ? 'Lluvia' : weatherMode === 'fog' ? 'Niebla' : 'Tormenta'}
                </span>
              </button>
            )}

            {/* CB Radio Chatter button */}
            <button
              onClick={handleTriggerCBRadio}
              className="flex items-center gap-1.5 bg-slate-950/90 border border-emerald-500/40 px-3 py-1.5 rounded-2xl backdrop-blur-xl shadow-xl text-xs font-black text-emerald-400 cursor-pointer active:scale-95 transition"
              title="Sintonizar Radio CB de Carretera"
            >
              <MicIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">CB RADIO</span>
            </button>
          </div>

          {/* CB Radio Message Banner */}
          {cbMessage && (
            <div className="bg-slate-900/95 border-2 border-emerald-400/80 px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-xl text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 animate-bounce">
              <span>{cbMessage}</span>
            </div>
          )}

          {/* Speed Radar Alert */}
          {isSpeeding && (
            <div className="bg-red-600/90 border border-red-300 text-white px-3 py-1 rounded-xl shadow-lg text-xs font-black flex items-center gap-1.5 animate-pulse">
              <ShieldAlert className="w-4 h-4 text-yellow-300" />
              <span>RADAR VIAL: LÍMITE 85 KM/H EXCEDIDO</span>
            </div>
          )}

          {isRolledOver && (
            <div className="animate-bounce bg-red-600/95 text-white px-4 py-2 rounded-2xl shadow-2xl border-2 border-red-300 font-black flex items-center gap-2 text-xs sm:text-sm pointer-events-auto">
              <AlertTriangle className="w-5 h-5 text-yellow-300 animate-pulse" />
              <span>¡CAMIÓN VOLCADO!</span>
              <button
                onClick={onResetUpright}
                className="ml-2 px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black rounded-xl shadow cursor-pointer transition active:scale-95"
              >
                ENDEREZAR (R)
              </button>
            </div>
          )}

          {isHighRolloverRisk && (
            <div className="bg-amber-600/95 text-white px-3 py-1.5 rounded-xl shadow-lg border border-amber-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-yellow-200" />
              <span>¡PELIGRO DE VUELCO! Frena antes de la curva</span>
            </div>
          )}

          {canDeliverCargo && activeMission && (
            <button
              onClick={onDeliverCargo}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-emerald-300 font-extrabold text-sm flex items-center gap-2 animate-pulse pointer-events-auto cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 text-yellow-300" />
              <span>ENTREGAR CARGA (+${activeMission.rewardCash.toLocaleString()})</span>
            </button>
          )}

          {/* Interactive Petro-Max Truck Stop Prompt */}
          {isNearFuelStation && (
            <div className="bg-slate-950/95 border-2 border-red-500/80 p-3 rounded-3xl shadow-2xl backdrop-blur-xl flex items-center gap-3 pointer-events-auto glow-red">
              <div className="p-2.5 bg-red-600/30 rounded-2xl border border-red-500/40 text-red-400">
                <Fuel className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-white">ESTACIÓN PETRO-MAX DIESEL</span>
                <span className="text-[10px] text-slate-400">Punto de servicio para camioneros</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onRefuel}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow cursor-pointer transition active:scale-95 flex items-center gap-1"
                >
                  <Fuel className="w-3.5 h-3.5" /> REPOSTAR ($40)
                </button>
                <button
                  onClick={onRepair}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-black shadow cursor-pointer transition active:scale-95 flex items-center gap-1"
                >
                  <Wrench className="w-3.5 h-3.5" /> REPARAR ($80)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Settings (Radio, Camera, Mute, Traffic) */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={onToggleTraffic}
            title="Ajustar Nivel de Tráfico NPC"
            className="flex items-center gap-1 px-2.5 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-2xl border border-slate-700/60 backdrop-blur-xl text-xs font-bold cursor-pointer transition active:scale-95"
          >
            <span className="hidden sm:inline">Tráfico:</span>
            <span className="uppercase text-[11px] font-black text-amber-400">{trafficLevel}</span>
          </button>

          <button
            onClick={onNextRadioStation}
            title={radioLabels[radioStation]}
            className="flex items-center gap-1 px-2.5 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-2xl border border-slate-700/60 backdrop-blur-xl text-xs font-bold cursor-pointer transition active:scale-95"
          >
            <Radio className={`w-3.5 h-3.5 ${radioStation > 0 ? 'text-amber-400 animate-spin' : 'text-slate-500'}`} />
            <span className="hidden lg:inline max-w-[90px] truncate">{radioLabels[radioStation]}</span>
          </button>

          <button
            onClick={cycleCamera}
            className="flex items-center gap-1 px-2.5 py-2 bg-slate-900/80 hover:bg-slate-800 text-cyan-300 rounded-2xl border border-cyan-500/30 backdrop-blur-xl text-xs font-black cursor-pointer transition active:scale-95 shadow-md shadow-cyan-950/40"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline uppercase text-[10px]">CÁMARA</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-2xl border border-slate-700/60 backdrop-blur-xl cursor-pointer transition active:scale-95"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MIDDLE: MISSION WAYPOINT BANNER & FUEL/DAMAGE GAUGES */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        {/* Mission status badge */}
        <div className="flex flex-col gap-1">
          {activeMission ? (
            <div className="bg-slate-950/85 border border-amber-500/40 px-3.5 py-2 rounded-2xl backdrop-blur-xl shadow-xl flex items-center gap-2.5 max-w-xs">
              <Navigation className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider">
                  Misión: {activeMission.title}
                </span>
                <span className="text-xs text-slate-200 truncate font-semibold">
                  Destino: {activeMission.dropoffLocation.name}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  Pago: +${activeMission.rewardCash.toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenMissions}
              className="bg-slate-900/85 hover:bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-2xl backdrop-blur-xl text-xs font-bold text-slate-300 flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition"
            >
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span>SELECCIONAR CONTRATO</span>
            </button>
          )}

          {/* Fuel & Damage HUD status pill */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-2xl backdrop-blur-md text-[11px] font-mono">
            <div className="flex items-center gap-1">
              <Fuel className="w-3.5 h-3.5 text-cyan-400" />
              <span className={physics.fuel < 20 ? 'text-red-400 font-black animate-pulse' : 'text-slate-300'}>
                {Math.round(physics.fuel)}%
              </span>
            </div>
            <div className="w-px h-3 bg-slate-700" />
            <div className="flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span className={physics.damage > 50 ? 'text-red-400 font-black' : 'text-slate-300'}>
                {Math.round(physics.damage)}% DAÑO
              </span>
            </div>
          </div>
        </div>

        {/* Center: BIG ENGINE START/STOP IGNITION BUTTON */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleToggleEngine}
            disabled={isStartingEngine}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 flex flex-col items-center justify-center transition shadow-2xl cursor-pointer select-none active:scale-95 ${
              controls.engineStarted
                ? 'bg-gradient-to-b from-emerald-500 to-teal-700 border-emerald-300 glow-green'
                : isStartingEngine
                ? 'bg-gradient-to-b from-amber-500 to-yellow-600 border-yellow-300 animate-spin glow-amber'
                : 'bg-gradient-to-b from-red-600 to-rose-900 border-red-400 glow-red animate-pulse'
            }`}
          >
            <Power className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white mt-0.5">
              {isStartingEngine ? 'ARRANCANDO' : controls.engineStarted ? 'MOTOR ON' : 'START / STOP'}
            </span>
          </button>
          <span className="text-[10px] text-slate-400 font-bold mt-1 bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-800">
            {controls.engineStarted ? 'En Marcha' : 'Apagado'}
          </span>
        </div>

        {/* Quick Functional Switches: Horn, Lights, Hazard */}
        <div className="flex flex-col gap-1.5">
          <button
            onPointerDown={() => {
              audioEngine.setHorn(true);
              onSetControls((p) => ({ ...p, horn: true }));
            }}
            onPointerUp={() => {
              audioEngine.setHorn(false);
              onSetControls((p) => ({ ...p, horn: false }));
            }}
            onPointerLeave={() => {
              audioEngine.setHorn(false);
              onSetControls((p) => ({ ...p, horn: false }));
            }}
            className="w-12 h-12 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 flex flex-col items-center justify-center font-black text-[9px] shadow-lg cursor-pointer active:scale-95 transition"
          >
            <Volume2 className="w-4 h-4" />
            <span>CLAXON</span>
          </button>

          <button
            onClick={cycleLights}
            className={`w-12 h-12 rounded-2xl border flex flex-col items-center justify-center font-black text-[9px] shadow-lg cursor-pointer active:scale-95 transition ${
              controls.lights === 'off'
                ? 'bg-slate-900/80 border-slate-700 text-slate-400'
                : controls.lights === 'low'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 glow-cyan'
                : 'bg-yellow-500/30 border-yellow-300 text-yellow-200 glow-amber'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>{controls.lights === 'off' ? 'LUCES' : controls.lights === 'low' ? 'CRUCE' : 'ALTAS'}</span>
          </button>

          <button
            onClick={() => toggleBlinker('hazard')}
            className={`w-12 h-12 rounded-2xl border flex flex-col items-center justify-center font-black text-[9px] shadow-lg cursor-pointer active:scale-95 transition ${
              controls.blinkers === 'hazard'
                ? 'bg-red-600 border-red-400 text-white glow-red animate-pulse'
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>BALIZA</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BOTTOM COCKPIT & TOUCH DRIVING CONTROLS */}
      {/* ========================================================= */}
      <div className="flex items-end justify-between gap-1 w-full pointer-events-auto">
        {/* ================= LEFT: STEERING CONTROLS ================= */}
        <div className="flex flex-col items-center gap-1.5">
          {/* Steer Mode Switch: Wheel vs Arrows */}
          <div className="flex items-center bg-slate-950/85 p-1 rounded-2xl border border-slate-800 text-[10px] font-bold">
            <button
              onClick={() => {
                audioEngine.playHapticClick();
                setSteerMode('wheel');
              }}
              className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
                steerMode === 'wheel' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400'
              }`}
            >
              Volante
            </button>
            <button
              onClick={() => {
                audioEngine.playHapticClick();
                setSteerMode('buttons');
              }}
              className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
                steerMode === 'buttons' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400'
              }`}
            >
              Flechas
            </button>
          </div>

          {steerMode === 'wheel' ? (
            /* Virtual Rotating Steering Wheel with Isolated Pointer Capture & Auto-Return */
            <div
              ref={wheelRef}
              onPointerDown={handleWheelPointerDown}
              onPointerMove={handleWheelPointerMove}
              onPointerUp={handleWheelPointerUp}
              onPointerCancel={handleWheelPointerUp}
              className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border-8 border-slate-700 bg-slate-900/90 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none glow-cyan"
              style={{
                transform: `rotate(${wheelAngle}deg)`,
                transition: isDraggingWheel ? 'none' : 'transform 0.08s ease-out',
              }}
            >
              <div className="absolute inset-2 rounded-full border-4 border-slate-800/80 pointer-events-none" />
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-slate-800 border-2 border-amber-400/80 flex items-center justify-center shadow-inner pointer-events-none">
                <span className="text-[10px] font-black text-amber-400 tracking-wider">TRUCK</span>
              </div>
              <div className="absolute w-full h-3 bg-slate-700/90 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute h-1/2 w-3 bg-slate-700/90 bottom-0 left-1/2 -translate-x-1/2 pointer-events-none" />
            </div>
          ) : (
            /* Giant Arrow Buttons for Direct Tapping (Strict Left / Right) */
            <div className="flex items-center gap-2">
              <button
                onPointerDown={handleSteerLeftStart}
                onPointerUp={handleSteerEnd}
                onPointerLeave={handleSteerEnd}
                onPointerCancel={handleSteerEnd}
                className="w-18 h-24 sm:w-20 sm:h-28 rounded-3xl bg-slate-900/90 active:bg-cyan-600 border-4 border-cyan-500/40 text-cyan-300 active:text-white flex flex-col items-center justify-center font-black text-2xl shadow-2xl cursor-pointer select-none touch-game transition active:scale-95"
                title="Girar a la Izquierda"
              >
                <span>◀</span>
                <span className="text-[9px] font-bold mt-1 text-slate-400">IZQ</span>
              </button>
              <button
                onPointerDown={handleSteerRightStart}
                onPointerUp={handleSteerEnd}
                onPointerLeave={handleSteerEnd}
                onPointerCancel={handleSteerEnd}
                className="w-18 h-24 sm:w-20 sm:h-28 rounded-3xl bg-slate-900/90 active:bg-cyan-600 border-4 border-cyan-500/40 text-cyan-300 active:text-white flex flex-col items-center justify-center font-black text-2xl shadow-2xl cursor-pointer select-none touch-game transition active:scale-95"
                title="Girar a la Derecha"
              >
                <span>▶</span>
                <span className="text-[9px] font-bold mt-1 text-slate-400">DER</span>
              </button>
            </div>
          )}
        </div>

        {/* ================= CENTER: DIALS & GEAR SELECTOR ================= */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/90 border border-slate-700/80 px-3 sm:px-4 py-2 rounded-3xl backdrop-blur-2xl shadow-2xl shadow-cyan-950/60">
            {/* Tachometer (RPM Dial) with Smooth Lerp Animation */}
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="50%" cy="50%" r="38%" className="stroke-slate-800 fill-none" strokeWidth="4" />
                <circle
                  cx="50%"
                  cy="50%"
                  r="38%"
                  className="stroke-amber-400 fill-none transition-all duration-75"
                  strokeWidth="4"
                  strokeDasharray="180"
                  strokeDashoffset={180 - (Math.min(3000, lerpedRpm) / 3000) * 140}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[8px] text-slate-400 uppercase font-bold">RPM</span>
                <span className="text-[10px] font-mono font-bold text-amber-400">{displayRpm}</span>
              </div>
              <div
                className="absolute w-0.5 h-5 sm:h-6 bg-red-500 origin-bottom rounded-full shadow-sm"
                style={{
                  transform: `rotate(${rpmAngle}deg)`,
                  transition: 'transform 0.04s linear',
                }}
              />
            </div>

            {/* Speedometer (Central Dial) with Smooth Lerp Animation */}
            <div className="relative w-18 h-18 sm:w-22 sm:h-22 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="50%" cy="50%" r="40%" className="stroke-slate-800 fill-none" strokeWidth="6" />
                <circle
                  cx="50%"
                  cy="50%"
                  r="40%"
                  className="stroke-cyan-400 fill-none transition-all duration-75"
                  strokeWidth="6"
                  strokeDasharray="210"
                  strokeDashoffset={210 - (Math.min(140, lerpedSpeed) / 140) * 165}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white leading-none">
                  {displaySpeed}
                </span>
                <span className="text-[8px] text-cyan-400 font-extrabold uppercase tracking-wider mt-0.5">KM/H</span>
              </div>
              <div
                className="absolute w-1 h-8 sm:h-10 bg-amber-400 origin-bottom rounded-full shadow-sm"
                style={{
                  transform: `rotate(${speedAngle}deg)`,
                  transition: 'transform 0.04s linear',
                }}
              />
            </div>

            {/* Transmission Selector (D, N, R, L) */}
            <div className="flex flex-col items-center gap-1 pl-1">
              <span className="text-[8px] font-bold text-slate-400 uppercase">Marcha</span>
              <div className="flex sm:flex-col gap-1">
                {(['D', 'N', 'R', 'L'] as Gear[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGear(g)}
                    className={`w-7 h-7 sm:w-6 sm:h-6 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center active:scale-95 ${
                      controls.gear === g
                        ? g === 'D'
                          ? 'bg-blue-600 text-white border-blue-400 glow-cyan'
                          : g === 'R'
                          ? 'bg-red-600 text-white border-red-400 glow-red'
                          : g === 'L'
                          ? 'bg-amber-500 text-black border-amber-300 glow-amber'
                          : 'bg-slate-300 text-black border-white'
                        : 'bg-slate-900/90 text-slate-400 border-slate-800'
                    }`}
                    title={`Marcha ${g}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT: TURBO & GIANT TOUCH PEDALS (GAS & FRENO) ================= */}
        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* NITRO TURBO BOOST BUTTON */}
          <button
            onClick={handleTriggerTurbo}
            disabled={turboCooldown > 0}
            className={`w-12 h-20 sm:h-24 rounded-2xl border-2 font-black text-[9px] flex flex-col items-center justify-center transition shadow-lg select-none cursor-pointer ${
              turboCooldown === 0
                ? 'bg-gradient-to-t from-orange-600 to-amber-500 text-slate-950 border-yellow-300 glow-amber animate-bounce'
                : 'bg-slate-950/80 text-slate-500 border-slate-800 opacity-60'
            }`}
            title="Activar Nitro Turbo Boost"
          >
            <Flame className="w-5 h-5 text-yellow-300" />
            <span className="mt-1">NITRO</span>
            <span className="text-[10px] font-mono font-bold">
              {turboCooldown > 0 ? `${turboCooldown}s` : 'READY'}
            </span>
          </button>

          {/* Handbrake Button */}
          <button
            onClick={() => {
              audioEngine.playHapticClick();
              onSetControls((p) => ({ ...p, handbrake: !p.handbrake }));
            }}
            className={`w-12 h-20 sm:h-24 rounded-2xl border-2 font-bold text-[10px] flex flex-col items-center justify-center transition cursor-pointer shadow-lg active:scale-95 ${
              controls.handbrake
                ? 'bg-red-600 text-white border-red-400 glow-red animate-pulse'
                : 'bg-slate-950/90 text-slate-400 border-slate-800'
            }`}
            title="Freno de Mano (P)"
          >
            <span className="text-base font-black">P</span>
            <span>MANO</span>
          </button>

          {/* Brake Pedal (Smooth 3D Perspective Compression Animation) */}
          <button
            onPointerDown={handleBrakeStart}
            onPointerUp={handleBrakeEnd}
            onPointerLeave={handleBrakeEnd}
            onPointerCancel={handleBrakeEnd}
            style={{
              transform: controls.brake > 0.05
                ? 'perspective(400px) rotateX(15deg) scale(0.94) translateY(5px)'
                : 'perspective(400px) rotateX(0deg) scale(1) translateY(0px)',
              transition: 'transform 0.12s cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 0.12s ease',
            }}
            className={`w-16 sm:w-20 h-28 sm:h-34 rounded-3xl border-4 font-black text-xs flex flex-col items-center justify-center shadow-2xl touch-game select-none cursor-pointer ${
              controls.brake > 0.05
                ? 'bg-gradient-to-b from-red-600 to-red-800 text-white border-red-300 glow-red'
                : 'bg-gradient-to-b from-slate-800 to-slate-950 text-slate-200 border-slate-700 hover:border-slate-500'
            }`}
            title="Pedal de Freno Principal"
          >
            <div className="w-10 h-2 bg-red-500/80 rounded-full mb-2 pointer-events-none" />
            <span className="text-sm font-black pointer-events-none">FRENO</span>
            <span className="text-[10px] text-slate-400 mt-1 pointer-events-none font-bold">PARAR</span>
          </button>

          {/* Throttle / Gas Pedal (Smooth 3D Perspective Compression Animation) */}
          <button
            onPointerDown={handleThrottleStart}
            onPointerUp={handleThrottleEnd}
            onPointerLeave={handleThrottleEnd}
            onPointerCancel={handleThrottleEnd}
            style={{
              transform: controls.throttle > 0.05
                ? 'perspective(400px) rotateX(18deg) scale(0.94) translateY(6px)'
                : 'perspective(400px) rotateX(0deg) scale(1) translateY(0px)',
              transition: 'transform 0.12s cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 0.12s ease',
            }}
            className={`w-16 sm:w-20 h-36 sm:h-42 rounded-3xl border-4 font-black text-xs flex flex-col items-center justify-center shadow-2xl touch-game select-none cursor-pointer ${
              controls.throttle > 0.05
                ? 'bg-gradient-to-b from-emerald-500 to-teal-700 text-white border-emerald-300 glow-green'
                : 'bg-gradient-to-b from-zinc-800 to-zinc-950 text-emerald-400 border-zinc-700 hover:border-zinc-500'
            }`}
            title="Pedal Acelerador"
          >
            <div className="w-8 h-2 bg-emerald-400 rounded-full mb-3 pointer-events-none" />
            <span className="text-sm font-black pointer-events-none">GAS</span>
            <span className="text-[10px] text-emerald-300 mt-2 pointer-events-none font-bold">ACELERAR</span>
          </button>
        </div>
      </div>

      {/* QUICK DRIVING GUIDE MODAL (Tailored for Android) */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative glow-cyan">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Manual Android: Controles y Físicas</h3>
                <p className="text-xs text-slate-400">Guía de aceleración, torque, curvas y dirección</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-emerald-500/30">
                <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <Power className="w-4 h-4" /> 1. Arrancar el Camión
                </div>
                <p>
                  Toca el botón central <strong>START / STOP</strong>. Con la marcha en <strong>D (Drive)</strong>, pisa el pedal verde <strong>GAS</strong>. La aceleración depende del peso del camión y la carga.
                </p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-2xl border border-cyan-500/30">
                <div className="font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
                  <RotateCw className="w-4 h-4" /> 2. Dirección Táctil (Volante o Flechas)
                </div>
                <p>
                  Girar a la <strong>DERECHA</strong> dobla estrictamente a la derecha. El volante virtual tiene auto-retorno suave progresivo y soporte multitouch fino para no interferir con los pedales.
                </p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-2xl border border-orange-500/30">
                <div className="font-bold text-orange-400 mb-1 flex items-center gap-1.5">
                  <Flame className="w-4 h-4" /> 3. Subir Cuestas Pesadas con Marcha L
                </div>
                <p>
                  Si llevas un remolque cargado con 35 toneladas en las cuestas de la cantera, cambia a <strong>L (Crawler Low)</strong> para multiplicar el torque del motor diésel y subir sin ahogarte.
                </p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-2xl border border-red-500/30">
                <div className="font-bold text-red-400 mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> 4. Frenar antes de Curvas y Evitar Vuelcos
                </div>
                <p>
                  La cabina se inclina con balanceo dinámico según la fuerza G lateral. Si tomas una curva a más de 65 km/h con remolque alto, <strong>el camión volcará</strong>. Frena con anticipación.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider cursor-pointer shadow-lg active:scale-95 transition"
            >
              ¡ENTENDIDO, A CONDUCIR!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
