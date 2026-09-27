import React, { useState, useEffect } from 'react';
import {
  googleSignIn,
  disconnectGoogleDrive,
  listDriveFiles,
  createDriveFolder,
  uploadFileToDrive,
  deleteDriveFile,
  getAccessToken,
  type DriveFileItem,
  auth,
  getGoogleClientId,
  setGoogleClientId,
  setAccessTokenManually,
} from '../utils/googleDrive';

interface GoogleDriveExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFolderName?: string;
}

export const GoogleDriveExplorerModal: React.FC<GoogleDriveExplorerModalProps> = ({
  isOpen,
  onClose,
  defaultFolderName = 'বন্ধন ও বিনিয়োগ (BoB) - প্রকল্প নথি',
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Folder navigation
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [folderPath, setFolderPath] = useState<{ id?: string; name: string }[]>([
    { id: undefined, name: 'My Drive (প্রধান ড্রাইভ)' },
  ]);

  // Modals inside
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploading, setUploading] = useState(false);

  // File to delete confirmation
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);

  // Configuration settings for Client ID / Token
  const [showConfig, setShowConfig] = useState(false);
  const [clientIdInput, setClientIdInput] = useState(getGoogleClientId());
  const [manualTokenInput, setManualTokenInput] = useState('');

  // Check auth on open
  useEffect(() => {
    if (isOpen) {
      checkAuthAndLoad();
    }
  }, [isOpen]);

  const checkAuthAndLoad = async () => {
    const token = await getAccessToken();
    const currentUser = auth.currentUser;
    if (token && currentUser) {
      setIsConnected(true);
      setGoogleUser(currentUser);
      loadFiles(currentFolderId);
    } else {
      setIsConnected(false);
      setGoogleUser(null);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await googleSignIn();
      if (res) {
        setIsConnected(true);
        setGoogleUser(res.user);
        setSuccessMsg('গুগল ড্রাইভ সফলভাবে সংযুক্ত হয়েছে!');
        setTimeout(() => setSuccessMsg(''), 3000);
        loadFiles(currentFolderId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'গুগল অ্যাকাউন্টে লগইন করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleDrive();
    setIsConnected(false);
    setGoogleUser(null);
    setFiles([]);
  };

  const loadFiles = async (folderId?: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const list = await listDriveFiles(folderId, searchQuery);
      setFiles(list);
    } catch (err: any) {
      setErrorMsg(err.message || 'ড্রাইভের ফাইল লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder: DriveFileItem) => {
    setCurrentFolderId(folder.id);
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    loadFiles(folder.id);
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = folderPath[index];
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolderId(target.id);
    loadFiles(target.id);
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setLoading(true);
    try {
      await createDriveFolder(newFolderName.trim(), currentFolderId);
      setSuccessMsg(`"${newFolderName}" ফোল্ডার তৈরি হয়েছে`);
      setShowCreateFolder(false);
      setNewFolderName('');
      loadFiles(currentFolderId);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'ফোল্ডার তৈরিতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg('');
    try {
      await uploadFileToDrive(file, currentFolderId, 'আপলোডকৃত BoB প্রজেক্ট নথি');
      setSuccessMsg(`"${file.name}" সফলভাবে ড্রাইভে আপলোড হয়েছে!`);
      loadFiles(currentFolderId);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'ফাইল আপলোড ব্যর্থ হয়েছে');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await deleteDriveFile(fileToDelete.id, fileToDelete.name, true);
      setSuccessMsg(`"${fileToDelete.name}" সফলভাবে মুছে ফেলা হয়েছে`);
      setFileToDelete(null);
      loadFiles(currentFolderId);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'ফাইল মুছে ফেলতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn font-bengali">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-white shadow-md">
              <i className="fa-brands fa-google-drive text-xl"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  গুগল ড্রাইভ প্রজেক্ট ফাইল ও ডকুমেন্ট আর্কাইভ
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  Google Drive API v3
                </span>
              </div>
              <p className="text-xs text-slate-400">
                জমির সিএস/আরএস খতিয়ান, সাব-কবলা দলিল, সদস্য সনদ এবং রসিদের ডিজিটাল ব্যাকআপ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="cursor-pointer p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-red-400"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-emerald-400"></i>
              <span>{successMsg}</span>
            </div>
          )}

          {!isConnected ? (
            /* Not Connected State - Official Google Sign-In button */
            <div className="py-12 px-4 text-center max-w-lg mx-auto space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto text-3xl shadow-inner">
                <i className="fa-brands fa-google-drive"></i>
              </div>

              <div>
                <h4 className="text-xl font-bold text-white mb-2">
                  আপনার গুগল ড্রাইভে সুরক্ষিতভাবে যুক্ত হোন
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  বন্ধন ও বিনিয়োগ (BoB) উদ্যোগের সকল জমির সিএস/আরএস রেকর্ড, দলিলের স্ক্যান কপি, শেয়ার সনদ এবং পরিশোধিত কিস্তির হিসাবের ছবি সরাসরি আপনার নিজস্ব গুগল ড্রাইভে সংরক্ষণ ও ব্রাউজ করতে অনুমতি দিন।
                </p>
              </div>

              {/* Official Google Sign-in button */}
              <div className="flex flex-col items-center gap-3 pt-2">
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className="cursor-pointer group relative inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm shadow-xl hover:shadow-2xl transition-all border border-slate-200"
                >
                  <svg
                    className="w-5 h-5 shrink-0"
                    viewBox="0 0 48 48"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                  </svg>
                  <span>
                    {loading ? 'কানেক্ট হচ্ছে...' : 'Sign in with Google (ড্রাইভ কানেক্ট করুন)'}
                  </span>
                </button>

                {/* Optional Settings Toggle */}
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-xs text-slate-400 hover:text-slate-200 underline decoration-slate-600 transition cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-gear text-[10px]"></i>
                  <span>Google Cloud Client ID / Access Token কনফিগারেশন {showConfig ? 'লুকান' : 'দেখান'}</span>
                </button>

                {showConfig && (
                  <div className="w-full text-left bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 animate-fadeIn">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Google Cloud Client ID (OAuth 2.0 Client ID)
                      </label>
                      <input
                        type="text"
                        value={clientIdInput}
                        onChange={(e) => {
                          setClientIdInput(e.target.value);
                          setGoogleClientId(e.target.value);
                        }}
                        placeholder="7xxxxxxxx-xxxx.apps.googleusercontent.com"
                        className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        * ক্লাউডফ্লেয়ার বা গিটহাবে লাইভ অ্যাপে অটোমেটিক গুগল সাইন-ইন পেতে আপনার গুগল ক্লাউড কনসোলের Web Client ID দিন।
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">সরাসরি Access Token দিয়ে কানেক্ট করতে চান?</span>
                      <button
                        onClick={async () => {
                          const tok = window.prompt('আপনার Google Access Token দিন:');
                          if (tok && tok.trim()) {
                            setLoading(true);
                            try {
                              const res = await setAccessTokenManually(tok.trim());
                              setIsConnected(true);
                              setGoogleUser(res.user);
                              setSuccessMsg('টোকেন দিয়ে সফলভাবে গুগল ড্রাইভ কানেক্ট হয়েছে!');
                              setTimeout(() => setSuccessMsg(''), 3000);
                              loadFiles();
                            } catch (e: any) {
                              setErrorMsg(e.message || 'টোকেন ভেরিফিকেশন ব্যর্থ');
                            } finally {
                              setLoading(false);
                            }
                          }
                        }}
                        className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 rounded-lg cursor-pointer"
                      >
                        টোকেন দিন
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                <i className="fa-solid fa-shield-halved text-emerald-400 mr-1.5"></i>
                আপনার সম্মতি ছাড়া কোনো ফাইল পরিবর্তিত বা মোছা হবে না।
              </div>
            </div>
          ) : (
            /* Connected State - File Explorer */
            <div className="space-y-4">
              {/* Account Ribbon & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      googleUser?.photoURL ||
                      'https://api.dicebear.com/7.x/initials/svg?seed=GoogleUser'
                    }
                    alt="Google User"
                    className="w-9 h-9 rounded-full border border-emerald-400 object-cover"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{googleUser?.displayName || 'Google Account'}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-english">
                      {googleUser?.email}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition">
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                    <span>{uploading ? 'আপলোড হচ্ছে...' : 'ফাইল আপলোড'}</span>
                    <input
                      type="file"
                      disabled={uploading}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={() => setShowCreateFolder(true)}
                    className="cursor-pointer px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <i className="fa-solid fa-folder-plus text-amber-400"></i>
                    <span>নতুন ফোল্ডার</span>
                  </button>

                  <button
                    onClick={() => loadFiles(currentFolderId)}
                    title="রিফ্রেশ"
                    className="cursor-pointer p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition"
                  >
                    <i className="fa-solid fa-arrows-rotate"></i>
                  </button>

                  <button
                    onClick={handleDisconnect}
                    title="ডিসকানেক্ট করুন"
                    className="cursor-pointer px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs transition"
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket mr-1"></i>
                    <span>ডিসকানেক্ট</span>
                  </button>
                </div>
              </div>

              {/* Breadcrumb Navigation & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Breadcrumbs */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                  <i className="fa-solid fa-folder-tree text-amber-400 mr-1"></i>
                  {folderPath.map((item, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-slate-600">/</span>}
                      <button
                        onClick={() => handleBreadcrumbClick(idx)}
                        className={`cursor-pointer hover:text-white transition ${
                          idx === folderPath.length - 1
                            ? 'font-bold text-white bg-slate-800 px-2 py-0.5 rounded'
                            : ''
                        }`}
                      >
                        {item.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadFiles(currentFolderId)}
                    placeholder="ফাইল খুঁজুন (নাম লিখে এন্টার)..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Files Table / Grid */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
                {loading ? (
                  <div className="p-12 text-center text-slate-400">
                    <i className="fa-solid fa-circle-notch animate-spin text-2xl text-blue-400 mb-2 block"></i>
                    <span>ড্রাইভের ফাইল লোড হচ্ছে...</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 space-y-2">
                    <i className="fa-solid fa-box-open text-3xl mb-1 block text-slate-600"></i>
                    <p className="text-sm">এই ফোল্ডারে কোনো ফাইল নেই।</p>
                    <p className="text-xs text-slate-500">
                      উপরের "ফাইল আপলোড" বাটনে ক্লিক করে জমির দলিল, ছবি বা ভাউচার যোগ করতে পারেন।
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                      <tr>
                        <th className="py-3 px-4">ফাইলের নাম</th>
                        <th className="py-3 px-4 hidden sm:table-cell">ধরন</th>
                        <th className="py-3 px-4 hidden md:table-cell">তারিখ</th>
                        <th className="py-3 px-4 text-right">কার্যক্রম</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {files.map((file) => {
                        const isFolder =
                          file.mimeType === 'application/vnd.google-apps.folder';

                        return (
                          <tr
                            key={file.id}
                            className="hover:bg-slate-800/40 transition group"
                          >
                            <td className="py-3 px-4">
                              <div
                                onClick={() => isFolder && handleFolderClick(file)}
                                className={`flex items-center gap-2.5 ${
                                  isFolder ? 'cursor-pointer text-amber-300 font-semibold' : ''
                                }`}
                              >
                                {isFolder ? (
                                  <i className="fa-solid fa-folder text-amber-400 text-base"></i>
                                ) : file.mimeType.includes('pdf') ? (
                                  <i className="fa-solid fa-file-pdf text-red-400 text-base"></i>
                                ) : file.mimeType.includes('image') ? (
                                  <i className="fa-solid fa-file-image text-emerald-400 text-base"></i>
                                ) : (
                                  <i className="fa-solid fa-file text-blue-400 text-base"></i>
                                )}
                                <span className="truncate max-w-xs sm:max-w-md font-medium text-white">
                                  {file.name}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-4 hidden sm:table-cell text-slate-400">
                              {isFolder
                                ? 'ফোল্ডার'
                                : file.mimeType.includes('pdf')
                                ? 'পিডিএফ (PDF)'
                                : file.mimeType.includes('image')
                                ? 'ছবি (Image)'
                                : 'ডকুমেন্ট'}
                            </td>

                            <td className="py-3 px-4 hidden md:table-cell text-slate-500 font-english">
                              {file.modifiedTime ? file.modifiedTime.slice(0, 10) : '—'}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {file.webViewLink && (
                                  <a
                                    href={file.webViewLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="গুগল ড্রাইভে খুলুন"
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition"
                                  >
                                    <i className="fa-solid fa-arrow-up-right-from-square"></i>
                                  </a>
                                )}

                                <button
                                  onClick={() => setFileToDelete(file)}
                                  title="ফাইল মুছে ফেলুন"
                                  className="cursor-pointer p-1.5 rounded-lg bg-slate-800 hover:bg-red-600/30 text-slate-400 hover:text-red-400 transition"
                                >
                                  <i className="fa-solid fa-trash-can"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Create Folder Modal */}
        {showCreateFolder && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-folder-plus text-amber-400"></i>
                <span>নতুন ফোল্ডারের নাম দিন</span>
              </h4>
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="যেমন: পূর্বাচল প্রজেক্ট দলিলপত্র"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCreateFolder(false)}
                  className="cursor-pointer px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleCreateFolderSubmit}
                  className="cursor-pointer px-4 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs"
                >
                  ফোল্ডার তৈরি
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal (Mandatory User Confirmation for Destructive Actions) */}
        {fileToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85">
            <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-xl mx-auto">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-base font-bold text-white">
                  গুগল ড্রাইভ ফাইল মুছে ফেলার নিশ্চিতকরণ
                </h4>
                <p className="text-xs text-slate-300">
                  আপনি কি নিশ্চিতভাবে আপনার গুগল ড্রাইভ থেকে{' '}
                  <strong className="text-white font-english font-semibold">"{fileToDelete.name}"</strong> ফাইলটি স্থায়ীভাবে মুছে ফেলতে চান?
                </p>
                <p className="text-[11px] text-red-400 pt-1 font-semibold">
                  ⚠️ এই কাজটি বাতিল করা যাবে না এবং ফাইলটি চিরতরে মুছে যাবে।
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setFileToDelete(null)}
                  className="cursor-pointer px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  না, বাতিল করুন
                </button>
                <button
                  onClick={confirmDeleteFile}
                  className="cursor-pointer px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30"
                >
                  হ্যাঁ, ফাইলটি মুছে ফেলুন
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
