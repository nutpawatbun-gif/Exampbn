import React from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  PlusCircle,
  GraduationCap,
  Calendar,
  User,
  BookOpen,
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import { GradeSubmission } from '../types/share';
import { DEFAULT_DRIVE_FOLDER_URL } from '../data/defaultDriveFolder';

interface SubmittedGradesListProps {
  submissions: GradeSubmission[];
  onBackToSubmit: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lang: 'th' | 'en';
  isAdmin?: boolean;
}

export const SubmittedGradesList: React.FC<SubmittedGradesListProps> = ({
  submissions,
  onBackToSubmit,
  onRefresh,
  isRefreshing = false,
  lang,
  isAdmin = false,
}) => {
  const effectiveIsAdmin = Boolean(
    isAdmin || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('mcu_admin_token'))
  );
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
      {/* Header bar */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-white/60 shadow-[0_15px_35px_rgba(171,71,188,0.12),0_5px_15px_rgba(0,0,0,0.04)] p-5 md:p-6 mb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ec407a] to-[#ab47bc] text-white flex items-center justify-center shrink-0 shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>ระบบตรวจสอบไฟล์เรียลไทม์</span>
                </span>
                <span className="text-xs text-[#7b1fa2] font-semibold">
                  • ตรวจพบไฟล์จริง {submissions.length} รายการ
                </span>
              </div>
              <h1 className="text-lg md:text-xl font-bold text-[#4a148c] tracking-tight">
                {lang === 'th'
                  ? '📋 ตารางแสดงสถานะรายการวิชาที่อัพโหลดแล้ว'
                  : 'Submitted Grade Sheets History'}
              </h1>
              <p className="text-xs text-[#7b1fa2]/80 mt-0.5">
                วิทยาลัยสงฆ์พ่อขุนผาเมือง เพชรบูรณ์ • ตรวจสอบความมีอยู่จริงของไฟล์อัตโนมัติ (ไม่แสดงรายการที่ไม่มีไฟล์จริง)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Go to Storage Folder in Google Drive */}
            <a
              href={DEFAULT_DRIVE_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="เปิดโฟลเดอร์จัดเก็บไฟล์ทั้งหมดใน Google Drive"
            >
              <FolderOpen className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'th' ? '📁 ไปยังโฟลเดอร์เก็บไฟล์' : 'Storage Folder'}</span>
            </a>

            {/* Realtime manual refresh button */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="px-3.5 py-2 rounded-2xl bg-white hover:bg-purple-50 border border-purple-200 text-[#7b1fa2] hover:text-[#4a148c] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                title="ตรวจสอบสถานะไฟล์แบบเรียลไทม์ทันที"
              >
                <span className={`inline-block ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
                <span>{isRefreshing ? 'กำลังตรวจสอบ...' : 'ตรวจสอบเรียลไทม์'}</span>
              </button>
            )}

            {/* Back to submit button */}
            <button
              type="button"
              onClick={onBackToSubmit}
              className="px-4 py-2 rounded-2xl btn-mcu-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{lang === 'th' ? 'ส่งคืนใบเกรดเพิ่ม' : 'Submit Another'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7-Column Official Data Table & Mobile Responsive Cards */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-white/60 shadow-[0_15px_35px_rgba(171,71,188,0.12),0_5px_15px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Mobile View (< md) */}
        <div className="md:hidden divide-y divide-purple-100">
          {submissions.length === 0 ? (
            <div className="py-12 px-4 text-center text-slate-500">
              <FileSpreadsheet className="w-10 h-10 text-purple-300 mx-auto mb-2" />
              <p className="font-bold text-[#4a148c] text-sm">
                ยังไม่มีรายการส่งคืนใบกรอกเกรดในระบบ
              </p>
              <p className="text-xs text-[#7b1fa2]/70 mt-1">
                เมื่ออาจารย์อัปโหลดใบเกรดผ่านระบบ รายการและสถานะจะปรากฏทันที
              </p>
              <button
                type="button"
                onClick={onBackToSubmit}
                className="mt-4 px-4 py-2 rounded-full btn-mcu-primary text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>คลิกเพื่อส่งคืนใบเกรดตอนนี้</span>
              </button>
            </div>
          ) : (
            submissions.map((item, idx) => (
              <div key={`m-sub-${item.id}`} className="p-4 bg-white">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-[#7b1fa2] font-semibold">
                      #{idx + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#4a148c] font-bold text-[10px] border border-purple-200">
                      {item.year}
                    </span>
                    {item.studentGroup && (
                      <span className="px-2 py-0.5 rounded-full bg-pink-100 text-[#c2185b] font-bold text-[10px] border border-pink-200">
                        {item.studentGroup}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-[#c2185b] text-xs">
                    {item.subjectCode}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-xs leading-snug">
                  {item.subjectName}
                </h3>
                <p className="text-[11px] text-[#7b1fa2]/80 mt-0.5">
                  {item.department}
                </p>

                <div className="mt-2.5 pt-2 border-t border-purple-50 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-slate-500">ผู้สอน: </span>
                    <span className="font-semibold text-slate-800">{item.lecturerName}</span>
                  </div>
                  <div className="text-slate-500">
                    {new Date(item.submittedAt).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: '2-digit',
                    })}
                  </div>
                </div>

                {effectiveIsAdmin && (
                  <div className="mt-2 pt-2 border-t border-purple-50 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Google Drive</span>
                    </span>
                    <a
                      href={
                        item.googleDriveFileUrl ||
                        (item.googleDriveFileId
                          ? `https://drive.google.com/file/d/${item.googleDriveFileId}/view`
                          : DEFAULT_DRIVE_FOLDER_URL)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200"
                    >
                      <ExternalLink className="w-3 h-3 text-emerald-600" />
                      <span>เปิดดูไฟล์</span>
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Header (7 columns exactly as specified) */}
            <thead>
              <tr className="bg-gradient-to-r from-purple-50/90 via-pink-50/60 to-purple-50/90 border-b border-purple-100 text-[#4a148c] font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3.5 px-4 text-center w-16 shrink-0">ลำดับ</th>
                <th className="py-3.5 px-4 whitespace-nowrap">ชั้นปี</th>
                <th className="py-3.5 px-4 whitespace-nowrap">รหัสวิชา</th>
                <th className="py-3.5 px-5">วิชา</th>
                <th className="py-3.5 px-5">ผู้บรรยาย</th>
                <th className="py-3.5 px-4">ผู้อัพโหลด</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right">วันเดือนปี</th>
                {effectiveIsAdmin && (
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Drive (Admin)</th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-purple-50">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={effectiveIsAdmin ? 8 : 7} className="py-14 text-center text-slate-500">
                    <FileSpreadsheet className="w-12 h-12 text-purple-300 mx-auto mb-2" />
                    <p className="font-bold text-[#4a148c] text-sm">
                      ยังไม่มีรายการส่งคืนใบกรอกเกรดในระบบ
                    </p>
                    <p className="text-xs text-[#7b1fa2]/70 mt-1">
                      เมื่ออาจารย์อัปโหลดใบเกรดผ่านระบบ รายการและสถานะจะปรากฏในตารางนี้ทันที
                    </p>
                    <button
                      type="button"
                      onClick={onBackToSubmit}
                      className="mt-4 px-4 py-2 rounded-full btn-mcu-primary text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>คลิกเพื่อส่งคืนใบเกรดตอนนี้</span>
                    </button>
                  </td>
                </tr>
              ) : (
                submissions.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      idx % 2 === 0
                        ? 'bg-white hover:bg-purple-50/50'
                        : 'bg-purple-50/20 hover:bg-purple-50/60'
                    }`}
                  >
                    {/* 1. ลำดับ */}
                    <td className="py-3.5 px-4 text-center font-bold text-[#7b1fa2]">
                      {idx + 1}
                    </td>

                    {/* 2. ชั้นปี */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-100 text-[#4a148c] font-bold text-[11px] border border-purple-200">
                          {item.year}
                        </span>
                        {item.studentGroup && (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-pink-100 text-[#c2185b] font-bold text-[10px] border border-pink-200">
                            {item.studentGroup}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. รหัสวิชา */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-[#c2185b]">
                      {item.subjectCode}
                    </td>

                    {/* 4. วิชา */}
                    <td className="py-3.5 px-5">
                      <div>
                        <span className="font-bold text-slate-900 block leading-snug">
                          {item.subjectName}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#7b1fa2]/70 mt-0.5">
                          <span>{item.department}</span>
                          {(item.semester || item.academicYear) && (
                            <span>
                              • {item.semester ? `ภาค ${item.semester}` : ''}
                              {item.semester && item.academicYear ? '/' : ''}
                              {item.academicYear ? `${item.academicYear}` : ''}
                            </span>
                          )}
                          {item.studentCount != null && item.studentCount > 0 && (
                            <span>• {item.studentCount} คน</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 5. ผู้บรรยาย */}
                    <td className="py-3.5 px-5 font-semibold text-slate-800">
                      {item.lecturerName}
                    </td>

                    {/* 6. ผู้อัพโหลด */}
                    <td className="py-3.5 px-4 font-semibold text-[#7b1fa2]">
                      {item.uploaderName}
                    </td>

                    {/* 7. วันเดือนปี */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-600 font-medium">
                      {new Date(item.submittedAt).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      ,{' '}
                      {new Date(item.submittedAt).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      น.
                    </td>

                    {/* 8. Google Drive (Admin Only) */}
                    {effectiveIsAdmin && (
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <a
                          href={
                            item.googleDriveFileUrl ||
                            (item.googleDriveFileId
                              ? `https://drive.google.com/file/d/${item.googleDriveFileId}/view`
                              : DEFAULT_DRIVE_FOLDER_URL)
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 transition-colors shadow-2xs"
                          title="เปิดไฟล์ใน Google Drive"
                        >
                          <ExternalLink className="w-3 h-3 text-emerald-600" />
                          <span>ดูใน Drive</span>
                        </a>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="bg-purple-50/40 px-5 py-3 border-t border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#7b1fa2]">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              🔒 ระบบรักษาความลับทางการศึกษา: ไม่แสดงปุ่มดาวน์โหลดหรือเปิดดูเนื้อหาคะแนน
            </span>
          </div>

          <div>
            <span className="font-bold">
              รวมทั้งหมด {submissions.length} รายวิชา
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
