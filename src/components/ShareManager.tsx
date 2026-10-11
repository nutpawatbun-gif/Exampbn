import React, { useState } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Clock,
  Download,
  FolderSync,
  FileCheck,
  Plus,
  RefreshCw,
  Sparkles,
  Link2,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { SharePackage, DriveFileItem } from '../types/share';
import { DEFAULT_DRIVE_FOLDER_URL, DEFAULT_FILES } from '../data/defaultDriveFolder';

interface ShareManagerProps {
  onShareCreated: (newShare: SharePackage) => void;
  adminToken?: string;
  lang: 'th' | 'en';
}

export const ShareManager: React.FC<ShareManagerProps> = ({
  onShareCreated,
  adminToken,
  lang,
}) => {
  const [title, setTitle] = useState(
    'ใบกรอกคะแนน เทอม 1 ปีการศึกษา ป.ตรี 2569'
  );
  const [description, setDescription] = useState(
    'แบบฟอร์มเอกสารใบกรอกคะแนนระดับปริญญาตรี คณะพุทธศาสตร์ และ คณะสังคมศาสตร์'
  );
  const [sourceDriveUrl, setSourceDriveUrl] = useState(DEFAULT_DRIVE_FOLDER_URL);
  const [customNote, setCustomNote] = useState(
    'สำหรับอาจารย์ผู้สอน กรุณาดาวน์โหลดแบบฟอร์มและส่งคืนตามกำหนดการ'
  );

  // Security config
  const [requirePassword, setRequirePassword] = useState(true);
  const [password, setPassword] = useState('2569');
  const [passwordHint, setPasswordHint] = useState('ปีการศึกษา 4 หลัก');

  // Expiration presets
  const [expiryPreset, setExpiryPreset] = useState<string>('7d');
  const [customExpiryDate, setCustomExpiryDate] = useState<string>('');

  // Download limits presets
  const [downloadLimitPreset, setDownloadLimitPreset] = useState<string>('50');
  const [customDownloadLimit, setCustomDownloadLimit] = useState<string>('100');

  // Drive folder inspect state
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectedFiles, setInspectedFiles] = useState<DriveFileItem[]>(DEFAULT_FILES);
  const [inspectMessage, setInspectMessage] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generateRandomPassword = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setPassword(pin);
    setPasswordHint(lang === 'th' ? 'รหัส PIN ตัวเลข 6 หลัก' : '6-digit numeric PIN');
  };

  const handleInspectDriveFolder = async () => {
    if (!sourceDriveUrl) return;
    setIsInspecting(true);
    setInspectMessage(null);

    try {
      const res = await fetch('/api/parse-drive-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sourceDriveUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInspectedFiles(data.files || DEFAULT_FILES);
        if (data.title) setTitle(data.title);
        setInspectMessage(
          lang === 'th'
            ? `ดึงข้อมูลสำเร็จ: พบ ${data.files.length} ไฟล์ในโฟลเดอร์ Google Drive`
            : `Success: Loaded ${data.files.length} files from Google Drive`
        );
      } else {
        setInspectMessage(data.message || 'ไม่สามารถดึงข้อมูลได้');
      }
    } catch {
      setInspectMessage(
        lang === 'th'
          ? 'ใช้ข้อมูลชุดไฟล์มาตรฐาน 16 ไฟล์'
          : 'Using standard 16 files list'
      );
    } finally {
      setIsInspecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage(
        lang === 'th' ? 'กรุณาระบุชื่อชุดไฟล์' : 'Please provide a title'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    let expiresInHours: number | undefined;
    let customExpiresAt: string | undefined;

    if (expiryPreset === '1h') expiresInHours = 1;
    else if (expiryPreset === '24h') expiresInHours = 24;
    else if (expiryPreset === '3d') expiresInHours = 72;
    else if (expiryPreset === '7d') expiresInHours = 168;
    else if (expiryPreset === '30d') expiresInHours = 720;
    else if (expiryPreset === 'custom' && customExpiryDate) {
      customExpiresAt = new Date(customExpiryDate).toISOString();
    } else if (expiryPreset === 'never') {
      expiresInHours = 0;
    }

    let maxDownloads: number | null = null;
    if (downloadLimitPreset !== 'unlimited') {
      if (downloadLimitPreset === 'custom') {
        maxDownloads = parseInt(customDownloadLimit, 10) || null;
      } else {
        maxDownloads = parseInt(downloadLimitPreset, 10);
      }
    }

    const payload = {
      title,
      description,
      sourceDriveUrl,
      customNote,
      password: requirePassword ? password : '',
      passwordHint: requirePassword ? passwordHint : '',
      expiresInHours,
      customExpiresAt,
      maxDownloads,
      files: inspectedFiles,
    };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['x-admin-token'] = adminToken;

      const res = await fetch('/api/shares', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        onShareCreated(json.data);
      } else {
        setErrorMessage(json.message || 'Failed to create share link');
      }
    } catch {
      const now = new Date();
      let exp: string | null = null;
      if (expiresInHours && expiresInHours > 0) {
        exp = new Date(now.getTime() + expiresInHours * 3600000).toISOString();
      } else if (customExpiresAt) {
        exp = customExpiresAt;
      }

      const localNewShare: SharePackage = {
        id: `share-${Math.random().toString(36).substring(2, 8)}`,
        title,
        description,
        sourceDriveUrl,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        customNote,
        security: {
          requirePassword,
          password: requirePassword ? password : '',
          passwordHint: requirePassword ? passwordHint : '',
          expiresAt: exp,
          maxDownloads,
          allowPreviewWithoutDownload: true,
          allowZipDownload: true,
        },
        files: inspectedFiles,
        stats: {
          viewsCount: 0,
          unlockedCount: 0,
          totalDownloadsCount: 0,
          lastAccessedAt: null,
        },
      };
      onShareCreated(localNewShare);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 md:py-8">
      <div className="rounded-[28px] bg-white/95 backdrop-blur-md border border-white/60 shadow-[0_15px_35px_rgba(171,71,188,0.15)] p-6 md:p-8">
        {/* Title */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-[#c2185b] border border-pink-200 text-xs font-bold mb-2">
            <Plus className="w-3.5 h-3.5" />
            <span>
              {lang === 'th' ? 'สร้างลิงก์แชร์ที่มีการป้องกัน' : 'Create Secure Share Link'}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#4a148c] tracking-tight">
            {lang === 'th'
              ? 'กำหนดเงื่อนไขความปลอดภัยและสร้างลิงก์แชร์ใหม่'
              : 'Configure Security & Generate Share Link'}
          </h2>
          <p className="text-xs md:text-sm text-[#7b1fa2]/80 mt-1">
            {lang === 'th'
              ? 'ผู้รับสามารถเข้าดูและดาวน์โหลดเอกสารได้โดยไม่ต้องลงชื่อเข้าใช้ด้วยบัญชี Google แต่ต้องผ่านรหัสผ่านที่กำหนด'
              : 'Recipients can access files without registration, protected by your passcode and restrictions.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Source Google Drive Folder */}
          <div className="p-5 rounded-2xl bg-[#fce4ec]/40 border border-[#f8bbd0]/70 space-y-4">
            <h3 className="text-sm font-bold text-[#4a148c] flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#ec407a]" />
              <span>
                {lang === 'th'
                  ? '1. โฟลเดอร์หรือไฟล์ Google Drive ต้นฉบับ'
                  : '1. Source Google Drive Folder'}
              </span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#4a148c] mb-1">
                {lang === 'th' ? 'Google Drive URL:' : 'Drive URL:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sourceDriveUrl}
                  onChange={(e) => setSourceDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="flex-1 px-3.5 py-2.5 rounded-2xl bg-white border border-[#f8bbd0] text-slate-800 text-xs outline-none focus:border-[#ec407a] focus:ring-2 focus:ring-pink-200"
                />
                <button
                  type="button"
                  onClick={handleInspectDriveFolder}
                  disabled={isInspecting}
                  className="px-4 py-2.5 rounded-2xl btn-mcu-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <FolderSync className={`w-3.5 h-3.5 ${isInspecting ? 'animate-spin' : ''}`} />
                  <span>
                    {isInspecting
                      ? lang === 'th'
                        ? 'กำลังดึง...'
                        : 'Loading...'
                      : lang === 'th'
                      ? 'ตรวจสอบไฟล์'
                      : 'Scan Folder'}
                  </span>
                </button>
              </div>

              {inspectMessage && (
                <p className="mt-2 text-xs text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{inspectMessage}</span>
                </p>
              )}
            </div>

            {/* Folder Name & Desc */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'th' ? 'ชื่อชุดเอกสาร:' : 'Package Title:'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-[#b30253]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'th' ? 'คำอธิบายเพิ่มเติม:' : 'Description:'}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-[#b30253]"
                />
              </div>
            </div>

            {/* File List Summary */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium">
                <FileCheck className="w-4 h-4 text-[#107c41]" />
                <span>
                  {lang === 'th'
                    ? `ชุดเอกสารนี้ประกอบด้วย ${inspectedFiles.length} ไฟล์ (.xls)`
                    : `Package includes ${inspectedFiles.length} files (.xls)`}
                </span>
              </span>
              <span className="text-slate-400 text-[11px]">
                {lang === 'th' ? 'ดึงจากโฟลเดอร์ต้นทาง' : 'From Drive Folder'}
              </span>
            </div>
          </div>

          {/* Section 2: Password Protection Settings */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#b30253]" />
                <span>
                  {lang === 'th'
                    ? '2. ระบบป้องกันด้วยรหัสผ่าน (Password Protection)'
                    : '2. Passcode Protection'}
                </span>
              </h3>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requirePassword}
                  onChange={(e) => setRequirePassword(e.target.checked)}
                  className="w-4 h-4 rounded text-[#b30253] focus:ring-rose-500 bg-white border-slate-300"
                />
                <span className="text-xs text-slate-800 font-semibold">
                  {lang === 'th' ? 'เปิดใช้รหัสผ่าน' : 'Enable Passcode'}
                </span>
              </label>
            </div>

            {requirePassword && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'th' ? 'รหัสผ่านสำหรับเข้าดู:' : 'Passcode:'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="เช่น 2569"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-[#b30253] font-mono font-bold text-xs outline-none focus:border-[#b30253]"
                      />
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#b30253]" />
                        <span>{lang === 'th' ? 'สุ่มรหัส PIN' : 'Random PIN'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'th' ? 'คำใบ้รหัสผ่าน (ถ้ามี):' : 'Password Hint:'}
                    </label>
                    <input
                      type="text"
                      value={passwordHint}
                      onChange={(e) => setPasswordHint(e.target.value)}
                      placeholder="เช่น ปีการศึกษา 4 หลัก"
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-[#b30253]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Expiration Settings */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#b30253]" />
              <span>
                {lang === 'th'
                  ? '3. กำหนดเวลาหมดอายุของลิงก์ (Link Expiration)'
                  : '3. Link Expiration'}
              </span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {[
                { id: '1h', label: lang === 'th' ? '1 ชั่วโมง' : '1 Hour' },
                { id: '24h', label: lang === 'th' ? '24 ชั่วโมง' : '24 Hours' },
                { id: '3d', label: lang === 'th' ? '3 วัน' : '3 Days' },
                { id: '7d', label: lang === 'th' ? '7 วัน (แนะนำ)' : '7 Days' },
                { id: '30d', label: lang === 'th' ? '30 วัน' : '30 Days' },
                { id: 'custom', label: lang === 'th' ? 'กำหนดเอง' : 'Custom' },
                { id: 'never', label: lang === 'th' ? 'ไม่หมดอายุ' : 'Never' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setExpiryPreset(opt.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    expiryPreset === opt.id
                      ? 'bg-[#b30253] text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {expiryPreset === 'custom' && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#b30253]" />
                  <span>{lang === 'th' ? 'เลือกวันและเวลาที่ต้องการให้หมดอายุ:' : 'Select Expiration Date & Time:'}</span>
                </label>
                <input
                  type="datetime-local"
                  value={customExpiryDate}
                  onChange={(e) => setCustomExpiryDate(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-[#b30253]"
                  required={expiryPreset === 'custom'}
                />
              </div>
            )}
          </div>

          {/* Section 4: Download Limit Settings */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>
                {lang === 'th'
                  ? '4. จำกัดจำนวนครั้งในการดาวน์โหลด (Download Limits)'
                  : '4. Download Limits'}
              </span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {[
                { id: '1', label: lang === 'th' ? '1 ครั้ง (ครั้งเดียว)' : '1 Time' },
                { id: '5', label: '5 ครั้ง' },
                { id: '10', label: '10 ครั้ง' },
                { id: '25', label: '25 ครั้ง' },
                { id: '50', label: lang === 'th' ? '50 ครั้ง' : '50 Times' },
                { id: 'custom', label: lang === 'th' ? 'กำหนดเอง' : 'Custom' },
                { id: 'unlimited', label: lang === 'th' ? 'ไม่จำกัด' : 'Unlimited' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDownloadLimitPreset(opt.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    downloadLimitPreset === opt.id
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {downloadLimitPreset === 'custom' && (
              <div className="pt-2 max-w-xs">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'th' ? 'จำนวนครั้งสูงสุด:' : 'Max downloads count:'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={customDownloadLimit}
                  onChange={(e) => setCustomDownloadLimit(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-[#b30253]"
                />
              </div>
            )}
          </div>

          {/* Section 5: Note for Recipient */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              {lang === 'th'
                ? '5. ข้อความชี้แจงสำหรับผู้รับ (แสดงในหน้าดาวน์โหลด):'
                : '5. Note / Notice for Recipients:'}
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="เช่น สำหรับอาจารย์ผู้สอนประจำวิชา..."
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-[#b30253]"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button in MCU Primary Gradient */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl btn-mcu-primary text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{lang === 'th' ? 'กำลังสร้างลิงก์...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>
                    {lang === 'th'
                      ? 'บันทึกและสร้างลิงก์แชร์ที่มีการป้องกัน'
                      : 'Generate Protected Share Link'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
