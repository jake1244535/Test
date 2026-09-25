import React from 'react';
import { TrafficLevel } from '../types/game';
import { X, Settings, Car, Volume2, Radio, RotateCcw, AlertTriangle } from 'lucide-react';

interface SettingsModalProps {
  trafficLevel: TrafficLevel;
  sfxVolume: number;
  radioVolume: number;
  radioStation: number;
  onSetTrafficLevel: (level: TrafficLevel) => void;
  onSetSfxVolume: (vol: number) => void;
  onSetRadioVolume: (vol: number) => void;
  onSetRadioStation: (st: number) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  trafficLevel,
  sfxVolume,
  radioVolume,
  radioStation,
  onSetTrafficLevel,
  onSetSfxVolume,
  onSetRadioVolume,
  onSetRadioStation,
  onResetProgress,
  onClose,
}) => {
  const radioStations = ['Apagada (Silencio)', 'FM 98.4 Lo-Fi Roadside Beats', 'FM 104.2 Synthwave Highway', 'FM 91.5 Country Trucker Rock'];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 text-slate-200 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Configuración del Juego</h2>
              <p className="text-xs text-slate-400">Ajusta el tráfico de vehículos NPC, volumen del motor y radio FM.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* NPC Traffic Density */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Car className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Tráfico de Vehículos NPC
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Controla la cantidad de autos y camionetas que circulan por las carreteras del valle y la montaña.
            </p>

            <div className="grid grid-cols-4 gap-2">
              {(['off', 'low', 'medium', 'high'] as TrafficLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => onSetTrafficLevel(level)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition uppercase cursor-pointer ${
                    trafficLevel === level
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {level === 'off' ? 'Desactivado' : level === 'low' ? 'Bajo' : level === 'medium' ? 'Medio' : 'Alto'}
                </button>
              ))}
            </div>
          </div>

          {/* Sound & Audio */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Efectos de Sonido y Motor
              </h3>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span>Volumen de Motor y Físicas (RPM, Frenos, Claxon):</span>
                <span className="font-mono font-bold text-amber-400">{Math.round(sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVolume}
                onChange={(e) => onSetSfxVolume(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Radio className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-300 font-bold">Emisora de Radio FM:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {radioStations.map((stationName, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSetRadioStation(idx)}
                    className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition cursor-pointer ${
                      radioStation === idx
                        ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {stationName}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span>Volumen de la Radio FM:</span>
                <span className="font-mono font-bold text-amber-400">{Math.round(radioVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={radioVolume}
                onChange={(e) => onSetRadioVolume(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          {/* Reset progress */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Restablecer Datos Guardados</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Borra el progreso de la partida y reinicia los camiones y fondos al estado inicial.
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('¿Estás seguro de que deseas reiniciar todos los datos guardados?')) {
                    onResetProgress();
                  }
                }}
                className="px-3 py-2 bg-red-950/50 hover:bg-red-900/60 border border-red-800 text-red-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
