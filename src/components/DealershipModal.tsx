import React from 'react';
import { TruckModel } from '../types/game';
import { X, Truck, Zap, Gauge, DollarSign, Check, Shield, Anchor } from 'lucide-react';

interface DealershipModalProps {
  trucks: TruckModel[];
  ownedTruckIds: string[];
  currentTruckId: string;
  playerMoney: number;
  isSandbox: boolean;
  onBuyTruck: (truck: TruckModel) => void;
  onSelectTruck: (truckId: string) => void;
  onClose: () => void;
}

export const DealershipModal: React.FC<DealershipModalProps> = ({
  trucks,
  ownedTruckIds,
  currentTruckId,
  playerMoney,
  isSandbox,
  onBuyTruck,
  onSelectTruck,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Concesionario de Camiones</h2>
              <p className="text-xs text-slate-400">Adquiere nuevos modelos de carga pesada con las ganancias de tus fletes.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-400 font-extrabold text-sm">
              <DollarSign className="w-4 h-4" />
              <span>{isSandbox ? '∞ MODO LIBRE' : `$${playerMoney.toLocaleString()}`}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Truck Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {trucks.map((truck) => {
            const isOwned = isSandbox || ownedTruckIds.includes(truck.id);
            const isCurrent = currentTruckId === truck.id;
            const canAfford = isSandbox || playerMoney >= truck.price;

            return (
              <div
                key={truck.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-blue-950/30 border-blue-500/80 ring-2 ring-blue-500/30 shadow-xl'
                    : 'bg-slate-800/40 border-slate-700/70 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                        {truck.category}
                      </span>
                      <h3 className="text-lg font-black text-white">{truck.name}</h3>
                    </div>
                    {isCurrent && (
                      <span className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                        En Uso
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 italic mb-4">"{truck.tagline}"</p>
                  <p className="text-xs text-slate-400 mb-4">{truck.description}</p>

                  {/* Technical Specifications */}
                  <div className="grid grid-cols-2 gap-2.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <Gauge className="w-3.5 h-3.5 text-blue-400" />
                        <span>Velocidad Máxima:</span>
                      </div>
                      <div className="text-sm font-bold text-white font-mono">{truck.baseStats.topSpeedKmh} km/h</div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Aceleración 0-100:</span>
                      </div>
                      <div className="text-sm font-bold text-amber-300 font-mono">
                        {truck.baseStats.accel0to100Sec} segundos
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <Anchor className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Par Motor (Torque):</span>
                      </div>
                      <div className="text-sm font-bold text-white font-mono">{truck.baseStats.torqueNm} Nm</div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <Shield className="w-3.5 h-3.5 text-purple-400" />
                        <span>Peso en Vacío:</span>
                      </div>
                      <div className="text-sm font-bold text-white font-mono">{truck.baseStats.curbWeightTons} Toneladas</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 mb-4">
                    <strong className="text-slate-300">Remolques Soportados:</strong>{' '}
                    {truck.allowedTrailers.length > 3
                      ? 'Todos (Universal, Furgón, Cisterna, Cama Baja)'
                      : truck.allowedTrailers.filter((t) => t !== 'none').join(', ')}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    {!isOwned && (
                      <div className="text-lg font-black text-emerald-400 font-mono">
                        ${truck.price.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {isOwned ? (
                    <button
                      onClick={() => onSelectTruck(truck.id)}
                      disabled={isCurrent}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-800 text-slate-400 cursor-default'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 active:scale-95'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      {isCurrent ? 'Camión Seleccionado' : 'Conducir Camión'}
                    </button>
                  ) : (
                    <button
                      onClick={() => onBuyTruck(truck)}
                      disabled={!canAfford}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                        canAfford
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      }`}
                    >
                      {canAfford ? 'Comprar Camión' : 'Fondos Insuficientes'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
