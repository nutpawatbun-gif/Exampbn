import React, { useState, useEffect } from 'react';
import {
  FolderLock,
  ShieldCheck,
  Lock,
  Clock,
  Download,
  Share2,
  ExternalLink,
  Info,
  CheckCircle2,
  GraduationCap,
  Building2,
} from 'lucide-react';
import { SharePackage, GradeSubmission } from './types/share';
import { createDefaultSharePackage } from './data/defaultDriveFolder';
import { Navbar } from './components/Navbar';
import { LockScreen } from './components/LockScreen';
import { FileBrowser } from './components/FileBrowser';
import { ShareManager } from './components/ShareManager';
import { ShareLinksList } from './components/ShareLinksList';
import { ShareModal } from './components/ShareModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { GradeReturnForm } from './components/GradeReturnForm';
import { SubmittedGradesList } from './components/SubmittedGradesList';
import { subscribeRealtimeSync, recordDownloadSync } from './utils/syncManager';

// Helper to get initial share with localStorage sync
const getInitialSharePackage = (): SharePackage => {
  const def = createDefaultSharePackage();
  try {
    const savedDownloads = localStorage.getItem(`mcu_downloads_${def.id}`);
    if (savedDownloads !== null) {
      def.stats.totalDownloadsCount = parseInt(savedDownloads, 10) || 0;
    }
    const savedFiles = localStorage.getItem(`mcu_files_${def.id}`);
    if (savedFiles) {
      const fileData = JSON.parse(savedFiles) as {
        id: string;
        downloadCount: number;
        lastDownloadedAt?: string;
      }[];
      def.files = def.files.map((f) => {
        const found = fileData.find((item) => item.id === f.id);
        if (found) {
          return {
            ...f,
            downloadCount: found.downloadCount || 0,
            lastDownloadedAt: found.lastDownloadedAt,
          };
        }
        return f;
      });
    }
  } catch (err) {
    console.warn('LocalStorage share init fallback:', err);
  }
  return def;
};

export default function App() {
  const [shares, setShares] = useState<SharePackage[]>([getInitialSharePackage()]);
  const [activeShareId, setActiveShareId] = useState<string>('grade-sem1-2569');
  const [unlockedShares, setUnlockedShares] = useState<Record<string, boolean>>({});
  const [currentMode, setCurrentMode] = useState<
    'recipient' | 'admin' | 'create' | 'return' | 'return-list'
  >('recipient');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [lang, setLang] = useState<'th' | 'en'>('th');
  const [isLoading, setIsLoading] = useState(true);
  const [submissions, setSubmissions] = useState<GradeSubmission[]>([]);

  // Admin authentication state
  const [adminToken, setAdminToken] = useState<string>(() => {
    return sessionStorage.getItem('mcu_admin_token') || '';
  });
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [pendingAdminMode, setPendingAdminMode] = useState<'admin' | 'create' | null>(null);

  const [isRefreshingSubmissions, setIsRefreshingSubmissions] = useState(false);

  // Fetch submissions from backend with real-time file existence check
  const fetchSubmissions = async () => {
    setIsRefreshingSubmissions(true);
    try {
      const res = await fetch('/api/grade-submissions');
      if (res.ok) {
        const json = await res.json();
        if (json.submissions) {
          setSubmissions(json.submissions);
        }
      }
    } catch (err) {
      console.warn('Could not fetch submissions:', err);
    } finally {
      setIsRefreshingSubmissions(false);
    }
  };

  // Load shares from backend on mount (or on admin login/logout)
  const fetchShares = async (tokenOverride?: string) => {
    try {
      const activeToken = tokenOverride !== undefined ? tokenOverride : adminToken;
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers['x-admin-token'] = activeToken;
      }
      const res = await fetch('/api/shares', { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          const fullShares: SharePackage[] = json.data.map((item: any) => {
            const def = createDefaultSharePackage();

            // Ensure expiration date is kept active and fresh
            let expiresAt = item.security?.expiresAt || def.security.expiresAt;
            if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
              expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            }

            // Sync total download count with localStorage
            let localTotalDownloads = item.stats?.totalDownloadsCount || 0;
            const savedDownloads = localStorage.getItem(`mcu_downloads_${item.id}`);
            if (savedDownloads !== null) {
              const parsed = parseInt(savedDownloads, 10);
              if (!isNaN(parsed) && parsed > localTotalDownloads) {
                localTotalDownloads = parsed;
              }
            }

            // Sync files download counts with localStorage
            let mergedFiles = item.files && item.files.length > 0 ? item.files : def.files;
            const savedFiles = localStorage.getItem(`mcu_files_${item.id}`);
            if (savedFiles) {
              try {
                const fileData = JSON.parse(savedFiles);
                mergedFiles = mergedFiles.map((f: any) => {
                  const found = fileData.find((fd: any) => fd.id === f.id);
                  if (found && (found.downloadCount || 0) > (f.downloadCount || 0)) {
                    return {
                      ...f,
                      downloadCount: found.downloadCount,
                      lastDownloadedAt: found.lastDownloadedAt,
                    };
                  }
                  return f;
                });
              } catch {}
            }

            return {
              ...def,
              ...item,
              security: {
                ...def.security,
                ...item.security,
                expiresAt,
              },
              files: mergedFiles,
              stats: {
                ...def.stats,
                ...item.stats,
                totalDownloadsCount: localTotalDownloads,
              },
            };
          });
          setShares(fullShares);
        }
      }
    } catch (e) {
      console.warn('API fetch fallback to local:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShares();
    fetchSubmissions();

    // Check URL parameters for ?share=ID or hash
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('share');
    if (shareParam) {
      setActiveShareId(shareParam);
      setCurrentMode('recipient');
    }

    // Auto-refresh interval (every 8 seconds) for submissions
    const timer = setInterval(() => {
      fetchSubmissions();
    }, 8000);

    // Real-time synchronization across different browsers (Chrome, Edge, Mobile) & tabs
    const targetShareId = shareParam || activeShareId;
    const unsubscribeSync = subscribeRealtimeSync(targetShareId, (syncData) => {
      setShares((prev) =>
        prev.map((s) => {
          if (s.id === targetShareId) {
            let changed = false;
            let updatedDownloads = s.stats.totalDownloadsCount;
            if (syncData.totalDownloads > s.stats.totalDownloadsCount) {
              updatedDownloads = syncData.totalDownloads;
              changed = true;
            }

            const updatedFiles = s.files.map((f) => {
              const cloudCount = syncData.fileDownloads[f.id];
              if (typeof cloudCount === 'number' && cloudCount > (f.downloadCount || 0)) {
                changed = true;
                return { ...f, downloadCount: cloudCount };
              }
              return f;
            });

            if (!changed) return s;

            return {
              ...s,
              files: updatedFiles,
              stats: {
                ...s.stats,
                totalDownloadsCount: updatedDownloads,
              },
            };
          }
          return s;
        })
      );
    });

    return () => {
      clearInterval(timer);
      unsubscribeSync();
    };
  }, [activeShareId]);

  // Current active share object
  const activeShare =
    shares.find((s) => s.id === activeShareId) || shares[0] || getInitialSharePackage();

  // Handlers
  const handleUnlockSuccess = (unlockedPkg: SharePackage) => {
    setUnlockedShares((prev) => ({ ...prev, [unlockedPkg.id]: true }));
    setShares((prev) =>
      prev.map((s) => (s.id === unlockedPkg.id ? { ...s, ...unlockedPkg } : s))
    );
  };

  const handleLockSession = () => {
    setUnlockedShares((prev) => ({ ...prev, [activeShare.id]: false }));
  };

  const handleUpdateShareStats = (
    newTotalDownloads: number,
    updatedFiles?: DriveFileItem[]
  ) => {
    setShares((prev) =>
      prev.map((s) => {
        if (s.id === activeShare.id) {
          return {
            ...s,
            files: updatedFiles || s.files,
            stats: { ...s.stats, totalDownloadsCount: newTotalDownloads },
          };
        }
        return s;
      })
    );

    // Save & Broadcast across all browsers (Chrome, Edge, Safari, Mobile)
    const fileDownloads: Record<string, number> = {};
    const filesToSync = updatedFiles || activeShare.files;
    filesToSync.forEach((f) => {
      if (f.downloadCount && f.downloadCount > 0) {
        fileDownloads[f.id] = f.downloadCount;
      }
    });

    recordDownloadSync(
      activeShare.id,
      newTotalDownloads,
      fileDownloads,
      activeShare.security.expiresAt || undefined
    );
  };

  const handleShareCreated = (newShare: SharePackage) => {
    setShares((prev) => [newShare, ...prev]);
    setActiveShareId(newShare.id);
    setCurrentMode('recipient');
    setIsShareModalOpen(true);
  };

  const handleModeChange = (
    mode: 'recipient' | 'admin' | 'create' | 'return' | 'return-list'
  ) => {
    if ((mode === 'admin' || mode === 'create') && !adminToken) {
      setPendingAdminMode(mode);
      setIsAdminAuthModalOpen(true);
      return;
    }
    setCurrentMode(mode);
  };

  const handleAdminLoginSuccess = (token: string) => {
    setAdminToken(token);
    sessionStorage.setItem('mcu_admin_token', token);
    fetchShares(token);
    if (pendingAdminMode) {
      setCurrentMode(pendingAdminMode);
      setPendingAdminMode(null);
    } else {
      setCurrentMode('admin');
    }
  };

  const handleLogoutAdmin = () => {
    setAdminToken('');
    sessionStorage.removeItem('mcu_admin_token');
    fetchShares('');
    setCurrentMode('recipient');
  };

  const isUnlocked = Boolean(unlockedShares[activeShare.id]);

  return (
    <div className="min-h-screen bg-mcu-page text-[#4a148c] flex flex-col antialiased selection:bg-[#ec407a] selection:text-white font-['Sarabun','Prompt',sans-serif]">
      {/* Top Navbar in MCU University Styling */}
      <Navbar
        currentMode={currentMode}
        onModeChange={handleModeChange}
        shares={shares}
        activeShareId={activeShare.id}
        onSelectShare={(id) => {
          setActiveShareId(id);
          setCurrentMode('recipient');
        }}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        isAdminLoggedIn={Boolean(adminToken)}
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'th' ? 'en' : 'th'))}
        submittedCount={submissions.length}
      />

      {/* Main Body */}
      <main className="flex-1 flex flex-col justify-start">
        {currentMode === 'recipient' && (
          <div className="py-2">
            {!isUnlocked ? (
              <LockScreen
                share={activeShare}
                onUnlockSuccess={handleUnlockSuccess}
                lang={lang}
              />
            ) : (
              <FileBrowser
                share={activeShare}
                onLock={handleLockSession}
                onUpdateShareStats={handleUpdateShareStats}
                lang={lang}
                submittedSubmissions={submissions}
                onNavigateToReturn={() => setCurrentMode('return')}
              />
            )}
          </div>
        )}

        {currentMode === 'return' && (
          <div className="py-2">
            <GradeReturnForm
              onSuccess={(newSub) => {
                setSubmissions((prev) => [newSub, ...prev]);
              }}
              onViewList={() => setCurrentMode('return-list')}
              lang={lang}
            />
          </div>
        )}

        {currentMode === 'return-list' && (
          <div className="py-2">
            <SubmittedGradesList
              submissions={submissions}
              onBackToSubmit={() => setCurrentMode('return')}
              onRefresh={fetchSubmissions}
              isRefreshing={isRefreshingSubmissions}
              lang={lang}
            />
          </div>
        )}

        {currentMode === 'admin' && (
          <ShareLinksList
            shares={shares}
            onSelectShare={(share) => {
              setActiveShareId(share.id);
              setCurrentMode('recipient');
            }}
            onOpenShareModal={(share) => {
              setActiveShareId(share.id);
              setIsShareModalOpen(true);
            }}
            onRefresh={() => fetchShares(adminToken)}
            onCreateNew={() => setCurrentMode('create')}
            adminToken={adminToken}
            onLogoutAdmin={handleLogoutAdmin}
            lang={lang}
          />
        )}

        {currentMode === 'create' && (
          <ShareManager
            onShareCreated={handleShareCreated}
            adminToken={adminToken}
            lang={lang}
          />
        )}
      </main>

      {/* Share Modal with QR code and Direct Link */}
      {isShareModalOpen && (
        <ShareModal
          share={activeShare}
          onClose={() => setIsShareModalOpen(false)}
          lang={lang}
        />
      )}

      {/* Admin Auth Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => {
          setIsAdminAuthModalOpen(false);
          setPendingAdminMode(null);
        }}
        onSuccess={handleAdminLoginSuccess}
        lang={lang}
      />

      {/* Institutional University Footer */}
      <footer className="border-t border-[#f8bbd0]/60 bg-white/75 backdrop-blur-md py-8 px-4 text-xs text-[#7b1fa2] mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* University info */}
          <div className="flex items-center gap-3">
            <img
              src="/college-logo.png"
              alt="ตราประจำวิทยาลัยสงฆ์พ่อขุนผาเมือง เพชรบูรณ์"
              className="h-10 w-auto object-contain shrink-0"
            />
            <div>
              <p className="font-bold text-[#4a148c] text-xs sm:text-sm">
                วิทยาลัยสงฆ์พ่อขุนผาเมือง เพชรบูรณ์
              </p>
              <p className="text-[11px] text-[#7b1fa2]/80">
                วิทยาลัยสงฆ์พ่อขุนผาเมือง เพชรบูรณ์
              </p>
            </div>
          </div>

          {/* System & Drive links */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-4 text-xs text-[#7b1fa2]">
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-[#ec407a]" />
              <span>ระบบปลอดภัย ไม่ต้องลงชื่อเข้าใช้ (Zero-Login)</span>
            </div>
            <span>•</span>
            <a
              href="https://phetchabun.mcu.ac.th/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#c2185b] transition-colors flex items-center gap-1 font-semibold"
            >
              <span>เว็บไซต์วิทยาลัยสงฆ์พ่อขุนผาเมือง เพชรบูรณ์ (phetchabun.mcu.ac.th)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
