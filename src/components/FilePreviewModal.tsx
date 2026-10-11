import React, { useState } from 'react';
import { X, Download, ExternalLink, FileSpreadsheet, Eye, AlertCircle } from 'lucide-react';
import { DriveFileItem } from '../types/share';

interface FilePreviewModalProps {
  file: DriveFileItem | null;
  onClose: () => void;
  onDownload: (file: DriveFileItem) => void;
  lang: 'th' | 'en';
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onDownload,
  lang,
}) => {
  const [iframeError, setIframeError] = useState(false);

  if (!file) return null;

  const sheetsPreviewUrl = `https://drive.google.com/file/d/${file.id}/preview`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[88vh] bg-white border border-white/60 rounded-[28px] shadow-[0_20px_50px_rgba(171,71,188,0.25)] flex flex-col overflow-hidden">
        {/* Modal Header in MCU ExamCheck Style */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 bg-gradient-to-r from-purple-50/80 via-pink-50/50 to-purple-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#107c41] flex items-center justify-center shrink-0 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#4a148c] truncate max-w-xl">
                {file.name}
              </h3>
              <p className="text-xs text-[#7b1fa2] font-medium">
                {file.faculty && <span>{file.faculty} • </span>}
                {file.department && <span>{file.department} • </span>}
                <span>{file.size}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Button in MCU Primary Gradient */}
            <button
              type="button"
              onClick={() => onDownload(file)}
              className="px-4 py-1.5 rounded-full btn-mcu-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'ดาวน์โหลดเอกสาร' : 'Download'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-purple-100/70 hover:bg-purple-200 text-[#7b1fa2] hover:text-[#4a148c] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Iframe Content */}
        <div className="flex-1 bg-slate-100 relative flex flex-col items-center justify-center">
          {!iframeError ? (
            <iframe
              src={sheetsPreviewUrl}
              title={file.name}
              className="w-full h-full border-0 bg-white"
              onError={() => setIframeError(true)}
              allow="autoplay"
            />
          ) : (
            <div className="text-center p-8 max-w-md bg-white rounded-3xl border border-slate-200 shadow-sm">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800">
                {lang === 'th'
                  ? 'ไม่สามารถแสดงตัวอย่างภายในกรอบได้'
                  : 'Cannot embed preview directly'}
              </h4>
              <p className="text-xs text-slate-500 mt-2">
                {lang === 'th'
                  ? 'ท่านสามารถดาวน์โหลดไฟล์ Excel (.xls) ลงเครื่องเพื่อเปิดใช้งาน'
                  : 'You can download the Excel file directly to your device.'}
              </p>
              <div className="mt-5 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onDownload(file)}
                  className="px-5 py-2.5 rounded-full btn-mcu-primary text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>{lang === 'th' ? 'ดาวน์โหลดลงเครื่อง' : 'Download File'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
