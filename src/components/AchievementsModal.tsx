import React from 'react';
import { Achievement } from '../types/game';
import { X, Award, CheckCircle2, Lock, DollarSign } from 'lucide-react';

interface AchievementsModalProps {
  achievements: Achievement[];
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ achievements, onClose }) => {
  const completedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Logros de Conducción Pesada</h2>
              <p className="text-xs text-slate-400">
                Desbloqueados: <strong className="text-amber-400">{completedCount}</strong> de {achievements.length}
              </p>
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
        <div className="p-6 overflow-y-auto space-y-3">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                ach.unlocked
                  ? 'bg-amber-950/20 border-amber-500/50 shadow-md'
                  : 'bg-slate-950/50 border-slate-800/80 opacity-70'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    ach.unlocked ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {ach.unlocked ? <CheckCircle2 className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${ach.unlocked ? 'text-white' : 'text-slate-400'}`}>
                    {ach.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">{ach.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs bg-emerald-950/50 px-2.5 py-1.5 rounded-lg border border-emerald-800/60 shrink-0">
                <DollarSign className="w-3.5 h-3.5" />
                <span>+${ach.rewardCash.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
