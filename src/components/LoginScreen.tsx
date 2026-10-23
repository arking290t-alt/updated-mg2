import React, { useState } from 'react';
import { Package, Lock, User, AlertCircle, ArrowRight, ShieldCheck, Box } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (userId: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [operatorId, setOperatorId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedId = operatorId.trim();
    const trimmedPw = password.trim();

    if (!trimmedId || !trimmedPw) {
      setErrorMessage('Please enter both Operator ID and Password.');
      return;
    }

    setIsLoading(true);

    // Support Office Master (ID: mga, Password: mga@1234) and Factory Floor (ID: admin, Password: factory)
    setTimeout(() => {
      if (trimmedId.toLowerCase() === 'admin' && trimmedPw === 'factory') {
        setIsLoading(false);
        onLoginSuccess('factory');
      } else if (
        (trimmedId.toLowerCase() === 'mga' && trimmedPw === 'mga@1234') ||
        (trimmedId.toLowerCase() === 'admin' && (trimmedPw === 'mga@1234' || trimmedPw === 'admin'))
      ) {
        setIsLoading(false);
        onLoginSuccess('mga');
      } else {
        setIsLoading(false);
        setErrorMessage('Authentication failed. Valid logins: mga / mga@1234 (Office Master) or admin / factory (Factory Floor).');
      }
    }, 300);
  };

  const handleFillOfficeMaster = () => {
    setOperatorId('mga');
    setPassword('mga@1234');
    setErrorMessage('');
  };

  const handleFillFactory = () => {
    setOperatorId('admin');
    setPassword('factory');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-md">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-md">
            <Box className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Corrugation Plant Operations</h1>
          <p className="text-xs text-slate-400 mt-1">Manufacturing & Production Execution Console</p>
        </div>

        {/* Credentials Reminder / Quick Auto Fill Options */}
        <div className="mb-5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
            Select Console Login:
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleFillOfficeMaster}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-left cursor-pointer transition-colors"
            >
              <div className="font-bold text-white text-[11px]">Office Master</div>
              <div className="font-mono text-amber-400 text-[10px] mt-0.5">mga / mga@1234</div>
            </button>

            <button
              type="button"
              onClick={handleFillFactory}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-amber-500/40 hover:border-amber-500 text-left cursor-pointer transition-colors shadow-xs"
            >
              <div className="font-bold text-white text-[11px] flex items-center gap-1">
                <span>Factory Floor</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <div className="font-mono text-amber-400 text-[10px] mt-0.5">admin / factory</div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Operator ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                placeholder="mga"
                required
                autoFocus
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mga@1234"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              {isLoading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-500 font-mono">
          Corrugation Plant Facility Node · Office Master (mga) & Factory Access
        </div>

      </div>
    </div>
  );
};
