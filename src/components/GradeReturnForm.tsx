import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  GraduationCap,
  Building2,
  BookOpen,
  User,
  Send,
  RefreshCw,
  Eye,
  Check,
} from 'lucide-react';
import { GradeSubmission } from '../types/share';
import { parseGradeSheetData } from '../utils/gradeParser';

interface GradeReturnFormProps {
  onSuccess: (submission: GradeSubmission) => void;
  onViewList: () => void;
  lang: 'th' | 'en';
}

const FACULTY_LIST = [
  'คณะพุทธศาสตร์',
  'คณะสังคมศาสตร์',
  'คณะครุศาสตร์',
  'คณะมนุษยศาสตร์',
];

const DEPARTMENT_LIST = [
  'สาขาวิชาศาสนาและปรัชญา',
  'สาขาวิชาพระพุทธศาสนา',
  'สาขาวิชารัฐประศาสนศาสตร์',
  'สาขาวิชาการจัดการเชิงพุทธ',
  'สาขาวิชารัฐศาสตร์',
  'สาขาวิชาสังคมสงเคราะห์ศาสตร์',
];

export const GradeReturnForm: React.FC<GradeReturnFormProps> = ({
  onSuccess,
  onViewList,
  lang,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState<string>('ปี 1');
  const [faculty, setFaculty] = useState<string>('คณะพุทธศาสตร์');
  const [department, setDepartment] = useState<string>('สาขาวิชารัฐประศาสนศาสตร์');
  const [subjectCode, setSubjectCode] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [lecturerName, setLecturerName] = useState<string>('');
  const [uploaderName, setUploaderName] = useState<string>('');
  const [studentGroup, setStudentGroup] = useState<string>('');
  const [semester, setSemester] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('');
  const [studentCount, setStudentCount] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<GradeSubmission | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute live standard filename preview
  const ext = file ? (file.name.endsWith('.xls') ? '.xls' : '.xlsx') : '.xlsx';
  const cleanYear = year ? year.trim() : 'ปี 1';
  const cleanDept = department ? department.trim() : 'สาขาวิชา';
  const cleanCode = subjectCode ? subjectCode.trim() : 'รหัสวิชา';
  const cleanSubj = subjectName ? subjectName.trim() : 'ชื่อรายวิชา';
  const cleanLecturer = lecturerName ? lecturerName.trim() : 'ชื่ออาจารย์ผู้บรรยาย';

  const groupPrefix = studentGroup ? `(${studentGroup})` : '';
  const liveStandardFileName = `${groupPrefix}(${cleanYear})(${cleanDept})(${cleanCode})(${cleanSubj})(${cleanLecturer})${ext}`;

  // Handle file select and parse Excel automatically
  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMessage(null);
    setParseMessage(null);
    setIsParsing(true);

    let detectedCount = 0;

    // 1. Instant Client-Side Parsing directly in browser (works even offline or on static host)
    try {
      const buffer = await selectedFile.arrayBuffer();
      const parsed = parseGradeSheetData(buffer, selectedFile.name);

      if (parsed.studentGroup) {
        setStudentGroup(parsed.studentGroup);
        detectedCount++;
      }
      if (parsed.year) {
        setYear(parsed.year);
        detectedCount++;
      }
      if (parsed.faculty) {
        setFaculty(parsed.faculty);
        detectedCount++;
      }
      if (parsed.department) {
        setDepartment(parsed.department);
        detectedCount++;
      }
      if (parsed.subjectCode) {
        setSubjectCode(parsed.subjectCode);
        detectedCount++;
      }
      if (parsed.subjectName) {
        setSubjectName(parsed.subjectName);
        detectedCount++;
      }
      if (parsed.lecturerName) {
        setLecturerName(parsed.lecturerName);
        detectedCount++;
      }
      if (parsed.semester) {
        setSemester(parsed.semester);
        detectedCount++;
      }
      if (parsed.academicYear) {
        setAcademicYear(parsed.academicYear);
        detectedCount++;
      }
      if (parsed.studentCount && parsed.studentCount > 0) {
        setStudentCount(String(parsed.studentCount));
        detectedCount++;
      }

      if (detectedCount > 0) {
        setParseMessage(
          lang === 'th'
            ? `ระบบตรวจพบและดึงข้อมูลจากไฟล์เรียบร้อยแล้ว (${detectedCount} หัวข้อ) กรุณาตรวจสอบหรือแก้ไขข้อมูลก่อนกดส่ง`
            : `Excel data parsed successfully (${detectedCount} fields detected)! Please review before submitting.`
        );
      }
    } catch (clientErr) {
      console.warn('Client-side excel parse error:', clientErr);
    }

    // 2. Server-side parsing verification
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/parse-grade-file', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          if (d.studentGroup) setStudentGroup((prev) => prev || d.studentGroup);
          if (d.year) setYear((prev) => prev || d.year);
          if (d.faculty) setFaculty((prev) => prev || d.faculty);
          if (d.department) setDepartment((prev) => prev || d.department);
          if (d.subjectCode) setSubjectCode((prev) => prev || d.subjectCode);
          if (d.subjectName) setSubjectName((prev) => prev || d.subjectName);
          if (d.lecturerName) setLecturerName((prev) => prev || d.lecturerName);
          if (d.semester) setSemester((prev) => prev || d.semester);
          if (d.academicYear) setAcademicYear((prev) => prev || d.academicYear);
          if (d.studentCount && d.studentCount > 0) setStudentCount((prev) => prev || String(d.studentCount));
        }
      }
    } catch (serverErr) {
      console.warn('Server parse optional check:', serverErr);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage(lang === 'th' ? 'กรุณาแนบไฟล์ใบกรอกคะแนน' : 'Please attach your grade file');
      return;
    }
    if (!studentGroup) {
      setErrorMessage(
        lang === 'th'
          ? 'กรุณาเลือกกลุ่ม (บรรพชิต หรือ คฤหัสถ์)'
          : 'Please select a student group (Monk or Layperson)'
      );
      return;
    }
    if (!subjectCode.trim() || !subjectName.trim() || !lecturerName.trim() || !uploaderName.trim()) {
      setErrorMessage(
        lang === 'th'
          ? 'กรุณากรอกรหัสวิชา, รายวิชา, ผู้บรรยาย และผู้อัพโหลดให้ครบถ้วน'
          : 'Please fill in all required fields'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', year);
    formData.append('faculty', faculty);
    formData.append('department', department);
    formData.append('subjectCode', subjectCode);
    formData.append('subjectName', subjectName);
    formData.append('lecturerName', lecturerName);
    formData.append('uploaderName', uploaderName);
    formData.append('studentGroup', studentGroup);
    formData.append('semester', semester);
    formData.append('academicYear', academicYear);
    formData.append('studentCount', studentCount);

    try {
      const res = await fetch('/api/submit-grade', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setSubmittedData(json.submission);
        onSuccess(json.submission);
      } else {
        setErrorMessage(json.message || 'เกิดข้อผิดพลาดในการส่งใบกรอกคะแนน');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 md:py-8">
      {/* Top action shortcut bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-[#c2185b] border border-pink-200 text-xs font-bold mb-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ระบบส่งคืนใบกรอกเกรดออนไลน์' : 'Online Grade Return Portal'}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#4a148c] tracking-tight">
            {lang === 'th' ? 'แบบฟอร์มส่งคืนใบกรอกเกรด (อาจารย์ผู้สอน)' : 'Grade Sheet Submission Form'}
          </h2>
          <p className="text-xs text-[#7b1fa2]/80 mt-0.5">
            วิทยาลัยสงฆ์พ่อขุนผาเมือง เพชรบูรณ์ • อัปโหลดแล้วระบบจะจัดรูปแบบชื่อไฟล์มาตรฐานให้อัตโนมัติ
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Submissions List Button */}
          <button
            type="button"
            onClick={onViewList}
            className="px-4 py-2 rounded-2xl btn-mcu-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{lang === 'th' ? '📋 รายการที่อัพโหลดแล้ว' : 'Submitted List'}</span>
          </button>
        </div>
      </div>

      {submittedData ? (
        /* Submission Success Receipt Card */
        <div className="bg-white/95 backdrop-blur-md rounded-[28px] border border-white/60 shadow-[0_20px_50px_rgba(171,71,188,0.2)] p-6 md:p-8 text-center animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h3 className="text-xl font-bold text-[#4a148c]">
            {lang === 'th' ? 'ส่งคืนใบกรอกเกรดสำเร็จเรียบร้อยแล้ว!' : 'Grade Sheet Submitted Successfully!'}
          </h3>
          <p className="text-xs text-[#7b1fa2] mt-1 max-w-md mx-auto">
            ระบบได้บันทึกข้อมูลและตั้งชื่อไฟล์ตามมาตรฐานทางการศึกษาเรียบร้อยแล้ว ท่านสามารถแคปหน้าจอนี้ไว้เป็นหลักฐาน
          </p>

          <div className="mt-6 p-4 rounded-2xl bg-[#fce4ec]/60 border border-[#f8bbd0] text-left max-w-xl mx-auto space-y-2 text-xs">
            <div className="flex justify-between border-b border-pink-100 pb-2">
              <span className="text-[#7b1fa2] font-semibold">ชื่อไฟล์มาตรฐาน:</span>
              <span className="font-mono font-bold text-[#c2185b] text-right truncate max-w-xs">
                {submittedData.standardFileName}
              </span>
            </div>
            <div className="flex justify-between border-b border-pink-100 pb-2">
              <span className="text-[#7b1fa2] font-semibold">วิชา:</span>
              <span className="font-bold text-[#4a148c]">
                {submittedData.subjectCode} {submittedData.subjectName} ({submittedData.year})
              </span>
            </div>
            <div className="flex justify-between border-b border-pink-100 pb-2">
              <span className="text-[#7b1fa2] font-semibold">สาขาวิชา:</span>
              <span className="font-bold text-[#4a148c]">{submittedData.department}</span>
            </div>
            {submittedData.studentGroup && (
              <div className="flex justify-between border-b border-pink-100 pb-2">
                <span className="text-[#7b1fa2] font-semibold">กลุ่ม:</span>
                <span className="font-bold text-[#4a148c]">{submittedData.studentGroup}</span>
              </div>
            )}
            {(submittedData.semester || submittedData.academicYear) && (
              <div className="flex justify-between border-b border-pink-100 pb-2">
                <span className="text-[#7b1fa2] font-semibold">ภาคเรียน / ปีการศึกษา:</span>
                <span className="font-bold text-[#4a148c]">
                  {submittedData.semester ? `ภาคเรียนที่ ${submittedData.semester}` : ''}
                  {submittedData.semester && submittedData.academicYear ? ' / ' : ''}
                  {submittedData.academicYear ? `ปีการศึกษา ${submittedData.academicYear}` : ''}
                </span>
              </div>
            )}
            {submittedData.studentCount != null && submittedData.studentCount > 0 && (
              <div className="flex justify-between border-b border-pink-100 pb-2">
                <span className="text-[#7b1fa2] font-semibold">จำนวนนิสิต:</span>
                <span className="font-bold text-[#4a148c]">{submittedData.studentCount} คน</span>
              </div>
            )}
            <div className="flex justify-between border-b border-pink-100 pb-2">
              <span className="text-[#7b1fa2] font-semibold">อาจารย์ผู้บรรยาย:</span>
              <span className="font-bold text-[#4a148c]">{submittedData.lecturerName}</span>
            </div>
            <div className="flex justify-between border-b border-pink-100 pb-2">
              <span className="text-[#7b1fa2] font-semibold">ผู้อัพโหลด:</span>
              <span className="font-bold text-[#4a148c]">{submittedData.uploaderName}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-[#7b1fa2] font-semibold">วันเวลาที่ส่ง:</span>
              <span className="font-bold text-slate-800">
                {new Date(submittedData.submittedAt).toLocaleString('th-TH')}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSubmittedData(null);
                setFile(null);
                setSubjectCode('');
                setSubjectName('');
                setLecturerName('');
                setUploaderName('');
                setStudentGroup('');
                setSemester('');
                setAcademicYear('');
                setStudentCount('');
              }}
              className="px-5 py-2.5 rounded-full bg-purple-100 hover:bg-purple-200 text-[#4a148c] text-xs font-bold transition-colors cursor-pointer"
            >
              {lang === 'th' ? 'ส่งวิชาถัดไป' : 'Submit Another'}
            </button>

            <button
              type="button"
              onClick={onViewList}
              className="px-6 py-2.5 rounded-full btn-mcu-primary text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              {lang === 'th' ? 'ดูตารางรายการที่อัพโหลดแล้ว' : 'View Submitted List'}
            </button>
          </div>
        </div>
      ) : (
        /* Main Submission Form */
        <div className="rounded-[28px] bg-white/95 backdrop-blur-md border border-white/60 shadow-[0_15px_35px_rgba(171,71,188,0.15)] p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Drag & Drop File Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#4a148c] flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-[#ec407a]" />
                <span>1. เลือกหรือลากไฟล์ใบกรอกเกรดมาวาง (.xls หรือ .xlsx) *</span>
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  file
                    ? 'border-[#ec407a] bg-[#fce4ec]/40'
                    : 'border-purple-200 hover:border-[#ec407a] bg-purple-50/20 hover:bg-[#fce4ec]/20'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ec407a] to-[#ab47bc] text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                  {isParsing ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-6 h-6" />
                  )}
                </div>

                {file ? (
                  <div>
                    <span className="font-bold text-[#4a148c] text-sm block">
                      {file.name}
                    </span>
                    <span className="text-[11px] text-[#7b1fa2] font-mono mt-0.5 block">
                      ขนาด: {Math.round(file.size / 1024)} KB
                    </span>
                    <span className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      พร้อมดำเนินการ • คลิกเพื่อเปลี่ยนไฟล์
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-[#4a148c]">
                      คลิกเพื่อเลือกไฟล์ หรือลากไฟล์ใบกรอกคะแนนมาวางที่นี่
                    </p>
                    <p className="text-xs text-[#7b1fa2]/80 mt-1">
                      รองรับไฟล์ Microsoft Excel (.xls, .xlsx) ที่กรอกคะแนนเรียบร้อยแล้ว
                    </p>
                  </div>
                )}
              </div>

              {parseMessage && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{parseMessage}</span>
                </div>
              )}
            </div>

            {/* Step 2: Information Fields */}
            <div className="p-5 rounded-2xl bg-[#fce4ec]/40 border border-[#f8bbd0]/70 space-y-4">
              <h3 className="text-sm font-bold text-[#4a148c] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#ec407a]" />
                <span>2. ข้อมูลวิชาและผู้ส่ง (ระบบตรวจจับให้อัตโนมัติและสามารถแก้ไขได้)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Student Group (บรรพชิต / คฤหัสถ์) */}
                <div>
                  <label className="block text-xs font-semibold text-[#4a148c] mb-1">
                    กลุ่มนิสิต (บรรพชิต / คฤหัสถ์) *
                  </label>
                  <select
                    value={studentGroup}
                    onChange={(e) => setStudentGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#f8bbd0] text-[#4a148c] text-xs font-semibold outline-none focus:border-[#ec407a] focus:ring-2 focus:ring-pink-200"
                    required
                  >
                    <option value="">-- กรุณาเลือกกลุ่มนิสิต --</option>
                    <option value="บรรพชิต">บรรพชิต (พระภิกษุ / สามเณร)</option>
                    <option value="คฤหัสถ์">คฤหัสถ์ (บุคคลทั่วไป)</option>
                  </select>
                </div>

                {/* Year select */}
                <div>
                  <label className="block text-xs font-semibold text-[#4a148c] mb-1">
                    ชั้นปี *
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#f8bbd0] text-[#4a148c] text-xs font-semibold outline-none focus:border-[#ec407a] focus:ring-2 focus:ring-pink-200"
                    required
                  >
                    <option value="ปี 1">ชั้นปีที่ 1 (ปี 1)</option>
                    <option value="ปี 2">ชั้นปีที่ 2 (ปี 2)</option>
                    <option value="ปี 3">ชั้นปีที่ 3 (ปี 3)</option>
                    <option value="ปี 4">ชั้นปีที่ 4 (ปี 4)</option>
                  </select>
                </div>

                {/* Faculty select */}
                <div>
                  <label className="block text-xs font-semibold text-[#4a148c] mb-1">
                    คณะ
                  </label>
                  <select
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#f8bbd0] text-[#4a148c] text-xs font-semibold outline-none focus:border-[#ec407a] focus:ring-2 focus:ring-pink-200"
                  >
                    {FACULTY_LIST.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department select / custom input */}
                <div>
                  <label className="block text-xs font-semibold text-[#4a148c] mb-1">
                    สาขาวิชา *
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="เช่น สาขาวิชารัฐประศาสนศาสตร์ หรือ สาขาวิชาศาสนาและปรัชญา"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#f8bbd0] text-[#4a148c] text-xs font-semibold outline-none focus:border-[#ec407a] focus:ring-2 focus:ring-pink-200"
                    required
                  />
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-xs font-semibold text-[#4a148c] mb-1">
                    ภาคเรียนที่
                  </label>
                  <input
                    type="text"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    placeholder="เช่น 1, 2"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#f8bbd0] text-[#4a148c] text-xs font-semibold outline-none focus:border-[#ec407a] focus:ring-2 focus:ring-pink-200"
                  />
                </div>

                {/* Academic Year */}
                <div>
                  <label className="block text-xs font-semibold text-[#4a148c] mb-1">
                    ปีการศึกษา
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="เช่น 2569"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#f8bbd0] text-[#4a148c] text-xs font-semibold outline-none focus:border-[#ec407a] focus:ring-2 focus:ring-pink-200"
                  />
                </div>

                {/* Subject Code */}
                <div>
                  <label className="block text-xs font-semibold text-[#4a148c] mb-1">
                    รหัสวิชา *
                  </label>
                  <input
                    type="text"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    placeholder="เช่น รปศ101 หรือ 000115"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#f8bbd0] text-[#4a148c] font-mono font-bold text-xs outline-none focus:border-[#ec407a] focus:ring-2 focus:ring-pink-200"
                    required
                  />
                </div>

                {/* Subject Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#4a148c] mb-1">
                    รายวิชา (ชื่อวิชา) *
                  </label>
                  <input
                    type="text"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="เช่น การบริหารรัฐกิจเบื้องต้น"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#f8bbd0] text-[#4a148c] text-xs font-semibold outline-none focus:border-[#ec407a] focus:ring-2 focus:ring-pink-200"
                    required
                  />
                </div>

                {/* Student Count */}
                <div>
                  <label className="block text-xs font-semibold text-[#4a148c] mb-1">
                    สรุปยอดจำนวนนิสิต (คน)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={studentCount}
                    onChange={(e) => setStudentCount(e.target.value)}
                    placeholder="เช่น 25"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#f8bbd0] text-[#4a148c] text-xs font-semibold outline-none focus:border-[#ec407a] focus:ring-2 focus:ring-pink-200"
                  />
                </div>

                {/* Lecturer Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#4a148c] mb-1">
                    ผู้บรรยาย (อาจารย์ประจำวิชา) *
                  </label>
                  <input
                    type="text"
                    value={lecturerName}
                    onChange={(e) => setLecturerName(e.target.value)}
                    placeholder="เช่น ผศ.ดร.สมชาย ใจดี"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#f8bbd0] text-[#4a148c] text-xs font-semibold outline-none focus:border-[#ec407a] focus:ring-2 focus:ring-pink-200"
                    required
                  />
                </div>

                {/* Uploader Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#4a148c] mb-1">
                    ผู้อัพโหลด *
                  </label>
                  <input
                    type="text"
                    value={uploaderName}
                    onChange={(e) => setUploaderName(e.target.value)}
                    placeholder="เช่น อาจารย์สมชาย"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#f8bbd0] text-[#4a148c] text-xs font-semibold outline-none focus:border-[#ec407a] focus:ring-2 focus:ring-pink-200"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Live Preview of Standard File Name */}
            <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4a148c] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>ตัวอย่างชื่อไฟล์มาตรฐานอัตโนมัติ (Live Preview)</span>
                </span>
                <span className="text-[11px] text-[#7b1fa2] font-semibold">
                  ระบบแปลงชื่อไฟล์ให้อัตโนมัติเมื่อกดส่ง
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-purple-200/80 shadow-2xs">
                <p className="font-mono font-bold text-xs sm:text-sm text-[#c2185b] break-all">
                  {liveStandardFileName}
                </p>
              </div>

              <p className="text-[11px] text-[#7b1fa2]/70 leading-relaxed">
                * ไฟล์จะถูกเปลี่ยนชื่อตามรูปแบบมาตรฐาน: <code className="font-bold text-[#4a148c]">(กลุ่ม)(ชั้นปี)(สาขาวิชา)(รหัสวิชา)(ชื่อวิชา)(ผู้บรรยาย)</code> และบันทึกเข้าโฟลเดอร์ Google Drive ปลายทางโดยอัตโนมัติ
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !file}
                className="w-full py-4 px-6 rounded-2xl btn-mcu-primary text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังประมวลผลและส่งไฟล์...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>ยืนยันและส่งใบกรอกเกรด</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
