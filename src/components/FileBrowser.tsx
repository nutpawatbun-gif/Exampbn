import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Eye,
  Search,
  Filter,
  CheckSquare,
  Square,
  Archive,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  GraduationCap,
  Building2,
  Users,
  Calendar,
  Check,
  Sparkles,
} from 'lucide-react';
import JSZip from 'jszip';
import { SharePackage, DriveFileItem, GradeSubmission } from '../types/share';
import { getTimeRemaining, formatThaiDateTime } from '../utils/timeFormat';
import { FilePreviewModal } from './FilePreviewModal';
import { AIAssistantModal } from './AIAssistantModal';

interface FileBrowserProps {
  share: SharePackage;
  onLock: () => void;
  onUpdateShareStats: (totalDownloads: number) => void;
  lang: 'th' | 'en';
  submittedSubmissions?: GradeSubmission[];
  onNavigateToReturn?: (prefillItem?: DriveFileItem) => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  share,
  onLock,
  onUpdateShareStats,
  lang,
  submittedSubmissions = [],
  onNavigateToReturn,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('all');
  const [selectedStudentType, setSelectedStudentType] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<DriveFileItem | null>(null);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Time remaining tracker
  const [timeLeft, setTimeLeft] = useState(
    getTimeRemaining(share.security.expiresAt)
  );

  useEffect(() => {
    if (!share.security.expiresAt) return;
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(share.security.expiresAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [share.security.expiresAt]);

  const isExpired = share.security.expiresAt !== null && timeLeft.isExpired;

  const maxDownloads = share.security.maxDownloads;
  const currentDownloads = share.stats.totalDownloadsCount;
  const remainingDownloads =
    maxDownloads !== null && maxDownloads !== undefined
      ? Math.max(0, maxDownloads - currentDownloads)
      : null;
  const isLimitReached =
    maxDownloads !== null &&
    maxDownloads !== undefined &&
    currentDownloads >= maxDownloads;

  // Filtered files
  const filteredFiles = share.files.filter((file) => {
    const matchesSearch =
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (file.faculty && file.faculty.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (file.department && file.department.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFaculty =
      selectedFaculty === 'all' || file.faculty === selectedFaculty;

    const matchesStudentType =
      selectedStudentType === 'all' || file.studentType === selectedStudentType;

    const matchesYear =
      selectedYear === 'all' || file.year === selectedYear;

    return matchesSearch && matchesFaculty && matchesStudentType && matchesYear;
  });

  const handleSelectAll = () => {
    if (selectedFileIds.length === filteredFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(filteredFiles.map((f) => f.id));
    }
  };

  const toggleSelectFile = (id: string) => {
    if (selectedFileIds.includes(id)) {
      setSelectedFileIds(selectedFileIds.filter((item) => item !== id));
    } else {
      setSelectedFileIds([...selectedFileIds, id]);
    }
  };

  // Single file download
  const handleDownloadFile = async (file: DriveFileItem) => {
    if (isExpired) {
      setDownloadError(
        lang === 'th' ? 'ลิงก์นี้หมดอายุแล้ว ไม่สามารถดาวน์โหลดได้' : 'Link expired'
      );
      return;
    }

    if (isLimitReached) {
      setDownloadError(
        lang === 'th'
          ? 'จำนวนการดาวน์โหลดครบโควต้าที่กำหนดแล้ว'
          : 'Download quota limit reached'
      );
      return;
    }

    setDownloadingId(file.id);
    setDownloadError(null);

    try {
      const res = await fetch(`/api/shares/${share.id}/record-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id, count: 1 }),
      });

      if (res.ok) {
        const data = await res.json();
        onUpdateShareStats(data.totalDownloadsCount);
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.message) {
          setDownloadError(data.message);
          setDownloadingId(null);
          return;
        }
      }

      // Direct download trigger
      const directUrl = `https://drive.usercontent.google.com/download?id=${file.id}&export=download`;
      const a = document.createElement('a');
      a.href = directUrl;
      a.target = '_blank';
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      const directUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
      window.open(directUrl, '_blank');
      onUpdateShareStats(currentDownloads + 1);
    } finally {
      setTimeout(() => setDownloadingId(null), 1000);
    }
  };

  // Batch Zip download
  const handleDownloadZip = async () => {
    const filesToDownload = share.files.filter((f) =>
      selectedFileIds.includes(f.id)
    );
    if (filesToDownload.length === 0) return;

    if (isExpired || isLimitReached) {
      setDownloadError(
        lang === 'th'
          ? 'ไม่สามารถดาวน์โหลดได้เนื่องจากหมดอายุหรือเกินโควต้า'
          : 'Cannot download'
      );
      return;
    }

    setIsZipping(true);
    setZipProgress(0);
    setDownloadError(null);

    try {
      const zip = new JSZip();
      let completed = 0;

      for (const file of filesToDownload) {
        try {
          const res = await fetch(`/api/shares/${share.id}/file-stream/${file.id}`);
          if (res.ok) {
            const blob = await res.blob();
            zip.file(file.name, blob);
          } else {
            console.warn(`Could not proxy ${file.name}`);
          }
        } catch (err) {
          console.error(`Failed to fetch ${file.name}`, err);
        }
        completed++;
        setZipProgress(Math.round((completed / filesToDownload.length) * 100));
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `${share.title.replace(/[\s/\\?%*:|"<>]/g, '_')}_ไฟล์ที่เลือก.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);

      const res = await fetch(`/api/shares/${share.id}/record-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: filesToDownload.length }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdateShareStats(data.totalDownloadsCount);
      }
    } catch (err) {
      console.error('ZIP error:', err);
      setDownloadError(
        lang === 'th' ? 'เกิดข้อผิดพลาดในการรวมไฟล์ ZIP' : 'Failed to create ZIP file'
      );
    } finally {
      setIsZipping(false);
      setZipProgress(0);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header Info Panel */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-white/60 shadow-[0_15px_35px_rgba(171,71,188,0.12),0_5px_15px_rgba(0,0,0,0.04)] p-5 md:p-6 mb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="https://www.mcu.ac.th/directory_template_frontend/img/logo-v6-th.png"
              alt="MCU Logo"
              className="h-12 w-auto object-contain shrink-0 hidden sm:block drop-shadow-sm"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {lang === 'th' ? 'ยืนยันรหัสผ่านแล้ว' : 'Authenticated'}
                  </span>
                </span>
                <span className="text-xs text-[#7b1fa2] font-semibold">
                  • {share.files.length} รายการเอกสาร
                </span>
              </div>
              <h1 className="text-lg md:text-xl font-bold text-[#4a148c] tracking-tight">
                {share.title}
              </h1>
              <p className="text-xs text-[#7b1fa2]/80 mt-0.5">
                วิทยาลัยสงฆ์พ่อขุนผาเมือง เพชรบูรณ์ • คณะพุทธศาสตร์ และ คณะสังคมศาสตร์
              </p>
            </div>
          </div>

          {/* Quick Metrics & Lock Button */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 text-xs">
            {/* Expiry Pill */}
            <div className="px-3.5 py-1.5 rounded-xl bg-[#fce4ec]/60 border border-[#f8bbd0] flex items-center gap-1.5 text-[#4a148c] font-medium">
              <Clock className="w-3.5 h-3.5 text-[#ec407a]" />
              <span>
                {isExpired
                  ? lang === 'th'
                    ? 'หมดอายุแล้ว'
                    : 'Expired'
                  : share.security.expiresAt
                  ? `หมดอายุ: ${timeLeft.formattedText}`
                  : 'ไม่หมดอายุ'}
              </span>
            </div>

            {/* Downloads Limit Pill */}
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center gap-1.5 text-emerald-800 font-medium">
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {maxDownloads !== null && maxDownloads !== undefined
                  ? `ดาวน์โหลด: ${currentDownloads}/${maxDownloads}`
                  : `ดาวน์โหลดแล้ว: ${currentDownloads}`}
              </span>
            </div>

            {/* Lock Button */}
            <button
              type="button"
              onClick={onLock}
              className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[#7b1fa2] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-[#ab47bc]" />
              <span>{lang === 'th' ? 'ล็อกหน้า' : 'Lock'}</span>
            </button>
          </div>
        </div>

        {downloadError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{downloadError}</span>
          </div>
        )}
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-white/60 shadow-[0_15px_35px_rgba(171,71,188,0.1),0_5px_15px_rgba(0,0,0,0.03)] p-4 md:p-5 mb-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search box & AI Assistant Trigger */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#ab47bc] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  lang === 'th'
                    ? 'ค้นหาชื่อแบบฟอร์ม สาขาวิชา เช่น พระพุทธศาสนา, รัฐประศาสนศาสตร์...'
                    : 'Search document name, department...'
                }
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#fce4ec]/70 border-2 border-transparent focus:border-[#ec407a] focus:bg-white text-[#4a148c] placeholder-[#ab47bc]/60 text-xs outline-none transition-all font-medium"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAIAssistantOpen(true)}
              className="px-4 py-2.5 rounded-2xl btn-mcu-primary text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              title={lang === 'th' ? 'ผู้ช่วย AI ค้นหาเอกสาร' : 'AI Document Assistant'}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>{lang === 'th' ? 'AI ช่วยค้นหา' : 'AI Assistant'}</span>
            </button>
          </div>

          {/* Action Buttons: Batch Download & Selection Count */}
          <div className="flex items-center gap-2 justify-between lg:justify-end">
            <span className="text-xs text-[#7b1fa2] font-medium">
              พบ {filteredFiles.length} รายการ
              {selectedFileIds.length > 0 && (
                <strong className="text-[#c2185b] ml-1 font-bold">
                  (เลือกแล้ว {selectedFileIds.length})
                </strong>
              )}
            </span>

            {selectedFileIds.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={isZipping || isExpired || isLimitReached}
                className="px-4 py-2 rounded-2xl btn-mcu-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isZipping ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{zipProgress}%</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลดที่เลือกเป็น ZIP</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns / Quick Tabs */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-purple-100 text-xs">
          {/* Faculty select */}
          <div className="flex items-center gap-1">
            <span className="text-[#4a148c] font-semibold flex items-center gap-1 mr-1">
              <Building2 className="w-3.5 h-3.5 text-[#ec407a]" />
              <span>คณะ:</span>
            </span>
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#fce4ec]/60 border border-[#f8bbd0] text-[#4a148c] font-medium text-xs outline-none focus:border-[#ec407a] focus:bg-white"
            >
              <option value="all">ทุกคณะ</option>
              <option value="คณะพุทธศาสตร์">คณะพุทธศาสตร์</option>
              <option value="คณะสังคมศาสตร์">คณะสังคมศาสตร์</option>
            </select>
          </div>

          {/* Student type select */}
          <div className="flex items-center gap-1 ml-1 sm:ml-2">
            <span className="text-[#4a148c] font-semibold flex items-center gap-1 mr-1">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              <span>กลุ่มผู้เรียน:</span>
            </span>
            <select
              value={selectedStudentType}
              onChange={(e) => setSelectedStudentType(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#fce4ec]/60 border border-[#f8bbd0] text-[#4a148c] font-medium text-xs outline-none focus:border-[#ec407a] focus:bg-white"
            >
              <option value="all">ทั้งหมด</option>
              <option value="บรรพชิต">บรรพชิต (พระภิกษุสามเณร)</option>
              <option value="คฤหัสถ์">คฤหัสถ์ (ฆราวาส)</option>
            </select>
          </div>

          {/* Year select */}
          <div className="flex items-center gap-1 ml-1 sm:ml-2">
            <span className="text-[#4a148c] font-semibold flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-[#ab47bc]" />
              <span>ชั้นปี:</span>
            </span>
            <select
              value={selectedYear}
              onChange={(e) =>
                setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="px-3 py-1.5 rounded-xl bg-[#fce4ec]/60 border border-[#f8bbd0] text-[#4a148c] font-medium text-xs outline-none focus:border-[#ec407a] focus:bg-white"
            >
              <option value="all">ทุกชั้นปี</option>
              <option value="1">ชั้นปีที่ 1</option>
              <option value="2">ชั้นปีที่ 2</option>
              <option value="3">ชั้นปีที่ 3</option>
              <option value="4">ชั้นปีที่ 4</option>
            </select>
          </div>

          {/* Reset filter button if any filter applied */}
          {(selectedFaculty !== 'all' || selectedStudentType !== 'all' || selectedYear !== 'all' || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setSelectedFaculty('all');
                setSelectedStudentType('all');
                setSelectedYear('all');
                setSearchTerm('');
              }}
              className="ml-auto text-xs text-[#ec407a] hover:text-[#c2185b] hover:underline font-semibold cursor-pointer"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Official Document Data Table */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-white/60 shadow-[0_15px_35px_rgba(171,71,188,0.12),0_5px_15px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Header */}
            <thead>
              <tr className="bg-gradient-to-r from-purple-50/90 via-pink-50/60 to-purple-50/90 border-b border-purple-100 text-[#4a148c] font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3.5 px-3.5 text-center w-14 shrink-0">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="cursor-pointer text-slate-400 hover:text-[#ec407a]"
                      title="เลือกทั้งหมด"
                    >
                      {selectedFileIds.length === filteredFiles.length &&
                      filteredFiles.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[#ec407a]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <span>#</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 font-bold text-[#4a148c]">
                  ชื่อแบบฟอร์มเอกสาร (.xls)
                </th>
                <th className="py-3.5 px-4 font-bold text-[#4a148c] whitespace-nowrap">
                  คณะ / สาขาวิชา
                </th>
                <th className="py-3.5 px-3 font-bold text-[#4a148c] text-center whitespace-nowrap">
                  กลุ่มผู้เรียน
                </th>
                <th className="py-3.5 px-3 font-bold text-[#4a148c] text-center whitespace-nowrap">
                  ชั้นปี
                </th>
                <th className="py-3.5 px-3 font-bold text-[#4a148c] text-center whitespace-nowrap">
                  ขนาด
                </th>
                <th className="py-3.5 px-4 font-bold text-[#4a148c] text-right whitespace-nowrap">
                  ดำเนินการ
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-purple-50">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <FileSpreadsheet className="w-10 h-10 text-purple-300 mx-auto mb-2" />
                    <p className="font-semibold text-[#4a148c]">
                      ไม่พบแบบฟอร์มที่ตรงกับเงื่อนไขการค้นหา
                    </p>
                    <p className="text-[11px] text-[#7b1fa2]/70 mt-1">
                      กรุณาลองปรับเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองคณะ/ชั้นปี
                    </p>
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file, idx) => {
                  const isSelected = selectedFileIds.includes(file.id);
                  const isThisDownloading = downloadingId === file.id;

                  return (
                    <tr
                      key={file.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-pink-100/40'
                          : idx % 2 === 0
                          ? 'bg-white hover:bg-purple-50/50'
                          : 'bg-purple-50/20 hover:bg-purple-50/60'
                      }`}
                    >
                      {/* 1. Checkbox & Sequence */}
                      <td className="py-3.5 px-3.5 text-center text-slate-500 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleSelectFile(file.id)}
                            className="cursor-pointer text-slate-400 hover:text-[#ec407a]"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#ec407a]" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                            )}
                          </button>
                          <span className="font-mono text-[#7b1fa2]/60 text-[11px]">
                            {idx + 1}
                          </span>
                        </div>
                      </td>

                      {/* 2. Document Title with Excel Icon */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-[#107c41] flex items-center justify-center shrink-0 shadow-2xs">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-900 block leading-snug hover:text-[#ec407a] transition-colors">
                                {file.name}
                              </span>
                              {/* [ส่งเกรดแล้ว ✔️] Badge if submitted */}
                              {submittedSubmissions.some((s) => {
                                const yrMatch = s.year && file.year && s.year.includes(String(file.year));
                                const deptMatch = s.department && file.department && (s.department.includes(file.department) || file.department.includes(s.department));
                                return yrMatch && deptMatch;
                              }) && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs shrink-0 animate-in fade-in">
                                  <Check className="w-3 h-3 text-emerald-700" />
                                  <span>ส่งเกรดแล้ว ✔️</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Faculty / Department */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <div>
                          <span className="font-medium text-slate-800 block">
                            {file.faculty || '-'}
                          </span>
                          <span className="text-[11px] text-[#7b1fa2]/70">
                            {file.department || '-'}
                          </span>
                        </div>
                      </td>

                      {/* 4. Student Type (บรรพชิต / คฤหัสถ์) */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {file.studentType ? (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                              file.studentType === 'บรรพชิต'
                                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                                : 'bg-sky-50 border border-sky-200 text-sky-800'
                            }`}
                          >
                            {file.studentType}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 5. Year */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {file.year ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[#4a148c] font-semibold text-[11px]">
                            ปี {file.year}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 6. File Size */}
                      <td className="py-3.5 px-3 text-center text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {file.size}
                      </td>

                      {/* 7. Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Button in Pill Style */}
                          <button
                            type="button"
                            onClick={() => setPreviewFile(file)}
                            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium flex items-center gap-1 shadow-sm transition-all cursor-pointer text-xs"
                            title="ดูตัวอย่างเอกสาร"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ดูตัวอย่าง</span>
                          </button>

                          {/* Direct Download Button in MCU Success Style */}
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(file)}
                            disabled={isThisDownloading || isExpired || isLimitReached}
                            className="px-3 py-1.5 rounded-full btn-mcu-success text-white font-semibold flex items-center gap-1 transition-all cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            title="ดาวน์โหลดไฟล์ Excel (.xls)"
                          >
                            {isThisDownloading ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>ดาวน์โหลด</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer info */}
        <div className="bg-purple-50/40 px-5 py-3 border-t border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#7b1fa2]">
          <div>
            <span>
              แสดง {filteredFiles.length} จากทั้งหมด {share.files.length} รายการแบบฟอร์ม
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">
              * ไฟล์ทั้งหมดเป็นแบบฟอร์ม Microsoft Excel (.xls) ทางการ
            </span>
            {selectedFileIds.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={isZipping || isExpired || isLimitReached}
                className="text-xs text-[#c2185b] hover:underline font-bold cursor-pointer"
              >
                ดาวน์โหลด {selectedFileIds.length} ไฟล์ที่เลือก (.ZIP)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownloadFile}
        lang={lang}
      />

      {/* AI Assistant Modal */}
      <AIAssistantModal
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        shareId={share.id}
        onDownloadFile={handleDownloadFile}
        onPreviewFile={(f) => {
          setIsAIAssistantOpen(false);
          setPreviewFile(f);
        }}
        lang={lang}
      />
    </div>
  );
};
