import React, { useState } from 'react';
import { PushAlertConfig } from '../types/election';
import { soundService } from '../utils/audio';
import { X, Bell, Volume2, Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PushAlertConfig;
  setConfig: React.Dispatch<React.SetStateAction<PushAlertConfig>>;
  onRequestBrowserPermission: () => Promise<boolean>;
}

export const AlertSettingsModal: React.FC<AlertSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  setConfig,
  onRequestBrowserPermission,
}) => {
  const [newCandName, setNewCandName] = useState('');
  const [newCandNumber, setNewCandNumber] = useState('');
  const [newThreshold, setNewThreshold] = useState('50.0');
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const granted = await onRequestBrowserPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
  };

  const handleAddCandidateAlert = () => {
    if (!newCandName.trim() || !newCandNumber.trim()) return;
    const threshold = parseFloat(newThreshold) || 50.0;

    setConfig(prev => ({
      ...prev,
      candidateAlerts: [
        ...prev.candidateAlerts,
        {
          candidateName: newCandName.trim(),
          candidateNumber: newCandNumber.trim(),
          thresholdPercent: threshold,
          fired: false,
        },
      ],
    }));

    setNewCandName('');
    setNewCandNumber('');
    setNewThreshold('50.0');
  };

  const handleRemoveCandidateAlert = (index: number) => {
    setConfig(prev => ({
      ...prev,
      candidateAlerts: prev.candidateAlerts.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Alertas Push & Notificações da Apuração
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure avisos sonoros e notificações em tempo real.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* 1. Browser Native Push Notifications Permission */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white block">
                  Notificações do Navegador
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Receba avisos instantâneos mesmo com a aba em segundo plano.
                </span>
              </div>

              {permissionStatus === 'granted' ? (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Ativado
                </span>
              ) : (
                <button
                  onClick={handleRequestPermission}
                  className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Permitir Alertas
                </button>
              )}
            </div>
          </div>

          {/* 2. Urna Eletrônica Sound Option & Sound Test */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Som da Urna Eletrônica (Bip TSE)
                </span>
              </div>

              <input
                type="checkbox"
                checked={config.soundEnabled}
                onChange={(e) => setConfig(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => soundService.playUrnaConfirmation()}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>🔊</span> Testar Som de Confirmação (TSE)
              </button>
              <button
                onClick={() => soundService.playAlertChime()}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
              >
                Testar Alerta de Virada
              </button>
            </div>
          </div>

          {/* 3. Automatic Triggers */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Gatilhos Críticos de Apuração
            </h4>

            {/* Virada na Liderança */}
            <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer">
              <div>
                <span className="text-sm font-medium text-slate-900 dark:text-white block">
                  Virada / Mudança na Liderança
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Notifica quando um candidato ultrapassa o líder atual.
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.overtakeAlertEnabled}
                onChange={(e) => setConfig(p => ({ ...p, overtakeAlertEnabled: e.target.checked }))}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
            </label>

            {/* Matematicamente Eleito */}
            <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer">
              <div>
                <span className="text-sm font-medium text-slate-900 dark:text-white block">
                  Matematicamente Eleito
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Avisa assim que a vantagem do líder for irreversível pelas urnas restantes.
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.mathVictoryEnabled}
                onChange={(e) => setConfig(p => ({ ...p, mathVictoryEnabled: e.target.checked }))}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
            </label>

            {/* Marcos de Urnas */}
            <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer">
              <div>
                <span className="text-sm font-medium text-slate-900 dark:text-white block">
                  Marcos de Apuração de Urnas
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Dispara avisos em 50%, 80%, 90%, 95%, 99% e 100% das urnas apuradas.
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.milestoneUrnasEnabled}
                onChange={(e) => setConfig(p => ({ ...p, milestoneUrnasEnabled: e.target.checked }))}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
            </label>
          </div>

          {/* 4. Candidate-Specific Threshold Alerts */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Alertas Personalizados por Candidato
            </h4>

            {/* List of configured alerts */}
            <div className="space-y-2">
              {config.candidateAlerts.map((alert, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {alert.candidateName} ({alert.candidateNumber})
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      atingir <strong>{alert.thresholdPercent}%</strong> dos votos
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemoveCandidateAlert(index)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new threshold form */}
            <div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 space-y-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                Adicionar novo alerta de percentual:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Nome (ex: Lula)"
                  value={newCandName}
                  onChange={(e) => setNewCandName(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Número (ex: 13)"
                  value={newCandNumber}
                  onChange={(e) => setNewCandNumber(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    placeholder="Meta %"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={handleAddCandidateAlert}
                    className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors cursor-pointer"
                    title="Adicionar alerta"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Concluir & Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
