import * as XLSX from 'xlsx';

export interface ParsedGradeInfo {
  year?: string;
  faculty?: string;
  department?: string;
  semester?: string;
  academicYear?: string;
  subjectCode?: string;
  subjectName?: string;
  lecturerName?: string;
  studentGroup?: string;
  studentCount?: number;
}

/**
 * Clean Thai punctuation and extra dots/spaces
 */
function cleanText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\.{3,}/g, ' ')
    .replace(/…+/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse grade sheet metadata from an Excel file buffer or array
 */
export function parseGradeSheetData(data: ArrayBuffer | Uint8Array, originalFileName: string = ''): ParsedGradeInfo {
  const result: ParsedGradeInfo = {};

  try {
    const workbook = XLSX.read(data, { type: 'array' });
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      return fallbackFromFileName(originalFileName, result);
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return fallbackFromFileName(originalFileName, result);
    }

    // Convert sheet to 2D array of rows
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    if (!rows || rows.length === 0) {
      return fallbackFromFileName(originalFileName, result);
    }

    const maxHeaderRow = Math.min(rows.length, 45);

    // Build row strings for regex scanning
    const rowTexts: string[] = [];
    for (let r = 0; r < maxHeaderRow; r++) {
      const row = rows[r] || [];
      const line = row
        .map((cell) => cleanText(String(cell ?? '')))
        .filter(Boolean)
        .join(' ');
      rowTexts.push(line);
    }
    const combinedHeaderText = rowTexts.join('\n');

    // 1. Detect Group (กลุ่ม: บรรพชิต / คฤหัสถ์)
    if (combinedHeaderText.includes('บรรพชิต') || combinedHeaderText.includes('พระภิกษุ') || combinedHeaderText.includes('สามเณร')) {
      result.studentGroup = 'บรรพชิต';
    } else if (combinedHeaderText.includes('คฤหัสถ์') || combinedHeaderText.includes('บุคคลทั่วไป')) {
      result.studentGroup = 'คฤหัสถ์';
    }

    // 2. Detect Year (ชั้นปี: ปี 1, ปี 2, ปี 3, ปี 4)
    const yrMatch = combinedHeaderText.match(/(?:ชั้นปีที่|ชั้นปี|ปีที่|ปี)\s*[:\s]?\s*([1-4])\b/);
    if (yrMatch) {
      result.year = `ปี ${yrMatch[1]}`;
    } else {
      // Cell by cell lookup
      for (let r = 0; r < maxHeaderRow; r++) {
        const row = rows[r] || [];
        for (let c = 0; c < row.length; c++) {
          const val = cleanText(String(row[c] ?? ''));
          if (val === 'ชั้นปี' || val === 'ชั้นปีที่' || val === 'ปี') {
            const nextVal = cleanText(String(row[c + 1] ?? ''));
            const numMatch = nextVal.match(/^([1-4])$/);
            if (numMatch) {
              result.year = `ปี ${numMatch[1]}`;
              break;
            }
          }
        }
        if (result.year) break;
      }
    }

    // 3. Detect Faculty (คณะ)
    if (combinedHeaderText.includes('พุทธศาสตร์')) {
      result.faculty = 'คณะพุทธศาสตร์';
    } else if (combinedHeaderText.includes('สังคมศาสตร์')) {
      result.faculty = 'คณะสังคมศาสตร์';
    } else if (combinedHeaderText.includes('ครุศาสตร์')) {
      result.faculty = 'คณะครุศาสตร์';
    } else if (combinedHeaderText.includes('มนุษยศาสตร์')) {
      result.faculty = 'คณะมนุษยศาสตร์';
    } else {
      const facMatch = combinedHeaderText.match(/คณะ\s*([ก-๙]+)/);
      if (facMatch) {
        result.faculty = `คณะ${facMatch[1].trim()}`;
      }
    }

    // 4. Detect Department (สาขาวิชา)
    if (combinedHeaderText.includes('ศาสนาและปรัชญา')) {
      result.department = 'สาขาวิชาศาสนาและปรัชญา';
    } else if (combinedHeaderText.includes('รัฐประศาสนศาสตร์')) {
      result.department = 'สาขาวิชารัฐประศาสนศาสตร์';
    } else if (combinedHeaderText.includes('พระพุทธศาสนา')) {
      result.department = 'สาขาวิชาพระพุทธศาสนา';
    } else if (combinedHeaderText.includes('การจัดการเชิงพุทธ')) {
      result.department = 'สาขาวิชาการจัดการเชิงพุทธ';
    } else if (combinedHeaderText.includes('รัฐศาสตร์')) {
      result.department = 'สาขาวิชารัฐศาสตร์';
    } else if (combinedHeaderText.includes('สังคมสงเคราะห์ศาสตร์')) {
      result.department = 'สาขาวิชาสังคมสงเคราะห์ศาสตร์';
    } else {
      // Try regex or adjacent cell
      const deptMatch = combinedHeaderText.match(/(?:สาขาวิชา|สาขา)\s*[:\s]?\s*([ก-๙a-zA-Z\s]+?)(?=\s*(?:ชั้นปี|ภาค|ปีการศึกษา|คณะ|วิชา|รหัสวิชา|อาจารย์|$|\n))/);
      if (deptMatch && deptMatch[1] && deptMatch[1].trim().length > 2) {
        const d = deptMatch[1].trim();
        result.department = d.startsWith('สาขาวิชา') ? d : `สาขาวิชา${d}`;
      } else {
        for (let r = 0; r < maxHeaderRow; r++) {
          const row = rows[r] || [];
          for (let c = 0; c < row.length; c++) {
            const val = cleanText(String(row[c] ?? ''));
            if (val === 'สาขาวิชา' || val === 'สาขา') {
              const nextVal = cleanText(String(row[c + 1] ?? ''));
              if (nextVal && nextVal.length > 2) {
                result.department = nextVal.startsWith('สาขาวิชา') ? nextVal : `สาขาวิชา${nextVal}`;
                break;
              }
            }
          }
          if (result.department) break;
        }
      }
    }

    // 5. Detect Semester (ภาคเรียนที่)
    const semMatch = combinedHeaderText.match(/(?:ภาคเรียนที่|ภาคการศึกษาที่|ภาคเรียน|ภาคที่|ภาค)\s*[:\s]?\s*([1-3])\b/);
    if (semMatch) {
      result.semester = semMatch[1];
    } else {
      for (let r = 0; r < maxHeaderRow; r++) {
        const row = rows[r] || [];
        for (let c = 0; c < row.length; c++) {
          const val = cleanText(String(row[c] ?? ''));
          if (val === 'ภาคเรียนที่' || val === 'ภาคการศึกษาที่' || val === 'ภาค') {
            const nextVal = cleanText(String(row[c + 1] ?? ''));
            const numMatch = nextVal.match(/^([1-3])$/);
            if (numMatch) {
              result.semester = numMatch[1];
              break;
            }
          }
        }
        if (result.semester) break;
      }
    }

    // 6. Detect Academic Year (ปีการศึกษา)
    const ayMatch = combinedHeaderText.match(/(?:ปีการศึกษา|พ\.ศ\.)\s*[:\s]?\s*(25[0-9]{2})\b/);
    if (ayMatch) {
      result.academicYear = ayMatch[1];
    } else {
      // Cell search or general 25xx in header
      for (let r = 0; r < maxHeaderRow; r++) {
        const row = rows[r] || [];
        for (let c = 0; c < row.length; c++) {
          const val = cleanText(String(row[c] ?? ''));
          if (val === 'ปีการศึกษา') {
            const nextVal = cleanText(String(row[c + 1] ?? ''));
            const numMatch = nextVal.match(/(25[0-9]{2})/);
            if (numMatch) {
              result.academicYear = numMatch[1];
              break;
            }
          }
        }
        if (result.academicYear) break;
      }
      if (!result.academicYear) {
        const anyYearMatch = combinedHeaderText.match(/\b(25[5-7][0-9])\b/);
        if (anyYearMatch) {
          result.academicYear = anyYearMatch[1];
        }
      }
    }

    // 7. Detect Subject Code (รหัสวิชา)
    const codeMatch = combinedHeaderText.match(/รหัสวิชา\s*[:\s]?\s*([ก-๙a-zA-Z0-9\-_]{2,15})/);
    if (codeMatch && codeMatch[1]) {
      result.subjectCode = codeMatch[1].trim();
    } else {
      for (let r = 0; r < maxHeaderRow; r++) {
        const row = rows[r] || [];
        for (let c = 0; c < row.length; c++) {
          const val = cleanText(String(row[c] ?? ''));
          if (val === 'รหัสวิชา' || val === 'รหัส') {
            const nextVal = cleanText(String(row[c + 1] ?? ''));
            if (nextVal && nextVal.length >= 2) {
              result.subjectCode = nextVal;
              break;
            }
          }
        }
        if (result.subjectCode) break;
      }
      // General MCU course code pattern: 6 digits (e.g. 000115 or 000 115) or Thai prefix (e.g. รปศ101)
      if (!result.subjectCode) {
        const coursePatternMatch = combinedHeaderText.match(/\b([0-9]{3}\s*[0-9]{3})\b|\b([ก-๙]{2,4}\s*[0-9]{3})\b/);
        if (coursePatternMatch) {
          result.subjectCode = (coursePatternMatch[1] || coursePatternMatch[2]).replace(/\s+/g, '');
        }
      }
    }

    // 8. Detect Subject Name (รายวิชา / ชื่อวิชา)
    // Avoid matching 'สาขาวิชา' or 'รหัสวิชา' by using negative lookbehind
    const subjMatch = combinedHeaderText.match(/(?:ชื่อรายวิชา|รายวิชา|ชื่อวิชา|(?<!รหัส)(?<!สาขา)วิชา)\s*[:\s]?\s*([ก-๙a-zA-Z0-9\s\(\)\-_/]+?)(?=\s*(?:รหัส|หน่วยกิต|กลุ่ม|อาจารย์|ผู้บรรยาย|ผู้สอน|$|\n))/);
    if (subjMatch && subjMatch[1] && subjMatch[1].trim().length > 2 && !subjMatch[1].includes('สาขาวิชา') && !subjMatch[1].includes('รหัสวิชา') && !subjMatch[1].includes('พุทธศาสตร์') && !subjMatch[1].includes('สังคมศาสตร์')) {
      result.subjectName = cleanText(subjMatch[1]);
    } else {
      for (let r = 0; r < maxHeaderRow; r++) {
        const row = rows[r] || [];
        for (let c = 0; c < row.length; c++) {
          const val = cleanText(String(row[c] ?? ''));
          if (val === 'ชื่อรายวิชา' || val === 'รายวิชา' || val === 'ชื่อวิชา' || (val === 'วิชา' && !val.includes('สาขา') && !val.includes('รหัส'))) {
            const nextVal = cleanText(String(row[c + 1] ?? ''));
            if (nextVal && nextVal.length > 2 && !nextVal.includes('รหัส') && !nextVal.includes('สาขา')) {
              result.subjectName = nextVal;
              break;
            }
          }
        }
        if (result.subjectName) break;
      }
    }

    // 9. Detect Lecturer (อาจารย์ผู้บรรยาย / อาจารย์ผู้สอน)
    const lectMatch = combinedHeaderText.match(/(?:อาจารย์ผู้บรรยาย|อาจารย์ผู้สอน|ผู้บรรยาย|ผู้สอน)\s*[:\s]?\s*([ก-๙a-zA-Z\.\s]+?)(?=\s*(?:ลายเซ็น|วันที่|โทร|ห้อง|กลุ่ม|ภาค|$|\n))/);
    if (lectMatch && lectMatch[1] && lectMatch[1].trim().length > 2) {
      result.lecturerName = lectMatch[1].trim();
    } else {
      for (let r = 0; r < maxHeaderRow; r++) {
        const row = rows[r] || [];
        for (let c = 0; c < row.length; c++) {
          const val = cleanText(String(row[c] ?? ''));
          if (val.includes('อาจารย์ผู้บรรยาย') || val.includes('ผู้บรรยาย') || val.includes('อาจารย์ผู้สอน')) {
            const nextVal = cleanText(String(row[c + 1] ?? ''));
            if (nextVal && nextVal.length > 2) {
              result.lecturerName = nextVal;
              break;
            }
          }
        }
        if (result.lecturerName) break;
      }
    }

    // 10. Detect Student Count (สรุปยอดจำนวนนิสิต)
    const countMatch = combinedHeaderText.match(/(?:รวมนิสิตทั้งสิ้น|รวมนิสิต|รวมทั้งสิ้น|รวมยอด|จำนวนนิสิต|รวม)\s*[:\s]?\s*([0-9]{1,3})\s*(?:รูป|คน)?/);
    if (countMatch && countMatch[1]) {
      const num = parseInt(countMatch[1], 10);
      if (!isNaN(num) && num > 0) {
        result.studentCount = num;
      }
    }

    if (!result.studentCount) {
      // Count student rows by sequential numbers (1, 2, 3...)
      let seqCount = 0;
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r] || [];
        for (let c = 0; c < Math.min(row.length, 5); c++) {
          const raw = row[c];
          const num = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10);
          if (!isNaN(num) && num === seqCount + 1 && num <= 300) {
            seqCount++;
            break;
          }
        }
      }
      if (seqCount > 0) {
        result.studentCount = seqCount;
      }
    }

  } catch (err) {
    console.warn('parseGradeSheetData error:', err);
  }

  // Fallback missing values from original file name
  return fallbackFromFileName(originalFileName, result);
}

/**
 * Extract extra hints from filename if still empty
 */
function fallbackFromFileName(fileName: string, current: ParsedGradeInfo): ParsedGradeInfo {
  if (!fileName) return current;

  // Group
  if (!current.studentGroup) {
    if (fileName.includes('บรรพชิต') || fileName.includes('พระ')) {
      current.studentGroup = 'บรรพชิต';
    } else if (fileName.includes('คฤหัสถ์')) {
      current.studentGroup = 'คฤหัสถ์';
    }
  }

  // Year
  if (!current.year) {
    const yrMatch = fileName.match(/ปี\s*([1-4])/);
    if (yrMatch) current.year = `ปี ${yrMatch[1]}`;
  }

  // Faculty
  if (!current.faculty) {
    if (fileName.includes('พุทธศาสตร์')) current.faculty = 'คณะพุทธศาสตร์';
    else if (fileName.includes('สังคมศาสตร์')) current.faculty = 'คณะสังคมศาสตร์';
  }

  // Department
  if (!current.department) {
    if (fileName.includes('ศาสนาและปรัชญา')) current.department = 'สาขาวิชาศาสนาและปรัชญา';
    else if (fileName.includes('รัฐประศาสนศาสตร์')) current.department = 'สาขาวิชารัฐประศาสนศาสตร์';
    else if (fileName.includes('พระพุทธศาสนา')) current.department = 'สาขาวิชาพระพุทธศาสนา';
  }

  // Academic Year
  if (!current.academicYear) {
    const ayMatch = fileName.match(/(25[5-7][0-9])/);
    if (ayMatch) current.academicYear = ayMatch[1];
  }

  // Semester
  if (!current.semester) {
    const semMatch = fileName.match(/ภาค\s*([1-3])|เทอม\s*([1-3])/);
    if (semMatch) current.semester = semMatch[1] || semMatch[2];
  }

  return current;
}
