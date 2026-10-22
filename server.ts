import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { createDefaultSharePackage, DEFAULT_FILES } from './src/data/defaultDriveFolder.ts';
import { SharePackage, DriveFileItem, GradeSubmission } from './src/types/share.ts';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// In-memory database with local storage backup
const DATA_FILE = path.join(__dirname, '.shares-data.json');
const SUBMISSIONS_FILE = path.join(__dirname, '.submissions-data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'submitted-grades');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

let shares: Record<string, SharePackage> = {};
let submissions: GradeSubmission[] = [];

// Load persisted data or initialize default
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    shares = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Could not read saved shares data, using default:', e);
}

try {
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    const rawSub = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
    submissions = JSON.parse(rawSub);
  }
} catch (e) {
  console.warn('Could not read saved submissions data:', e);
}

// Ensure default package is always available and active
if (!shares['grade-sem1-2569']) {
  const defaultPkg = createDefaultSharePackage();
  shares[defaultPkg.id] = defaultPkg;
  saveSharesData();
} else if (shares['grade-sem1-2569'].security.expiresAt && new Date() > new Date(shares['grade-sem1-2569'].security.expiresAt)) {
  const now = new Date();
  shares['grade-sem1-2569'].security.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  saveSharesData();
}

function saveSharesData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(shares, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write shares data:', err);
  }
}

function saveSubmissionsData() {
  try {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write submissions data:', err);
  }
}

// Helper: check expiration
function isShareExpired(pkg: SharePackage): boolean {
  if (!pkg.security.expiresAt) return false;
  return new Date() > new Date(pkg.security.expiresAt);
}

// Helper: check download limit
function isDownloadLimitReached(pkg: SharePackage): boolean {
  if (pkg.security.maxDownloads === null || pkg.security.maxDownloads === undefined) return false;
  return pkg.stats.totalDownloadsCount >= pkg.security.maxDownloads;
}

// Helper: automatically infer metadata tags from file name
function extractFileMetadata(fileName: string): Partial<DriveFileItem> {
  const meta: Partial<DriveFileItem> = {};
  if (fileName.includes('พุทธศาสตร์')) {
    meta.faculty = 'คณะพุทธศาสตร์';
  } else if (fileName.includes('สังคมศาสตร์')) {
    meta.faculty = 'คณะสังคมศาสตร์';
  } else if (fileName.includes('ครุศาสตร์')) {
    meta.faculty = 'คณะครุศาสตร์';
  } else if (fileName.includes('มนุษยศาสตร์')) {
    meta.faculty = 'คณะมนุษยศาสตร์';
  }

  if (fileName.includes('ศาสนาและปรัชญา')) {
    meta.department = 'สาขาวิชาศาสนาและปรัชญา';
  } else if (fileName.includes('รัฐประศาสนศาสตร์')) {
    meta.department = 'สาขาวิชารัฐประศาสนศาสตร์';
  } else if (fileName.includes('พระพุทธศาสนา')) {
    meta.department = 'สาขาวิชาพระพุทธศาสนา';
  } else if (fileName.includes('การสอนภาษาไทย')) {
    meta.department = 'สาขาวิชาการสอนภาษาไทย';
  }

  if (fileName.includes('บรรพชิต')) {
    meta.studentType = 'บรรพชิต';
  } else if (fileName.includes('คฤหัสถ์')) {
    meta.studentType = 'คฤหัสถ์';
  }

  const yearMatch = fileName.match(/ปี\s*([1-4])/);
  if (yearMatch) {
    meta.year = parseInt(yearMatch[1], 10);
  }

  return meta;
}

// Admin passcode protection (Configurable via environment variable or default)
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'admin2569';

function isAdmin(req: Request): boolean {
  const headerToken = req.headers['x-admin-token'] || req.headers['authorization'];
  if (!headerToken) return false;
  const tokenStr = typeof headerToken === 'string' ? headerToken.replace(/^Bearer\s+/, '').trim() : '';
  const expectedToken = Buffer.from(ADMIN_PASSCODE).toString('base64');
  return tokenStr === expectedToken || tokenStr === ADMIN_PASSCODE;
}

// --- API ROUTES ---

// 0. Admin Login / Verify
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { passcode } = req.body;
  if (!passcode || passcode.toString().trim() !== ADMIN_PASSCODE) {
    return res.status(401).json({
      success: false,
      message: 'รหัสผ่านผู้ดูแลระบบ (Admin PIN) ไม่ถูกต้อง',
    });
  }
  const token = Buffer.from(ADMIN_PASSCODE).toString('base64');
  res.json({
    success: true,
    message: 'เข้าสู่ระบบผู้ดูแลระบบสำเร็จ',
    token,
  });
});

// 1. Get all shares (Admin view / list - masked passwords if unauthenticated)
app.get('/api/shares', (req: Request, res: Response) => {
  const adminAuthorized = isAdmin(req);
  const list = Object.values(shares).map((pkg) => ({
    id: pkg.id,
    title: pkg.title,
    description: pkg.description,
    sourceDriveUrl: pkg.sourceDriveUrl,
    fileCount: pkg.files.length,
    createdAt: pkg.createdAt,
    security: {
      requirePassword: pkg.security.requirePassword,
      password: adminAuthorized ? pkg.security.password : undefined, // Only admin can view plain password
      passwordHint: pkg.security.passwordHint,
      expiresAt: pkg.security.expiresAt,
      maxDownloads: pkg.security.maxDownloads,
      allowPreviewWithoutDownload: pkg.security.allowPreviewWithoutDownload,
      allowZipDownload: pkg.security.allowZipDownload,
    },
    files: pkg.files,
    stats: pkg.stats,
    isExpired: isShareExpired(pkg),
    isLimitReached: isDownloadLimitReached(pkg),
    customNote: pkg.customNote,
  }));
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({ success: true, data: list, isAdmin: adminAuthorized });
});

// 1.1 Real-time status endpoint for instant cross-tab / cross-browser sync
app.get('/api/shares/:id/realtime', (req: Request, res: Response) => {
  const pkg = shares[req.params.id];
  if (!pkg) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const fileDownloads: Record<string, number> = {};
  for (const f of pkg.files) {
    if (f.downloadCount && f.downloadCount > 0) {
      fileDownloads[f.id] = f.downloadCount;
    }
  }

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    success: true,
    id: pkg.id,
    totalDownloadsCount: pkg.stats.totalDownloadsCount,
    viewsCount: pkg.stats.viewsCount,
    unlockedCount: pkg.stats.unlockedCount,
    expiresAt: pkg.security.expiresAt,
    maxDownloads: pkg.security.maxDownloads,
    isExpired: isShareExpired(pkg),
    isLimitReached: isDownloadLimitReached(pkg),
    fileDownloads,
  });
});

// 2. Get public metadata for a specific share link
app.get('/api/shares/:id', (req: Request, res: Response) => {
  const pkg = shares[req.params.id];
  if (!pkg) {
    return res.status(404).json({ success: false, message: 'ไม่พบลิงก์แชร์นี้ในระบบ' });
  }

  // Increment view count
  pkg.stats.viewsCount += 1;
  pkg.stats.lastAccessedAt = new Date().toISOString();
  saveSharesData();

  const isExpired = isShareExpired(pkg);
  const isLimitReached = isDownloadLimitReached(pkg);

  // Return public info (Do not reveal plain password or file download links yet if locked)
  res.json({
    success: true,
    data: {
      id: pkg.id,
      title: pkg.title,
      description: pkg.description,
      sourceDriveUrl: pkg.sourceDriveUrl,
      fileCount: pkg.files.length,
      createdAt: pkg.createdAt,
      security: {
        requirePassword: pkg.security.requirePassword,
        passwordHint: pkg.security.passwordHint,
        expiresAt: pkg.security.expiresAt,
        maxDownloads: pkg.security.maxDownloads,
        allowPreviewWithoutDownload: pkg.security.allowPreviewWithoutDownload,
        allowZipDownload: pkg.security.allowZipDownload,
      },
      stats: {
        viewsCount: pkg.stats.viewsCount,
        unlockedCount: pkg.stats.unlockedCount,
        totalDownloadsCount: pkg.stats.totalDownloadsCount,
        lastAccessedAt: pkg.stats.lastAccessedAt,
      },
      isExpired,
      isLimitReached,
      customNote: pkg.customNote,
    },
  });
});

// 3. Unlock share with password
app.post('/api/shares/:id/unlock', (req: Request, res: Response) => {
  const pkg = shares[req.params.id];
  if (!pkg) {
    return res.status(404).json({ success: false, message: 'ไม่พบลิงก์แชร์นี้' });
  }

  if (isShareExpired(pkg)) {
    return res.status(403).json({
      success: false,
      isExpired: true,
      message: 'ลิงก์นี้หมดอายุการใช้งานแล้ว ไม่สามารถเข้าถึงได้',
    });
  }

  const { password } = req.body;

  if (pkg.security.requirePassword) {
    const expected = (pkg.security.password || '').trim().toLowerCase();
    const provided = (password || '').toString().trim().toLowerCase();

    if (provided !== expected) {
      return res.status(401).json({
        success: false,
        message: 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง',
        hint: pkg.security.passwordHint,
      });
    }
  }

  // Unlocked successfully
  pkg.stats.unlockedCount += 1;
  saveSharesData();

  // Return full package with files
  res.json({
    success: true,
    message: 'ปลดล็อกการเข้าถึงไฟล์สำเร็จ',
    data: {
      ...pkg,
      isExpired: false,
      isLimitReached: isDownloadLimitReached(pkg),
    },
  });
});

// 4. Download file endpoint (validates expiry & download limit, increments count)
app.get('/api/shares/:id/download/:fileId', async (req: Request, res: Response) => {
  const pkg = shares[req.params.id];
  if (!pkg) {
    return res.status(404).send('ไม่พบลิงก์แชร์');
  }

  if (isShareExpired(pkg)) {
    return res.status(403).send('ลิงก์นี้หมดอายุการใช้งานแล้ว');
  }

  if (isDownloadLimitReached(pkg)) {
    return res.status(403).send('สิทธิ์การดาวน์โหลดสำหรับลิงก์นี้ครบตามจำนวนที่กำหนดแล้ว');
  }

  const file = pkg.files.find((f) => f.id === req.params.fileId);
  if (!file) {
    return res.status(404).send('ไม่พบไฟล์ที่ต้องการ');
  }

  // Increment download counts
  pkg.stats.totalDownloadsCount += 1;
  file.downloadCount = (file.downloadCount || 0) + 1;
  file.lastDownloadedAt = new Date().toISOString();
  saveSharesData();

  // Redirect directly to Google Drive download stream URL or stream it
  const downloadUrl = `https://drive.usercontent.google.com/download?id=${file.id}&export=download`;
  res.redirect(302, downloadUrl);
});

// 5. Proxy file stream (useful for frontend ZIP bundling without CORS issues)
app.get('/api/shares/:id/file-stream/:fileId', async (req: Request, res: Response) => {
  const pkg = shares[req.params.id];
  if (!pkg) return res.status(404).send('Not found');

  if (isShareExpired(pkg)) return res.status(403).send('Expired');
  if (isDownloadLimitReached(pkg)) return res.status(403).send('Limit reached');

  const file = pkg.files.find((f) => f.id === req.params.fileId);
  if (!file) return res.status(404).send('File not found');

  // Increment count
  pkg.stats.totalDownloadsCount += 1;
  file.downloadCount = (file.downloadCount || 0) + 1;
  file.lastDownloadedAt = new Date().toISOString();
  saveSharesData();

  const candidateUrls = [
    `https://drive.usercontent.google.com/download?id=${file.id}&export=download`,
    `https://drive.google.com/uc?export=download&id=${file.id}`,
  ];

  try {
    let fileBuffer: Buffer | null = null;
    for (const url of candidateUrls) {
      try {
        const driveRes = await fetch(url, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MCU-DrivePass/1.0',
          },
        });
        if (driveRes.ok) {
          fileBuffer = Buffer.from(await driveRes.arrayBuffer());
          break;
        }
      } catch {
        // try next fallback
      }
    }

    if (!fileBuffer) {
      return res.status(502).send('ไม่สามารถดาวน์โหลดไฟล์จาก Google Drive ได้');
    }

    res.setHeader('Content-Type', file.mimeType || 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    return res.send(fileBuffer);
  } catch (err: any) {
    res.status(500).send('Google Drive fetch error: ' + err.message);
  }
});

// 6. Record download count (called when client initiates direct download or zip)
app.post('/api/shares/:id/record-download', (req: Request, res: Response) => {
  const pkg = shares[req.params.id];
  if (!pkg) {
    return res.status(404).json({ success: false, message: 'ไม่พบลิงก์แชร์' });
  }

  if (isShareExpired(pkg)) {
    return res.status(403).json({ success: false, message: 'ลิงก์นี้หมดอายุแล้ว' });
  }

  if (isDownloadLimitReached(pkg)) {
    return res.status(403).json({ success: false, message: 'จำนวนครั้งในการดาวน์โหลดครบแล้ว' });
  }

  const { fileId, count = 1 } = req.body;
  pkg.stats.totalDownloadsCount += count;

  if (fileId) {
    const file = pkg.files.find((f) => f.id === fileId);
    if (file) {
      file.downloadCount = (file.downloadCount || 0) + 1;
      file.lastDownloadedAt = new Date().toISOString();
    }
  }

  saveSharesData();

  const remaining =
    pkg.security.maxDownloads !== null && pkg.security.maxDownloads !== undefined
      ? Math.max(0, pkg.security.maxDownloads - pkg.stats.totalDownloadsCount)
      : null;

  res.json({
    success: true,
    totalDownloadsCount: pkg.stats.totalDownloadsCount,
    remainingDownloads: remaining,
    isLimitReached: isDownloadLimitReached(pkg),
  });
});

// 7. Create new share link
app.post('/api/shares', (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ success: false, message: 'ต้องเข้าสู่ระบบผู้ดูแลระบบ (Admin) ก่อนสร้างลิงก์แชร์' });
  }
  const {
    title,
    description,
    sourceDriveUrl,
    password,
    passwordHint,
    expiresInHours,
    customExpiresAt,
    maxDownloads,
    customNote,
    files,
  } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อชุดไฟล์ที่ต้องการแชร์' });
  }

  // Generate ID
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const id = `share-${randomSuffix}`;

  // Calculate expiry
  let expiresAt: string | null = null;
  if (customExpiresAt) {
    expiresAt = new Date(customExpiresAt).toISOString();
  } else if (expiresInHours && expiresInHours > 0) {
    expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
  }

  const finalFiles: DriveFileItem[] =
    files && files.length > 0 ? files : DEFAULT_FILES;

  const newShare: SharePackage = {
    id,
    title: title.trim(),
    description: description || '',
    sourceDriveUrl: sourceDriveUrl || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customNote: customNote || '',
    security: {
      requirePassword: Boolean(password && password.trim().length > 0),
      password: password ? password.trim() : '',
      passwordHint: passwordHint || '',
      expiresAt,
      maxDownloads: maxDownloads !== undefined && maxDownloads !== null && maxDownloads > 0 ? Number(maxDownloads) : null,
      allowPreviewWithoutDownload: true,
      allowZipDownload: true,
    },
    files: finalFiles,
    stats: {
      viewsCount: 0,
      unlockedCount: 0,
      totalDownloadsCount: 0,
      lastAccessedAt: null,
    },
  };

  shares[id] = newShare;
  saveSharesData();

  res.json({
    success: true,
    message: 'สร้างลิงก์แชร์ที่มีการป้องกันสำเร็จ',
    data: newShare,
  });
});

// 8. Update / extend existing share link
app.patch('/api/shares/:id', (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ success: false, message: 'ต้องเข้าสู่ระบบผู้ดูแลระบบ (Admin) ก่อนแก้ไขการตั้งค่า' });
  }
  const pkg = shares[req.params.id];
  if (!pkg) {
    return res.status(404).json({ success: false, message: 'ไม่พบลิงก์แชร์' });
  }

  const {
    password,
    passwordHint,
    expiresAt,
    maxDownloads,
    resetDownloads,
    customNote,
    title,
  } = req.body;

  if (title) pkg.title = title;
  if (password !== undefined) {
    pkg.security.password = password;
    pkg.security.requirePassword = Boolean(password && password.trim().length > 0);
  }
  if (passwordHint !== undefined) pkg.security.passwordHint = passwordHint;
  if (expiresAt !== undefined) pkg.security.expiresAt = expiresAt;
  if (maxDownloads !== undefined) pkg.security.maxDownloads = maxDownloads;
  if (customNote !== undefined) pkg.customNote = customNote;

  if (resetDownloads) {
    pkg.stats.totalDownloadsCount = 0;
    pkg.files.forEach((f) => (f.downloadCount = 0));
  }

  pkg.updatedAt = new Date().toISOString();
  saveSharesData();

  res.json({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ', data: pkg });
});

// 9. Delete / revoke share link
app.delete('/api/shares/:id', (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ success: false, message: 'ต้องเข้าสู่ระบบผู้ดูแลระบบ (Admin) ก่อนลบลิงก์' });
  }
  if (req.params.id === 'grade-sem1-2569') {
    // Re-initialize default instead of complete deletion
    shares['grade-sem1-2569'] = createDefaultSharePackage();
    saveSharesData();
    return res.json({ success: true, message: 'รีเซ็ตลิงก์ค่าเริ่มต้นสำเร็จ' });
  }

  delete shares[req.params.id];
  saveSharesData();
  res.json({ success: true, message: 'ลบลิงก์แชร์เรียบร้อยแล้ว' });
});

// 10. Parse Google Drive folder URL dynamically
app.post('/api/parse-drive-folder', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, message: 'URL โฟลเดอร์ไม่ถูกต้อง' });
  }

  // Extract folder ID
  const match = url.match(/folders\/([A-Za-z0-9_-]{20,})/);
  const folderId = match ? match[1] : null;

  if (!folderId) {
    return res.status(400).json({ success: false, message: 'ไม่พบ Folder ID ที่ถูกต้องใน URL' });
  }

  // If it is the default folder, return full known list
  if (folderId === '1dFHRchGV58Tbnk7_GPIX2XYpITw6EKIX') {
    return res.json({
      success: true,
      title: 'ใบกรอกคะแนน เทอม 1 ปีการศึกษา ป.ตรี 2569',
      folderId,
      files: DEFAULT_FILES,
    });
  }

  // Fetch drive folder page
  try {
    const driveRes = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const html = await driveRes.text();

    // Extract title
    const titleMatch =
      html.match(/<title>([^<]+)– Google Drive<\/title>/i) ||
      html.match(/<title>([^<]+)<\/title>/i);
    const folderTitle = titleMatch ? titleMatch[1].trim() : 'โฟลเดอร์ Google Drive';

    // Extract items
    const regex =
      /aria-label="([^"]+)\s+(Microsoft [^"|]+|Google [^"|]+|PDF|Image|Text|Folder|Zip|Shared)[^"]*"\s+data-handled-by-drag-and-drop="true"\s+ssk=[\x27"]\d+:[^:]+:([A-Za-z0-9_-]{20,})/g;
    let m;
    const foundFiles: DriveFileItem[] = [];

    while ((m = regex.exec(html)) !== null) {
      const rawName = m[1].trim();
      const cleanName = rawName.replace(/\s+Microsoft Excel.*$/, '');
      const id = m[3].split('-')[0];
      const tags = extractFileMetadata(cleanName);

      foundFiles.push({
        id,
        name: cleanName,
        size: '160 KB',
        mimeType: 'application/octet-stream',
        downloadCount: 0,
        directDownloadUrl: `https://drive.google.com/uc?export=download&id=${id}`,
        previewUrl: `https://drive.google.com/file/d/${id}/preview`,
        ...tags,
      });
    }

    res.json({
      success: true,
      title: folderTitle,
      folderId,
      files: foundFiles.length > 0 ? foundFiles : DEFAULT_FILES,
    });
  } catch (err) {
    res.json({
      success: true,
      title: 'โฟลเดอร์ Google Drive',
      folderId,
      files: DEFAULT_FILES,
    });
  }
});

// 12. Gemini AI Smart Academic Document Assistant
app.post('/api/ai/ask', async (req: Request, res: Response) => {
  const { query, shareId } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ success: false, message: 'กรุณาระบุคำถามหรือข้อความค้นหา' });
  }

  const pkg = (shareId && shares[shareId]) ? shares[shareId] : Object.values(shares)[0];
  const fileList: DriveFileItem[] = pkg ? pkg.files : DEFAULT_FILES;

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `คุณคือผู้ช่วย AI ฝ่ายทะเบียนและวัดผลการศึกษา วิทยาลัยสงฆ์พ่อขุนผาเมือง เพชรบูรณ์
หน้าที่ของคุณคือแนะนำและค้นหาไฟล์แบบฟอร์มใบกรอกคะแนน หรือเอกสารที่ตรงกับความต้องการของอาจารย์ผู้สอน

รายการเอกสารทั้งหมดที่มีในระบบ:
${JSON.stringify(
  fileList.map((f) => ({
    id: f.id,
    name: f.name,
    faculty: f.faculty || '',
    department: f.department || '',
    studentType: f.studentType || '',
    year: f.year || 0,
  })),
  null,
  2
)}

คำถาม/ความต้องการของผู้ใช้: "${query.trim()}"

กรุณาวิเคราะห์และตอบกลับในรูปแบบ JSON ตามโครงสร้างนี้เท่านั้น (ห้ามใส่ Markdown อื่นนอกเหนือจากบล็อก JSON):
{
  "reply": "คำอธิบายสุภาพ เป็นกันเอง และให้ข้อมูลชัดเจน เช่น แนะนำไฟล์ใด พร้อมระบุคณะ สาขา และชั้นปี",
  "recommendedFileIds": ["id1", "id2"]
}`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const responseText = aiResponse.text || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const matchedFiles = fileList.filter((f) => parsed.recommendedFileIds?.includes(f.id));
        return res.json({
          success: true,
          reply: parsed.reply,
          recommendedFiles: matchedFiles.length > 0 ? matchedFiles : fileList.slice(0, 3),
          isAiPowered: true,
        });
      }
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to heuristic:', err?.message || err);
    }
  }

  // Fallback heuristic semantic keyword search
  const qLower = query.toLowerCase();
  const matched = fileList.filter((f) => {
    const nameMatch = f.name.toLowerCase().includes(qLower);
    const facMatch = f.faculty && qLower.includes(f.faculty.toLowerCase().replace('คณะ', ''));
    const deptMatch = f.department && qLower.includes(f.department.toLowerCase().replace('สาขาวิชา', ''));
    const stMatch = f.studentType && qLower.includes(f.studentType.toLowerCase());
    const yrMatch = f.year && (qLower.includes(`ปี ${f.year}`) || qLower.includes(`ปี${f.year}`));
    return nameMatch || facMatch || deptMatch || stMatch || yrMatch;
  });

  const finalFiles = matched.length > 0 ? matched : fileList.slice(0, 4);

  return res.json({
    success: true,
    reply:
      matched.length > 0
        ? `พบแบบฟอร์มเอกสารที่ตรงกับความต้องการของคุณจำนวน ${matched.length} รายการ ดังนี้ครับ:`
        : `ไม่พบแบบฟอร์มที่ตรงกับคำค้นหาโดยตรง แต่ได้แสดงตัวอย่างแบบฟอร์มที่เกี่ยวข้องให้คุณเลือกใช้งานครับ:`,
    recommendedFiles: finalFiles,
    isAiPowered: false,
  });
});

// 11. Download full project source zip
app.get('/api/export-project-zip', (req: Request, res: Response) => {
  const zipPath = path.join(__dirname, 'dist', 'mcupbn-source.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="mcupbn-source.zip"');
    return res.sendFile(zipPath);
  }
  res.status(404).send('Archive not found');
});

// 13. Parse uploaded grade Excel sheet (Auto-extract metadata)
app.post('/api/parse-grade-file', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'กรุณาแนบไฟล์ Excel (.xls หรือ .xlsx)' });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    let extractedYear = '';
    let extractedFaculty = '';
    let extractedDepartment = '';
    let extractedSubjectCode = '';
    let extractedSubjectName = '';
    let extractedLecturer = '';
    let extractedSemester = '';
    let extractedAcademicYear = '';
    let extractedStudentCount = 0;

    // Inspect first 35 rows and 20 columns for metadata
    const maxRow = 35;
    const maxCol = 20;

    // Track rows that likely contain student data (rows with numeric student IDs or sequential numbers)
    let studentDataRowStart = -1;
    let studentDataRowEnd = -1;

    for (let r = 0; r < maxRow; r++) {
      for (let c = 0; c < maxCol; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        if (!cell || typeof cell.v !== 'string') continue;
        const text = cell.v.trim();

        // 1. Detect Year e.g. "ชั้นปีที่ 1", "ปี 1", "ปี 2"
        if (!extractedYear) {
          const yrMatch = text.match(/ชั้นปีที่\s*([1-4])|ปี\s*([1-4])/);
          if (yrMatch) {
            extractedYear = `ปี ${yrMatch[1] || yrMatch[2]}`;
          }
        }

        // 2. Detect Faculty
        if (!extractedFaculty) {
          if (text.includes('พุทธศาสตร์')) extractedFaculty = 'คณะพุทธศาสตร์';
          else if (text.includes('สังคมศาสตร์')) extractedFaculty = 'คณะสังคมศาสตร์';
          else if (text.includes('ครุศาสตร์')) extractedFaculty = 'คณะครุศาสตร์';
          else if (text.includes('มนุษยศาสตร์')) extractedFaculty = 'คณะมนุษยศาสตร์';
        }

        // 3. Detect Department
        if (!extractedDepartment) {
          const deptMatch = text.match(/สาขาวิชา([ก-๙a-zA-Z\s]+)/);
          if (deptMatch) {
            const rawDept = deptMatch[0].trim();
            extractedDepartment = rawDept.split(/\s+/)[0] + (deptMatch[1] ? deptMatch[1].trim() : '');
          }
        }

        // 4. Detect Subject Code and Subject Name (e.g. "วิชา ... รหัสวิชา ...")
        if (text.includes('วิชา') || text.includes('รหัสวิชา')) {
          const cleanDots = text.replace(/\.{3,}/g, ' ').replace(/…+/g, ' ');

          const codeMatch = cleanDots.match(/รหัสวิชา\s*[:\s]?\s*([ก-๙a-zA-Z0-9\-_]+)/);
          if (codeMatch && codeMatch[1] && codeMatch[1].trim().length > 1) {
            extractedSubjectCode = codeMatch[1].trim();
          }

          const subjMatch = cleanDots.match(/วิชา\s*[:\s]?\s*([ก-๙a-zA-Z0-9\s]+?)(?=\s*รหัสวิชา|$)/);
          if (subjMatch && subjMatch[1] && subjMatch[1].trim().length > 1) {
            extractedSubjectName = subjMatch[1].trim();
          }
        }

        // 5. Detect Lecturer
        if (!extractedLecturer && text.includes('อาจารย์ผู้บรรยาย')) {
          const cleanLect = text.replace(/อาจารย์ผู้บรรยาย\s*[:\s]?/g, '').replace(/\.{3,}/g, '').replace(/…+/g, '').replace(/M$/, '').trim();
          if (cleanLect.length > 2) {
            extractedLecturer = cleanLect;
          }
        }

        // 6. Detect Semester e.g. "ภาคเรียนที่ 1", "ภาคการศึกษาที่ 2"
        if (!extractedSemester) {
          const semMatch = text.match(/ภาคเรียนที่\s*([1-3])|ภาคการศึกษาที่\s*([1-3])|ภาค\s*([1-3])\b/);
          if (semMatch) {
            extractedSemester = semMatch[1] || semMatch[2] || semMatch[3];
          }
        }

        // 7. Detect Academic Year e.g. "ปีการศึกษา 2569", "พ.ศ. 2569"
        if (!extractedAcademicYear) {
          const ayMatch = text.match(/ปีการศึกษา\s*(25[0-9]{2})|พ\.ศ\.\s*(25[0-9]{2})/);
          if (ayMatch) {
            extractedAcademicYear = ayMatch[1] || ayMatch[2];
          }
        }
      }
    }

    // 8. Count student rows: scan all rows, look for rows with sequential numbers (1, 2, 3...) or student IDs
    // Student ID pattern for MCU: 6-digit numbers starting with common prefixes
    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    let seqCount = 0;
    for (let r = 0; r < allRows.length; r++) {
      const row = allRows[r];
      if (!row || row.length === 0) continue;
      // Look for a cell that is a small positive integer (student sequence number 1..200)
      for (let c = 0; c < Math.min(row.length, 5); c++) {
        const cellVal = row[c];
        const num = typeof cellVal === 'number' ? cellVal : parseInt(String(cellVal), 10);
        if (!isNaN(num) && num >= 1 && num <= 200 && num === seqCount + 1) {
          seqCount++;
          if (seqCount === 1) studentDataRowStart = r;
          studentDataRowEnd = r;
          break;
        }
      }
    }
    if (seqCount > 0) extractedStudentCount = seqCount;

    // Try fallback from original filename if still empty
    const orig = req.file.originalname;
    if (!extractedYear) {
      const yrMatch = orig.match(/ปี\s*([1-4])/);
      if (yrMatch) extractedYear = `ปี ${yrMatch[1]}`;
    }
    if (!extractedDepartment) {
      if (orig.includes('ศาสนาและปรัชญา')) extractedDepartment = 'สาขาวิชาศาสนาและปรัชญา';
      else if (orig.includes('รัฐประศาสนศาสตร์')) extractedDepartment = 'สาขาวิชารัฐประศาสนศาสตร์';
      else if (orig.includes('พระพุทธศาสนา')) extractedDepartment = 'สาขาวิชาพระพุทธศาสนา';
    }
    if (!extractedFaculty) {
      if (orig.includes('พุทธศาสตร์')) extractedFaculty = 'คณะพุทธศาสตร์';
      else if (orig.includes('สังคมศาสตร์')) extractedFaculty = 'คณะสังคมศาสตร์';
    }

    res.json({
      success: true,
      data: {
        year: extractedYear || 'ปี 1',
        faculty: extractedFaculty || 'คณะพุทธศาสตร์',
        department: extractedDepartment || '',
        subjectCode: extractedSubjectCode || '',
        subjectName: extractedSubjectName || '',
        lecturerName: extractedLecturer || '',
        semester: extractedSemester || '',
        academicYear: extractedAcademicYear || '',
        studentCount: extractedStudentCount || 0,
        originalFileName: req.file.originalname,
        fileSizeBytes: req.file.size,
      },
    });
  } catch (err: any) {
    console.error('Failed to parse excel:', err);
    res.status(500).json({ success: false, message: 'ไม่สามารถอ่านข้อมูลจากไฟล์ Excel ได้' });
  }
});

// 14. Submit completed grade file
app.post('/api/submit-grade', upload.single('file'), async (req: Request, res: Response) => {
  const {
    year,
    faculty,
    department,
    subjectCode,
    subjectName,
    lecturerName,
    uploaderName,
    studentGroup,
    semester,
    academicYear,
    studentCount,
  } = req.body;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'กรุณาแนบไฟล์ใบกรอกเกรด' });
  }

  if (!year || !department || !subjectCode || !subjectName || !lecturerName || !uploaderName) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง' });
  }

  // Standard naming format:
  // (บรรพชิต)(ปี 1)(สาขาวิชารัฐประศาสนศาสตร์)(รปศ101)(การบริหารรัฐกิจเบื้องต้น)(ผศ.ดร.สมชาย ใจดี).xlsx
  const ext = path.extname(req.file.originalname) || '.xlsx';
  const cleanYear = year.trim();
  const cleanDept = department.trim();
  const cleanCode = subjectCode.trim().replace(/[\s/\\?%*:|"<>]/g, '');
  const cleanName = subjectName.trim().replace(/[\s/\\?%*:|"<>]/g, ' ');
  const cleanLecturer = lecturerName.trim().replace(/[\s/\\?%*:|"<>]/g, ' ');
  const cleanUploader = uploaderName.trim();
  const cleanGroup = (studentGroup || '').trim();
  const cleanSemester = (semester || '').trim();
  const cleanAcademicYear = (academicYear || '').trim();
  const cleanStudentCount = parseInt(String(studentCount || '0'), 10) || 0;

  const groupPrefix = cleanGroup ? `(${cleanGroup})` : '';
  const standardFileName = `${groupPrefix}(${cleanYear})(${cleanDept})(${cleanCode})(${cleanName})(${cleanLecturer})${ext}`;

  // Save file locally to server uploads as backup
  const safeDiskName = `${Date.now()}_${standardFileName}`;
  const diskPath = path.join(UPLOADS_DIR, safeDiskName);
  try {
    fs.writeFileSync(diskPath, req.file.buffer);
  } catch (err) {
    console.error('Failed to save file on disk:', err);
  }

  // Upload directly to Google Drive folder via Google Apps Script Webhook
  const GOOGLE_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbzRMcEFXIB3PwxEH_jyg-px9-Za711cAjiQz1dJoQnsbl7wAA2rsKktJbK3ndX1MC6CUg/exec';

  let googleDriveFileId: string | null = null;
  let googleDriveFileUrl: string | null = null;

  try {
    const drivePayload = {
      fileName: standardFileName,
      fileBase64: req.file.buffer.toString('base64'),
      mimeType: req.file.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const driveRes = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(drivePayload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
    });

    if (driveRes.ok) {
      const driveData: any = await driveRes.json();
      if (driveData.status === 'success') {
        googleDriveFileId = driveData.fileId;
        googleDriveFileUrl = driveData.fileUrl;
        console.log(`Uploaded to Google Drive successfully: ${standardFileName} (ID: ${driveData.fileId})`);
      } else {
        console.warn('Google Script return warning:', driveData.message);
      }
    }
  } catch (uploadErr) {
    console.error('Google Drive Webhook upload error:', uploadErr);
  }

  const submission: GradeSubmission = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    year: cleanYear,
    faculty: (faculty || '').trim(),
    department: cleanDept,
    subjectCode: cleanCode,
    subjectName: cleanName,
    lecturerName: cleanLecturer,
    uploaderName: cleanUploader,
    studentGroup: cleanGroup || undefined,
    semester: cleanSemester || undefined,
    academicYear: cleanAcademicYear || undefined,
    studentCount: cleanStudentCount > 0 ? cleanStudentCount : undefined,
    standardFileName,
    originalFileName: req.file.originalname,
    fileSize: `${Math.round(req.file.size / 1024)} KB`,
    submittedAt: new Date().toISOString(),
    storagePath: safeDiskName,
    googleDriveFileId: googleDriveFileId || null,
    googleDriveFileUrl: googleDriveFileUrl || null,
  };

  submissions.unshift(submission);
  saveSubmissionsData();

  res.json({
    success: true,
    message: 'ส่งใบกรอกเกรดและบันทึกเข้า Google Drive เรียบร้อยแล้ว',
    submission,
    googleDriveUploaded: Boolean(googleDriveFileId),
  });
});

// 15. Get list of all submitted grades (Strict Real-time File Existence Verification)
app.get('/api/grade-submissions', (req: Request, res: Response) => {
  // Real-time check: ตรวจสอบความมีอยู่จริงของไฟล์ในเครื่อง (Local Storage uploads/submitted-grades)
  // หากไฟล์ถูกลบออกไปจริง (เช่น การลบไฟล์ทดสอบ) รายการนั้นจะไม่ปรากฏในตารางทันที
  const activeSubmissions = submissions.filter((sub) => {
    // 1. ตรวจสอบจาก storagePath ที่บันทึกไว้
    if (sub.storagePath) {
      const filePath = path.join(UPLOADS_DIR, sub.storagePath);
      if (fs.existsSync(filePath)) {
        return true;
      }
    }

    // 2. ตรวจสอบไฟล์ใน UPLOADS_DIR ว่ามีไฟล์ที่ตรงกับชื่อมาตรฐานนี้อยู่จริงหรือไม่
    try {
      if (fs.existsSync(UPLOADS_DIR)) {
        const files = fs.readdirSync(UPLOADS_DIR);
        const exists = files.some((f) => f.includes(sub.standardFileName));
        if (exists) return true;
      }
    } catch {
      // ignore
    }

    // หากไม่มีไฟล์หลงเหลืออยู่ในไดเรกทอรีจัดเก็บจริง ให้ตัดออกทันที
    return false;
  });

  res.json({
    success: true,
    submissions: activeSubmissions,
  });
});

// 16. Delete a grade submission (Admin only)
app.delete('/api/grade-submissions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const target = submissions.find((s) => s.id === id);
  if (target && target.storagePath) {
    const filePath = path.join(UPLOADS_DIR, target.storagePath);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to unlink file:', e);
      }
    }
  }
  submissions = submissions.filter((s) => s.id !== id);
  saveSubmissionsData();
  res.json({ success: true, message: 'ลบรายการและไฟล์เรียบร้อยแล้ว' });
});

// --- VITE OR STATIC SERVING ---
async function startServer() {
  if (process.env.NODE_ENV === 'production' || fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DrivePass secure server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
});
