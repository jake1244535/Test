import React from 'react';
import { MissionContract, TrailerType } from '../types/game';
import { X, Navigation, DollarSign, Award, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface MissionsModalProps {
  missions: MissionContract[];
  activeMission: MissionContract | null;
  currentTrailer: TrailerType;
  onSelectMission: (mission: MissionContract) => void;
  onCancelMission: () => void;
  onClose: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  missions,
  activeMission,
  currentTrailer,
  onSelectMission,
  onCancelMission,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Bolsa de Cargas y Misiones</h2>
              <p className="text-xs text-slate-400">Contrata fletes de transporte, transporta mercancías y gana recompensas en efectivo.</p>
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
        <div className="p-6 overflow-y-auto space-y-4">
          {activeMission && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Misión Actual Activa</span>
                </div>
                <h3 className="text-base font-bold text-white">{activeMission.title}</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Lleva <strong className="text-emerald-300">{activeMission.cargoName}</strong> ({activeMission.cargoWeightTons} Toneladas) hacia{' '}
                  <strong className="text-amber-300">{activeMission.dropoffLocation.name}</strong>.
                </p>
              </div>
              <button
                onClick={onCancelMission}
                className="px-4 py-2 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700/60 text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer self-start sm:self-auto"
              >
                Cancelar Misión
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missions.map((mission) => {
              const isCurrent = activeMission?.id === mission.id;
              const matchesTrailer = currentTrailer === mission.trailerType;

              return (
                <div
                  key={mission.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                    isCurrent
                      ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/30'
                      : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-200 uppercase tracking-wide">
                        {mission.cargoCategory}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          mission.difficulty === 'Fácil'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : mission.difficulty === 'Media'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : mission.difficulty === 'Difícil'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-red-950 text-red-300 border border-red-800'
                        }`}
                      >
                        {mission.difficulty}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-sm mb-1">{mission.title}</h3>
                    <p className="text-xs text-slate-300 mb-3">{mission.cargoName}</p>

                    <div className="space-y-1.5 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Origen:</span>
                        <span className="font-medium text-slate-200">{mission.pickupLocation.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Destino:</span>
                        <span className="font-semibold text-amber-300">{mission.dropoffLocation.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Peso Total:</span>
                        <span className="font-medium text-white">{mission.cargoWeightTons} Toneladas</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Distancia Estimada:</span>
                        <span className="font-medium text-white">{mission.distanceKm} km</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3 text-xs">
                      <div className="flex items-center gap-1 text-emerald-400 font-extrabold text-sm">
                        <DollarSign className="w-4 h-4" />
                        <span>${mission.rewardCash.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-400 font-bold">
                        <Award className="w-3.5 h-3.5" />
                        <span>+{mission.rewardXP} XP</span>
                      </div>
                    </div>

                    {!matchesTrailer && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 mb-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Requiere remolque de tipo {mission.trailerType}.</span>
                      </div>
                    )}

                    <button
                      onClick={() => onSelectMission(mission)}
                      disabled={isCurrent}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-500/30 text-amber-300 cursor-default'
                          : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 active:scale-98'
                      }`}
                    >
                      {isCurrent ? 'Misión Aceptada' : 'Aceptar Contrato'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
