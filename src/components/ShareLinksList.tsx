import React, { useState } from 'react';
import {
  Share2,
  Lock,
  Clock,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  Check,
  Copy,
  Plus,
  LogOut,
} from 'lucide-react';
import { SharePackage } from '../types/share';
import { formatThaiDateTime, getTimeRemaining } from '../utils/timeFormat';

interface ShareLinksListProps {
  shares: SharePackage[];
  onSelectShare: (share: SharePackage) => void;
  onOpenShareModal: (share: SharePackage) => void;
  onRefresh: () => void;
  onCreateNew: () => void;
  adminToken?: string;
  onLogoutAdmin?: () => void;
  lang: 'th' | 'en';
}

export const ShareLinksList: React.FC<ShareLinksListProps> = ({
  shares,
  onSelectShare,
  onOpenShareModal,
  onRefresh,
  onCreateNew,
  adminToken,
  onLogoutAdmin,
  lang,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const copyPassword = (pwd: string, id: string) => {
    navigator.clipboard.writeText(pwd);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetQuota = async (id: string) => {
    setUpdatingId(id);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['x-admin-token'] = adminToken;

      await fetch(`/api/shares/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ resetDownloads: true }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExtendExpiry = async (id: string, daysToAdd = 7) => {
    setUpdatingId(id);
    const newDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['x-admin-token'] = adminToken;

      await fetch(`/api/shares/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ expiresAt: newDate }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteShare = async (id: string) => {
    if (!confirm(lang === 'th' ? 'ต้องการลบหรือรีเซ็ตลิงก์นี้หรือไม่?' : 'Delete or reset this link?')) {
      return;
    }
    setUpdatingId(id);
    try {
      const headers: Record<string, string> = {};
      if (adminToken) headers['x-admin-token'] = adminToken;

      await fetch(`/api/shares/${id}`, {
        method: 'DELETE',
        headers,
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#4a148c] tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#ec407a]" />
            <span>
              {lang === 'th' ? 'รายการลิงก์แชร์ที่มีการป้องกัน' : 'Active Protected Links'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-[#c2185b] border border-pink-200">
              Admin Mode
            </span>
          </h2>
          <p className="text-xs text-[#7b1fa2]/80 mt-1">
            {lang === 'th'
              ? 'ตรวจสอบสถิติการดาวน์โหลด ปรับโควต้า หรือขยายวันหมดอายุสำหรับแบบฟอร์มเอกสาร'
              : 'Monitor visits, download quotas, and adjust security controls.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="px-3.5 py-2 rounded-2xl bg-white hover:bg-purple-50 border border-purple-200 text-[#7b1fa2] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'รีเฟรช' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 rounded-2xl btn-mcu-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'th' ? 'สร้างลิงก์ใหม่' : 'New Link'}</span>
          </button>

          {onLogoutAdmin && (
            <button
              type="button"
              onClick={onLogoutAdmin}
              className="px-3.5 py-2 rounded-2xl bg-purple-100/70 hover:bg-purple-200 border border-purple-200 text-[#4a148c] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title={lang === 'th' ? 'ออกจากระบบผู้ดูแล' : 'Logout Admin'}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{lang === 'th' ? 'ล็อกระบบ' : 'Lock'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards list */}
      <div className="space-y-4">
        {shares.map((share) => {
          const timeInfo = getTimeRemaining(share.security.expiresAt);
          const isExpired = share.security.expiresAt !== null && timeInfo.isExpired;

          const maxDl = share.security.maxDownloads;
          const currentDl = share.stats.totalDownloadsCount;
          const isLimitReached = maxDl !== null && maxDl !== undefined && currentDl >= maxDl;
          const dlPercent = maxDl ? Math.min(100, Math.round((currentDl / maxDl) * 100)) : 0;

          return (
            <div
              key={share.id}
              className="rounded-[28px] bg-white/95 backdrop-blur-md border border-white/60 p-5 md:p-6 shadow-[0_15px_35px_rgba(171,71,188,0.12),0_5px_15px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(171,71,188,0.18)] transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Info block */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {share.id === 'grade-sem1-2569' && (
                      <span className="px-3 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-[#c2185b] text-[11px] font-bold">
                        {lang === 'th' ? 'ชุดมาตรฐาน มจร (Google Drive)' : 'MCU Official Package'}
                      </span>
                    )}

                    <span
                      className={`px-3 py-0.5 rounded-full text-[11px] font-semibold border ${
                        isExpired
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-purple-50 border-purple-200 text-[#7b1fa2]'
                      }`}
                    >
                      {isExpired
                        ? lang === 'th'
                          ? 'หมดอายุแล้ว'
                          : 'Expired'
                        : timeInfo.formattedText}
                    </span>

                    {isLimitReached && (
                      <span className="px-3 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                        {lang === 'th' ? 'สิทธิ์ดาวน์โหลดเต็มแล้ว' : 'Limit Reached'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-[#4a148c] tracking-tight">
                    {share.title}
                  </h3>
                  {share.description && (
                    <p className="text-xs text-[#7b1fa2]/80 mt-0.5 line-clamp-1">
                      {share.description}
                    </p>
                  )}

                  {/* Grid details */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {/* Password */}
                    <div className="p-3 rounded-2xl bg-[#fce4ec]/50 border border-[#f8bbd0]/60">
                      <span className="text-[#7b1fa2] text-[11px] flex items-center gap-1 font-semibold">
                        <KeyRound className="w-3 h-3 text-[#ec407a]" />
                        <span>{lang === 'th' ? 'รหัสผ่าน' : 'Passcode'}</span>
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-bold text-[#c2185b] text-xs">
                          {share.security.password || 'ไม่มี'}
                        </span>
                        {share.security.password && (
                          <button
                            type="button"
                            onClick={() => copyPassword(share.security.password!, share.id)}
                            className="text-[#ab47bc] hover:text-[#4a148c] transition-colors p-0.5 cursor-pointer"
                            title="Copy Password"
                          >
                            {copiedId === share.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expiration date */}
                    <div className="p-3 rounded-2xl bg-[#fce4ec]/50 border border-[#f8bbd0]/60">
                      <span className="text-[#7b1fa2] text-[11px] flex items-center gap-1 font-semibold">
                        <Clock className="w-3 h-3 text-[#ab47bc]" />
                        <span>{lang === 'th' ? 'วันหมดอายุ' : 'Expires At'}</span>
                      </span>
                      <span className="text-[#4a148c] font-semibold text-xs mt-0.5 block truncate">
                        {formatThaiDateTime(share.security.expiresAt)}
                      </span>
                    </div>

                    {/* Downloads progress */}
                    <div className="p-3 rounded-2xl bg-[#fce4ec]/50 border border-[#f8bbd0]/60">
                      <span className="text-[#7b1fa2] text-[11px] flex items-center gap-1 font-semibold">
                        <Download className="w-3 h-3 text-emerald-600" />
                        <span>{lang === 'th' ? 'ดาวน์โหลด' : 'Downloads'}</span>
                      </span>
                      <span className="text-[#4a148c] font-bold text-xs mt-0.5 block">
                        {maxDl !== null && maxDl !== undefined
                          ? `${currentDl} / ${maxDl}`
                          : `${currentDl} (ไม่จำกัด)`}
                      </span>
                      {maxDl && (
                        <div className="w-full bg-purple-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className={`h-full ${
                              isLimitReached ? 'bg-amber-500' : 'bg-gradient-to-r from-[#ec407a] to-[#ab47bc]'
                            }`}
                            style={{ width: `${dlPercent}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Visitors & Unlocks */}
                    <div className="p-3 rounded-2xl bg-[#fce4ec]/50 border border-[#f8bbd0]/60">
                      <span className="text-[#7b1fa2] text-[11px] flex items-center gap-1 font-semibold">
                        <Eye className="w-3 h-3 text-purple-600" />
                        <span>{lang === 'th' ? 'เข้าชม / ปลดล็อก' : 'Views / Unlocks'}</span>
                      </span>
                      <span className="text-[#4a148c] font-bold text-xs mt-0.5 block">
                        {share.stats.viewsCount} ครั้ง / {share.stats.unlockedCount} ปลดล็อก
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions column */}
                <div className="flex flex-wrap lg:flex-col items-center lg:items-end justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-purple-100">
                  {/* Share button in MCU Primary */}
                  <button
                    type="button"
                    onClick={() => onOpenShareModal(share)}
                    className="px-4 py-2 rounded-2xl btn-mcu-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'แชร์ลิงก์ & QR' : 'Share & QR'}</span>
                  </button>

                  {/* Test unlock */}
                  <button
                    type="button"
                    onClick={() => onSelectShare(share)}
                    className="px-3.5 py-2 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[#4a148c] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#ab47bc]" />
                    <span>{lang === 'th' ? 'เปิดดูหน้าผู้รับ' : 'View Portal'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Reset Quota */}
                    <button
                      type="button"
                      onClick={() => handleResetQuota(share.id)}
                      disabled={updatingId === share.id}
                      className="p-2 rounded-xl bg-white hover:bg-purple-50 border border-purple-200 text-[#7b1fa2] hover:text-[#4a148c] text-xs transition-colors cursor-pointer"
                      title={lang === 'th' ? 'รีเซ็ตจำนวนดาวน์โหลด' : 'Reset downloads count'}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${updatingId === share.id ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Extend Expiry +7 Days */}
                    <button
                      type="button"
                      onClick={() => handleExtendExpiry(share.id, 7)}
                      disabled={updatingId === share.id}
                      className="px-2.5 py-1.5 rounded-xl bg-[#fce4ec] hover:bg-[#f8bbd0] text-[#c2185b] border border-[#f8bbd0] text-[11px] font-bold transition-colors cursor-pointer"
                      title={lang === 'th' ? 'ขยายเวลาเพิ่ม 7 วัน' : 'Extend +7 days'}
                    >
                      +7 {lang === 'th' ? 'วัน' : 'days'}
                    </button>

                    {/* Delete / Reset */}
                    <button
                      type="button"
                      onClick={() => handleDeleteShare(share.id)}
                      disabled={updatingId === share.id}
                      className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-purple-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title={lang === 'th' ? 'ลบ / รีเซ็ตลิงก์' : 'Delete or reset'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
