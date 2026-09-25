import React from 'react';
import { TruckModel, PlayerSaveData } from '../types/game';
import {
  Play,
  Truck,
  Wrench,
  Layers,
  Award,
  Settings,
  DollarSign,
  Sparkles,
  Compass,
  Navigation,
  Smartphone
} from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';

interface MainMenuProps {
  playerData: PlayerSaveData;
  activeTruck: TruckModel;
  onStartCareer: () => void;
  onStartSandbox: () => void;
  onOpenDealership: () => void;
  onOpenGarage: () => void;
  onOpenTrailers: () => void;
  onOpenMissions: () => void;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  playerData,
  activeTruck,
  onStartCareer,
  onStartSandbox,
  onOpenDealership,
  onOpenGarage,
  onOpenTrailers,
  onOpenMissions,
  onOpenAchievements,
  onOpenSettings,
}) => {
  return (
    <div className="absolute inset-0 z-40 bg-gradient-to-b from-slate-950/90 via-slate-950/80 to-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-8 select-none overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-xs tracking-widest uppercase mb-1">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Heavy Hauling Experience 3D</span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px]">
              <Smartphone className="w-3 h-3" /> Android Ready
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            HEAVY HAUL <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">3D</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg">
            Simulador de camiones con físicas de suspensión, inercia de remolque, riesgo de vuelco, ciclo día/noche y controles táctiles para móvil.
          </p>
        </div>

        {/* Player Stats Card */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-cyan-500/30 p-3.5 rounded-3xl shadow-xl shadow-cyan-950/40 backdrop-blur-xl self-start sm:self-auto">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/40">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Fondos de Carrera</div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              ${playerData.money.toLocaleString()}
            </div>
            <div className="text-[10px] text-amber-400 font-extrabold">
              Nivel {playerData.level} • {playerData.completedDeliveries} entregas
            </div>
          </div>
        </div>
      </div>

      {/* Center: Selected Truck Showcase Banner */}
      <div className="my-4 max-w-xl bg-slate-900/80 border border-slate-800/80 p-4 rounded-3xl backdrop-blur-xl shadow-xl">
        <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Camión Seleccionado</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-wide">{activeTruck.name}</div>
            <div className="text-xs text-amber-400 font-bold">{activeTruck.category} • {activeTruck.baseStats.torqueNm} Nm Torque</div>
          </div>
          <button
            onClick={() => {
              audioEngine.playHapticClick();
              onOpenDealership();
            }}
            className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-slate-100 text-xs font-black rounded-xl border border-slate-600 shadow cursor-pointer transition active:scale-95"
          >
            Cambiar
          </button>
        </div>
      </div>

      {/* Main Mode Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-w-4xl">
        {/* Modo Carrera Button */}
        <button
          onClick={() => {
            audioEngine.playHapticClick();
            onStartCareer();
          }}
          className="group p-5 bg-gradient-to-br from-amber-500 via-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 rounded-3xl shadow-2xl shadow-amber-500/30 font-black flex items-center justify-between transition-all active:scale-95 cursor-pointer text-left border border-amber-300"
        >
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-950/80 font-extrabold flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Modo Principal</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1">MODO CARRERA</div>
            <div className="text-xs font-bold text-slate-950/80 mt-1">
              Haz fletes, gana dinero y expande tu flota.
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-black/15 flex items-center justify-center group-hover:translate-x-1.5 transition-transform shrink-0">
            <Play className="w-7 h-7 fill-black" />
          </div>
        </button>

        {/* Modo Sandbox Button */}
        <button
          onClick={() => {
            audioEngine.playHapticClick();
            onStartSandbox();
          }}
          className="group p-5 bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 hover:from-cyan-500 hover:to-indigo-600 text-white rounded-3xl shadow-2xl shadow-blue-600/30 font-black flex items-center justify-between transition-all active:scale-95 cursor-pointer text-left border border-cyan-400/40"
        >
          <div>
            <div className="text-xs uppercase tracking-wider text-cyan-200 font-extrabold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Libertad Total</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1">MODO SANDBOX</div>
            <div className="text-xs font-bold text-cyan-100/90 mt-1">
              Camiones desbloqueados y fondos infinitos.
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center group-hover:translate-x-1.5 transition-transform shrink-0">
            <Sparkles className="w-7 h-7" />
          </div>
        </button>

        {/* Secondary Navigation Grid */}
        <div className="sm:col-span-2 lg:col-span-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5">
          <button
            onClick={() => {
              audioEngine.playHapticClick();
              onOpenDealership();
            }}
            className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left transition flex flex-col justify-between cursor-pointer active:scale-95 shadow-lg"
          >
            <Truck className="w-5 h-5 text-cyan-400 mb-1" />
            <div>
              <div className="text-xs font-black text-white">Concesionario</div>
              <div className="text-[10px] text-slate-400 font-medium">Comprar camiones</div>
            </div>
          </button>

          <button
            onClick={() => {
              audioEngine.playHapticClick();
              onOpenGarage();
            }}
            className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left transition flex flex-col justify-between cursor-pointer active:scale-95 shadow-lg"
          >
            <Wrench className="w-5 h-5 text-amber-400 mb-1" />
            <div>
              <div className="text-xs font-black text-white">Taller Mecánico</div>
              <div className="text-[10px] text-slate-400 font-medium">Mejorar motor & estabilidad</div>
            </div>
          </button>

          <button
            onClick={() => {
              audioEngine.playHapticClick();
              onOpenTrailers();
            }}
            className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left transition flex flex-col justify-between cursor-pointer active:scale-95 shadow-lg"
          >
            <Layers className="w-5 h-5 text-emerald-400 mb-1" />
            <div>
              <div className="text-xs font-black text-white">Remolques</div>
              <div className="text-[10px] text-slate-400 font-medium">Plataforma, cisterna, góndola</div>
            </div>
          </button>

          <button
            onClick={() => {
              audioEngine.playHapticClick();
              onOpenMissions();
            }}
            className="p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-left transition flex flex-col justify-between cursor-pointer active:scale-95 shadow-lg"
          >
            <Navigation className="w-5 h-5 text-purple-400 mb-1" />
            <div>
              <div className="text-xs font-black text-white">Misiones</div>
              <div className="text-[10px] text-slate-400 font-medium">Rutas de carga y dinero</div>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Bar: Achievements & Settings */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              audioEngine.playHapticClick();
              onOpenAchievements();
            }}
            className="flex items-center gap-1.5 hover:text-white transition cursor-pointer active:scale-95"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span className="font-bold">Logros</span>
          </button>
          <span>•</span>
          <button
            onClick={() => {
              audioEngine.playHapticClick();
              onOpenSettings();
            }}
            className="flex items-center gap-1.5 hover:text-white transition cursor-pointer active:scale-95"
          >
            <Settings className="w-4 h-4 text-slate-300" />
            <span className="font-bold">Ajustes & Tráfico</span>
          </button>
        </div>

        <div className="text-slate-500 font-mono text-[11px]">Heavy Haul 3D • Android & Web</div>
      </div>
    </div>
  );
};
