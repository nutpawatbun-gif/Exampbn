export interface DriveFileItem {
  id: string; // Google Drive file ID
  name: string;
  size: string; // e.g. "166 KB"
  bytes?: number;
  mimeType: string;
  faculty?: string; // คณะ
  department?: string; // สาขาวิชา
  studentType?: 'บรรพชิต' | 'คฤหัสถ์'; // บรรพชิต (Monk) หรือ คฤหัสถ์ (Layperson)
  year?: number; // 1, 2, 3, 4
  downloadCount: number;
  lastDownloadedAt?: string | null;
  directDownloadUrl: string;
  previewUrl: string;
}

export interface SecurityConfig {
  requirePassword: boolean;
  password?: string; // Plain for demo/creator view
  passwordHint?: string;
  expiresAt: string | null; // ISO string or null for never
  maxDownloads: number | null; // null for unlimited
  allowPreviewWithoutDownload: boolean;
  allowZipDownload: boolean;
  requireCaptchaAfterFails?: boolean;
}

export interface SharePackage {
  id: string; // unique slug or ID
  title: string;
  description: string;
  sourceDriveUrl: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
  security: SecurityConfig;
  files: DriveFileItem[];
  stats: {
    viewsCount: number;
    unlockedCount: number;
    totalDownloadsCount: number;
    lastAccessedAt: string | null;
  };
  customNote?: string;
}

export interface UnlockResult {
  success: boolean;
  message?: string;
  share?: SharePackage;
  token?: string;
}

export interface DownloadResponse {
  success: boolean;
  message?: string;
  remainingDownloads?: number | null;
  downloadUrl?: string;
}

export interface GradeSubmission {
  id: string;
  year: string; // e.g. "ปี 1", "ปี 2", "ปี 3", "ปี 4"
  faculty?: string; // e.g. "คณะพุทธศาสตร์"
  department: string; // e.g. "สาขาวิชารัฐประศาสนศาสตร์"
  subjectCode: string; // e.g. "รปศ101"
  subjectName: string; // e.g. "การบริหารรัฐกิจเบื้องต้น"
  lecturerName: string; // e.g. "ผศ.ดร.สมชาย ใจดี"
  uploaderName: string; // e.g. "อาจารย์สมชาย"
  studentGroup?: string; // e.g. "บรรพชิต" หรือ "คฤหัสถ์"
  semester?: string; // e.g. "1", "2", "3"
  academicYear?: string; // e.g. "2569"
  studentCount?: number; // จำนวนนิสิตในรายวิชา
  standardFileName: string; // e.g. "(ปี 1)(สาขาวิชารัฐประศาสนศาสตร์)(รปศ101)(การบริหารรัฐกิจเบื้องต้น)(ผศ.ดร.สมชาย ใจดี).xlsx"
  originalFileName: string;
  fileSize: string;
  submittedAt: string; // ISO date string
  storagePath?: string; // Local disk relative path
  googleDriveFileId?: string | null;
  googleDriveFileUrl?: string | null;
}
