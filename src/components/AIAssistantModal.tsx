import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  X,
  FileSpreadsheet,
  Download,
  Eye,
  Bot,
  ArrowRight,
  GraduationCap,
  Lightbulb,
} from 'lucide-react';
import { DriveFileItem } from '../types/share';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareId: string;
  onDownloadFile: (file: DriveFileItem) => void;
  onPreviewFile: (file: DriveFileItem) => void;
  lang: 'th' | 'en';
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  shareId,
  onDownloadFile,
  onPreviewFile,
  lang,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [recommendedFiles, setRecommendedFiles] = useState<DriveFileItem[]>([]);
  const [isAiPowered, setIsAiPowered] = useState<boolean>(false);

  if (!isOpen) return null;

  const sampleQuestions = [
    'ใบกรอกคะแนน คณะพุทธศาสตร์ ชั้นปีที่ 1',
    'สาขาวิชารัฐประศาสนศาสตร์ นิสิตคฤหัสถ์',
    'แบบฟอร์มสำหรับนิสิตบรรพชิต ปี 3',
    'แบบฟอร์มชั้นปีที่ 4 ทุกสาขาวิชา',
  ];

  const handleSearch = async (textToSearch?: string) => {
    const q = textToSearch || query;
    if (!q.trim()) return;

    setIsLoading(true);
    setReply(null);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.trim(), shareId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReply(data.reply);
        setRecommendedFiles(data.recommendedFiles || []);
        setIsAiPowered(Boolean(data.isAiPowered));
      } else {
        setReply(data.message || 'ไม่พบข้อมูลที่ตรงกับคำค้นหา');
        setRecommendedFiles([]);
      }
    } catch {
      setReply('เกิดข้อผิดพลาดในการเชื่อมต่อกับผู้ช่วย AI');
      setRecommendedFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-md border border-white/60 rounded-[28px] shadow-[0_20px_50px_rgba(171,71,188,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-purple-100 bg-gradient-to-r from-purple-50/80 via-pink-50/50 to-purple-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ec407a] to-[#ab47bc] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[#4a148c]">
                  {lang === 'th' ? 'ผู้ช่วย AI ค้นหาแบบฟอร์มเอกสาร' : 'AI Academic Document Assistant'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  Gemini AI
                </span>
              </div>
              <p className="text-[11px] text-[#7b1fa2]/80 font-medium">
                {lang === 'th'
                  ? 'พิมพ์ค้นหาด้วยภาษาพูดหรือวิชาที่ท่านสอน ระบบจะค้นหาและแนะนำไฟล์ให้ทันที'
                  : 'Ask in natural language to find the exact grading form you need'}
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

        {/* Search input area */}
        <div className="p-5 border-b border-purple-100 bg-[#fce4ec]/30">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="relative"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                lang === 'th'
                  ? 'พิมพ์ เช่น "สอนวิชาพุทธ ป.ตรี ปี 1 คณะพุทธศาสตร์"...'
                  : 'Type e.g. "Buddhist studies year 1 monk students"...'
              }
              className="w-full pl-4 pr-24 py-3 rounded-2xl border-2 border-transparent focus:border-[#ec407a] bg-white text-[#4a148c] placeholder-[#ab47bc]/60 text-xs sm:text-sm outline-none transition-all shadow-xs"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl btn-mcu-primary disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>{lang === 'th' ? 'ค้นหา' : 'Search'}</span>
                </>
              )}
            </button>
          </form>

          {/* Sample questions */}
          <div className="mt-3">
            <p className="text-[11px] text-[#7b1fa2] font-semibold mb-1.5 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>{lang === 'th' ? 'ตัวอย่างคำถามที่พบบ่อย:' : 'Suggested prompts:'}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sampleQuestions.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(sample);
                    handleSearch(sample);
                  }}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-pink-50 border border-purple-200 hover:border-[#ec407a] text-[#7b1fa2] hover:text-[#c2185b] text-[11px] font-medium transition-colors cursor-pointer shadow-2xs"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full border-3 border-[#ec407a] border-t-transparent animate-spin mb-3" />
              <p className="text-xs font-semibold text-[#4a148c]">
                {lang === 'th' ? 'กำลังวิเคราะห์คำถามและค้นหาไฟล์...' : 'Analyzing query & matching files...'}
              </p>
              <p className="text-[11px] text-[#7b1fa2]/70 mt-0.5">
                {lang === 'th' ? 'ระบบกำลังเลือกไฟล์ที่ตรงกับวิชาของท่านที่สุด' : 'Matching official academic forms'}
              </p>
            </div>
          )}

          {!isLoading && reply && (
            <div className="space-y-3.5">
              {/* AI Advice Bubble */}
              <div className="p-4 rounded-2xl bg-[#fce4ec]/50 border border-[#f8bbd0] text-xs text-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ec407a] to-[#ab47bc] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[#4a148c]">
                      {lang === 'th' ? 'คำแนะนำจากผู้ช่วย AI:' : 'AI Assistant Recommendation:'}
                    </span>
                    {isAiPowered && (
                      <span className="text-[10px] text-[#c2185b] font-bold bg-pink-100 px-2 py-0.5 rounded-full border border-pink-200">
                        Gemini Pro
                      </span>
                    )}
                  </div>
                  <p className="text-[#4a148c] leading-relaxed font-medium">{reply}</p>
                </div>
              </div>

              {/* Recommended File Cards */}
              {recommendedFiles.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#4a148c] uppercase tracking-wider mb-2">
                    {lang === 'th' ? 'ไฟล์แบบฟอร์มที่แนะนำ' : 'Recommended Documents'} ({recommendedFiles.length})
                  </h4>
                  <div className="space-y-2">
                    {recommendedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-3.5 rounded-2xl border border-purple-100 bg-white hover:border-[#ec407a] hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {file.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px]">
                              {file.faculty && (
                                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-[#7b1fa2] font-semibold border border-purple-100">
                                  {file.faculty}
                                </span>
                              )}
                              {file.studentType && (
                                <span className="px-2 py-0.5 rounded-full bg-pink-50 text-[#c2185b] font-semibold border border-pink-200">
                                  {file.studentType}
                                </span>
                              )}
                              {file.year && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                                  ปี {file.year}
                                </span>
                              )}
                              <span className="text-slate-400 font-mono">• {file.size}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => onPreviewFile(file)}
                            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{lang === 'th' ? 'ดูตัวอย่าง' : 'Preview'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDownloadFile(file)}
                            className="px-3 py-1.5 rounded-full btn-mcu-success text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{lang === 'th' ? 'ดาวน์โหลด' : 'Download'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!isLoading && !reply && (
            <div className="py-10 text-center text-slate-400">
              <Sparkles className="w-10 h-10 mx-auto text-amber-400/80 mb-2" />
              <p className="text-xs font-medium text-[#4a148c]">
                {lang === 'th'
                  ? 'พิมพ์วิชาหรือรายละเอียดที่ต้องการ เพื่อให้ AI ค้นหาแบบฟอร์ม'
                  : 'Ask AI to instantly locate your score grading sheets'}
              </p>
              <p className="text-[11px] text-[#7b1fa2]/70 mt-0.5">
                {lang === 'th'
                  ? 'เช่น "อาจารย์สอนสาขาปรัชญา ปี 2" หรือ "นิสิตคฤหัสถ์ รัฐประศาสนศาสตร์"'
                  : 'Supports natural language queries in Thai and English'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
