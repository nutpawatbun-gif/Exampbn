import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  QrCode,
  Download,
  Share2,
  Lock,
  Clock,
  Sparkles,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import QRCode from 'qrcode';
import { SharePackage } from '../types/share';
import { formatThaiDateTime } from '../utils/timeFormat';

interface ShareModalProps {
  share: SharePackage;
  onClose: () => void;
  lang: 'th' | 'en';
}

export const ShareModal: React.FC<ShareModalProps> = ({
  share,
  onClose,
  lang,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const shareUrl = `${window.location.origin}${window.location.pathname}?share=${share.id}`;

  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#8e0040',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation failed:', err));
  }, [shareUrl]);

  const shareMessage = `📂 เอกสาร: ${share.title}
🏛️ วิทยาลัยสงฆ์พ่อขุนผาเมือง เพชรบูรณ์
🔗 ลิงก์เข้าดูและดาวน์โหลด: ${shareUrl}
🔑 รหัสผ่าน (Passcode): ${share.security.password || 'ไม่มีรหัสผ่าน'}
${share.security.passwordHint ? `💡 คำใบ้รหัสผ่าน: ${share.security.passwordHint}\n` : ''}⏳ กำหนดหมดอายุ: ${formatThaiDateTime(share.security.expiresAt)}
📥 จำกัดดาวน์โหลด: ${share.security.maxDownloads ? `${share.security.maxDownloads} ครั้ง` : 'ไม่จำกัด'}
⚠️ ระบบปลอดภัย ไม่ต้องสมัครสมาชิกหรือล็อกอินบัญชี Google ใดๆ ทั้งสิ้น`;

  const copyToClipboard = (text: string, isMsg = false) => {
    navigator.clipboard.writeText(text);
    if (isMsg) {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const downloadQrCode = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qrcode_${share.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-md border border-white/60 rounded-[28px] shadow-[0_20px_50px_rgba(171,71,188,0.25)] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-purple-100 bg-gradient-to-r from-purple-50/80 via-pink-50/50 to-purple-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#fce4ec] border border-[#f8bbd0] text-[#c2185b] flex items-center justify-center shadow-2xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#4a148c]">
                {lang === 'th' ? 'แชร์ลิงก์เข้าถึงแบบฟอร์ม' : 'Share Protected Link'}
              </h3>
              <p className="text-[11px] text-[#7b1fa2] font-medium">
                {share.title}
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Share Link Box */}
          <div>
            <label className="block text-xs font-semibold text-[#4a148c] mb-1.5">
              {lang === 'th' ? 'ลิงก์สำหรับส่งให้อาจารย์ผู้สอน (แชร์ต่อได้ทันที)' : 'Shareable URL'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3.5 py-2.5 rounded-2xl bg-[#fce4ec]/70 border border-[#f8bbd0] text-[#c2185b] font-mono text-xs select-all outline-none font-bold"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(shareUrl, false)}
                className="px-4 py-2.5 rounded-2xl btn-mcu-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'คัดลอกแล้ว' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'คัดลอกลิงก์' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Security Information Recap */}
          <div className="p-4 rounded-2xl bg-[#fce4ec]/50 border border-[#f8bbd0]/60 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#7b1fa2] text-[11px] flex items-center gap-1 font-medium">
                <Lock className="w-3 h-3 text-[#ec407a]" />
                <span>{lang === 'th' ? 'รหัสผ่านเข้าดู' : 'Passcode'}</span>
              </span>
              <span className="text-[#4a148c] font-mono font-bold text-sm mt-0.5 block">
                {share.security.password || 'ไม่มี'}
              </span>
            </div>

            <div>
              <span className="text-[#7b1fa2] text-[11px] flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3 text-[#ab47bc]" />
                <span>{lang === 'th' ? 'กำหนดหมดอายุ' : 'Expiration'}</span>
              </span>
              <span className="text-[#4a148c] font-semibold text-xs mt-0.5 block truncate">
                {formatThaiDateTime(share.security.expiresAt)}
              </span>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-28 h-28 bg-white p-2 rounded-2xl border border-purple-200 shadow-sm shrink-0 flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              ) : (
                <QrCode className="w-8 h-8 text-purple-400 animate-pulse" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-[#4a148c]">
                {lang === 'th'
                  ? 'สแกน QR Code เพื่อเปิดบนโทรศัพท์มือถือ'
                  : 'Scan QR on Mobile'}
              </h4>
              <p className="text-[11px] text-[#7b1fa2]/80 mt-1 leading-relaxed">
                {lang === 'th'
                  ? 'อาจารย์สามารถใช้กล้องสแกนและกรอกรหัสผ่านเพื่อเปิดดูหรือส่งต่อไปยังเครื่องคอมพิวเตอร์ได้ทันที'
                  : 'Recipient can scan and enter passcode directly on mobile.'}
              </p>
              <button
                type="button"
                onClick={downloadQrCode}
                className="mt-3 px-3.5 py-1.5 rounded-full bg-white hover:bg-purple-50 border border-purple-200 text-[#7b1fa2] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-[#ec407a]" />
                <span>{lang === 'th' ? 'บันทึกรูป QR Code' : 'Save QR'}</span>
              </button>
            </div>
          </div>

          {/* Preformatted LINE / Chat Message Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#4a148c] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#ec407a]" />
                <span>
                  {lang === 'th'
                    ? 'ข้อความสำเร็จรูปพร้อมส่ง (LINE กลุ่ม / Email)'
                    : 'Ready-to-Send Message'}
                </span>
              </label>

              <button
                type="button"
                onClick={() => copyToClipboard(shareMessage, true)}
                className="text-[11px] text-[#c2185b] hover:text-[#ec407a] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copiedMessage ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>{lang === 'th' ? 'คัดลอกข้อความแล้ว' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{lang === 'th' ? 'คัดลอกข้อความ' : 'Copy Text'}</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              readOnly
              rows={4}
              value={shareMessage}
              className="w-full p-3 rounded-2xl bg-[#fce4ec]/50 border border-[#f8bbd0] text-[#4a148c] font-mono text-[11px] leading-relaxed outline-none resize-none select-all font-medium"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-purple-100 bg-purple-50/40 flex items-center justify-between">
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#c2185b] hover:underline flex items-center gap-1.5 font-semibold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ทดสอบเปิดในหน้าต่างใหม่' : 'Test Open Link'}</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-[#4a148c] text-xs font-bold transition-colors cursor-pointer"
          >
            {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
