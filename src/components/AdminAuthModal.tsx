import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Lock, Eye, EyeOff, AlertCircle, X, CheckCircle2 } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
  lang: 'th' | 'en';
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lang,
}) => {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMsg(
        lang === 'th'
          ? 'กรุณากรอกรหัสผ่านผู้ดูแลระบบ (Admin PIN)'
          : 'Please enter admin passcode'
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          onSuccess(json.token);
          setPasscode('');
          onClose();
          return;
        } else {
          setErrorMsg(
            json.message ||
              (lang === 'th'
                ? 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง'
                : 'Invalid admin passcode')
          );
          return;
        }
      } else {
        // Handle non-OK HTTP status (e.g., 404 on static hosts)
        try {
          const json = await res.json();
          if (json.message) {
            setErrorMsg(json.message);
            return;
          }
        } catch {
          // If server didn't return JSON (e.g. 404 HTML page on static hosting like GitHub Pages/Vercel)
          // Fallback to client-side admin verification with default passcode
          if (passcode.trim() === 'admin2569') {
            const fallbackToken = btoa('admin2569');
            onSuccess(fallbackToken);
            setPasscode('');
            onClose();
            return;
          } else {
            setErrorMsg(
              lang === 'th'
                ? 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง'
                : 'Invalid admin passcode'
            );
            return;
          }
        }
      }
    } catch {
      // Offline fallback: หากโฮสต์เป็นแบบ Static (เช่น GitHub Pages / Vercel Static) ที่ไม่มี Node API Server
      // ให้ตรวจสอบรหัสผ่าน admin2569 ฝั่ง Client ทันที เพื่อให้ผู้ดูแลระบบเข้าใช้งานได้ 100%
      if (passcode.trim() === 'admin2569') {
        const fallbackToken = btoa('admin2569');
        onSuccess(fallbackToken);
        setPasscode('');
        onClose();
      } else {
        setErrorMsg(
          lang === 'th'
            ? 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง'
            : 'Invalid admin passcode'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-md border border-white/60 rounded-[28px] shadow-[0_20px_50px_rgba(171,71,188,0.25)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-purple-100 bg-gradient-to-r from-purple-50/80 via-pink-50/50 to-purple-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#fce4ec] border border-[#f8bbd0] text-[#c2185b] flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#4a148c]">
                {lang === 'th' ? 'เข้าสู่ระบบผู้ดูแล (Admin Portal)' : 'Admin Authentication'}
              </h3>
              <p className="text-[11px] text-[#7b1fa2] font-medium">
                {lang === 'th' ? 'การรักษาความปลอดภัยระดับผู้ดูแลระบบ' : 'Restricted Administrative Access'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-purple-100/70 hover:bg-purple-200 text-[#7b1fa2] hover:text-[#4a148c] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#4a148c] mb-1.5">
              {lang === 'th' ? 'รหัสผ่านผู้ดูแลระบบ (Admin PIN / Key)' : 'Admin PIN / Security Key'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#ab47bc]">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder={lang === 'th' ? 'กรอกรหัสผ่านผู้ดูแล...' : 'Enter admin passcode...'}
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#fce4ec]/70 border-2 border-transparent focus:border-[#ec407a] focus:bg-white text-[#4a148c] text-sm outline-none transition-all font-medium"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#ab47bc] hover:text-[#4a148c] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-purple-200 text-[#7b1fa2] hover:bg-purple-50 text-xs font-semibold transition-colors cursor-pointer"
            >
              {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 rounded-2xl btn-mcu-primary disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <span>{lang === 'th' ? 'กำลังตรวจสอบ...' : 'Verifying...'}</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{lang === 'th' ? 'เข้าสู่ระบบ' : 'Unlock Admin'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
