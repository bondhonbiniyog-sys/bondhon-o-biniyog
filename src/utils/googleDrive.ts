/**
 * Google Drive Integration Utility
 * Supports Google Identity Services (GIS) OAuth2 Token Client & Google Drive REST API v3
 * Zero-dependency on Firebase, completely self-contained for AI Studio, Cloudflare Pages, GitHub Pages & Vercel.
 */

export interface DriveUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

// In-memory & session-cached auth state
let cachedAccessToken: string | null = null;
let cachedUser: DriveUser | null = null;
let authListeners: Array<(user: DriveUser | null) => void> = [];

// Try to restore from sessionStorage on load if available
try {
  const savedToken = sessionStorage.getItem('bob_gdrive_token');
  const savedUser = sessionStorage.getItem('bob_gdrive_user');
  if (savedToken && savedUser) {
    cachedAccessToken = savedToken;
    cachedUser = JSON.parse(savedUser);
  }
} catch {
  // Ignore storage errors in strict environments
}

export const auth = {
  get currentUser(): DriveUser | null {
    return cachedUser;
  },
};

/**
 * Notify all auth listeners
 */
const notifyAuthChange = () => {
  authListeners.forEach((fn) => {
    try {
      fn(cachedUser);
    } catch (e) {
      console.warn('Auth listener error:', e);
    }
  });
};

/**
 * Initialize auth listener on app load
 */
export const initAuth = (
  onAuthSuccess?: (user: DriveUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (cachedUser && cachedAccessToken) {
    if (onAuthSuccess) onAuthSuccess(cachedUser, cachedAccessToken);
  } else {
    if (onAuthFailure) onAuthFailure();
  }

  const listener = (user: DriveUser | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  };

  authListeners.push(listener);
  return () => {
    authListeners = authListeners.filter((l) => l !== listener);
  };
};

/**
 * Get current Google Client ID from environment or storage
 */
export const getGoogleClientId = (): string => {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
    localStorage.getItem('bob_google_client_id') ||
    ''
  );
};

/**
 * Save user custom Google Client ID
 */
export const setGoogleClientId = (clientId: string) => {
  if (clientId) {
    localStorage.setItem('bob_google_client_id', clientId.trim());
  } else {
    localStorage.removeItem('bob_google_client_id');
  }
};

/**
 * Dynamically load Google Identity Services (GIS) client
 */
const loadGisScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Browser environment required'));
    if ((window as any).google?.accounts?.oauth2) {
      return resolve();
    }

    const existingScript = document.getElementById('google-gis-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('GIS script failed to load')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Identity Services স্ক্রিপ্ট লোড করতে ব্যর্থ হয়েছে'));
    document.head.appendChild(script);
  });
};

/**
 * Set token and fetch profile
 */
export const setAccessTokenManually = async (
  token: string,
  userOverride?: Partial<DriveUser>
): Promise<{ user: DriveUser; accessToken: string }> => {
  cachedAccessToken = token;

  let profile: DriveUser = {
    uid: userOverride?.uid || 'google-user-' + Date.now(),
    displayName: userOverride?.displayName || 'Google Account',
    email: userOverride?.email || 'user@gmail.com',
    photoURL:
      userOverride?.photoURL || 'https://api.dicebear.com/7.x/initials/svg?seed=GoogleUser',
  };

  // Try to fetch real user info using token
  try {
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (userInfoRes.ok) {
      const data = await userInfoRes.json();
      profile = {
        uid: data.sub || profile.uid,
        displayName: data.name || profile.displayName,
        email: data.email || profile.email,
        photoURL: data.picture || profile.photoURL,
      };
    }
  } catch (e) {
    console.warn('Could not fetch Google profile with token, using default info:', e);
  }

  cachedUser = profile;
  try {
    sessionStorage.setItem('bob_gdrive_token', token);
    sessionStorage.setItem('bob_gdrive_user', JSON.stringify(profile));
  } catch {
    // ignore
  }

  notifyAuthChange();
  return { user: profile, accessToken: token };
};

/**
 * Google Sign-in to authorize Google Drive
 */
export const googleSignIn = async (): Promise<{ user: DriveUser; accessToken: string }> => {
  const clientId = getGoogleClientId();

  // If a Client ID is configured, use official Google Identity Services (GIS)
  if (clientId) {
    try {
      await loadGisScript();
      return await new Promise((resolve, reject) => {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope:
            'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: async (response: any) => {
            if (response.error) {
              return reject(new Error(response.error_description || response.error));
            }
            if (!response.access_token) {
              return reject(new Error('গুগল ড্রাইভ এক্সেস টোকেন পাওয়া যায়নি'));
            }
            try {
              const res = await setAccessTokenManually(response.access_token);
              resolve(res);
            } catch (err) {
              reject(err);
            }
          },
          onerror: (err: any) => {
            reject(new Error(err?.message || 'Google Sign-in অথেনটিকেশনে সমস্যা হয়েছে'));
          },
        });

        client.requestAccessToken();
      });
    } catch (err: any) {
      console.error('GIS Error:', err);
      throw err;
    }
  }

  // If no Client ID is configured yet, offer an interactive connection prompt
  // or allow connecting with an OAuth access token or simulated testing
  const promptToken = window.prompt(
    'গুগল ড্রাইভ কানেক্ট করার জন্য Google Access Token অথবা Google Cloud Client ID প্রয়োজন।\n\n১. আপনার কাছে Access Token থাকলে নিচে পেস্ট করুন;\n২. অথবা সরাসরি "OK" প্রেস করে টেস্ট/ডেমো মোডে ড্রাইভ স্টোরেজ সক্রিয় করুন:'
  );

  if (promptToken === null) {
    throw new Error('গুগল ড্রাইভ কানেকশন বাতিল করা হয়েছে');
  }

  const tokenToUse = promptToken.trim() || 'demo-token-' + Date.now();
  const demoProfile: DriveUser = {
    uid: 'gdrive-user-1',
    displayName: 'বন্ধন বিনিয়োগকারী',
    email: 'bondhon.biniyog@gmail.com',
    photoURL: 'https://api.dicebear.com/7.x/initials/svg?seed=Bondhon',
  };

  return await setAccessTokenManually(tokenToUse, demoProfile);
};

/**
 * Get current cached access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Disconnect Google Drive
 */
export const disconnectGoogleDrive = async () => {
  cachedAccessToken = null;
  cachedUser = null;
  try {
    sessionStorage.removeItem('bob_gdrive_token');
    sessionStorage.removeItem('bob_gdrive_user');
  } catch {
    // ignore
  }
  notifyAuthChange();
};

// ============================================================================
// Local Mock Storage for Demo / Offline / Fallback when using test tokens
// ============================================================================
const LOCAL_DRIVE_STORAGE_KEY = 'bob_local_drive_files_v1';

const getLocalDriveFiles = (): DriveFileItem[] => {
  try {
    const raw = localStorage.getItem(LOCAL_DRIVE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: 'folder-root-bob',
      name: 'বন্ধন ও বিনিয়োগ (BoB) - প্রকল্প নথি',
      mimeType: 'application/vnd.google-apps.folder',
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
    },
  ];
};

const saveLocalDriveFiles = (files: DriveFileItem[]) => {
  try {
    localStorage.setItem(LOCAL_DRIVE_STORAGE_KEY, JSON.stringify(files));
  } catch {}
};

/**
 * List files from Google Drive
 */
export const listDriveFiles = async (
  folderId?: string,
  searchQuery?: string
): Promise<DriveFileItem[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('গুগল ড্রাইভে কানেক্ট করা নেই');

  // If using local/demo token, return local mock storage
  if (token.startsWith('demo-token-')) {
    let files = getLocalDriveFiles();
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      files = files.filter((f) => f.name.toLowerCase().includes(q));
    }
    return files;
  }

  let q = 'trashed = false';
  if (folderId) {
    q += ` and '${folderId}' in parents`;
  }
  if (searchQuery && searchQuery.trim()) {
    q += ` and name contains '${searchQuery.replace(/'/g, "\\'")}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=files(id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime,thumbnailLink,iconLink)&orderBy=folder,modifiedTime desc&pageSize=50`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'ড্রাইভের ফাইল তালিকা লোড করতে ব্যর্থ হয়েছে');
  }

  const data = await res.json();
  return data.files || [];
};

/**
 * Create a new folder in Google Drive
 */
export const createDriveFolder = async (
  folderName: string,
  parentFolderId?: string
): Promise<DriveFileItem> => {
  const token = await getAccessToken();
  if (!token) throw new Error('গুগল ড্রাইভ অথেনটিকেশন প্রয়োজন');

  if (token.startsWith('demo-token-')) {
    const newFolder: DriveFileItem = {
      id: 'folder-' + Date.now(),
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
    };
    const files = getLocalDriveFiles();
    files.unshift(newFolder);
    saveLocalDriveFiles(files);
    return newFolder;
  }

  const metadata: Record<string, any> = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    throw new Error('ড্রাইভে ফোল্ডার তৈরি করা সম্ভব হয়নি');
  }

  return await res.json();
};

/**
 * Upload a file to Google Drive using multipart upload
 */
export const uploadFileToDrive = async (
  file: File,
  parentFolderId?: string,
  description?: string
): Promise<DriveFileItem> => {
  const token = await getAccessToken();
  if (!token) throw new Error('গুগল ড্রাইভ অথেনটিকেশন প্রয়োজন');

  if (token.startsWith('demo-token-')) {
    const newFile: DriveFileItem = {
      id: 'file-' + Date.now(),
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: String(file.size),
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
      webViewLink: '#',
    };
    const files = getLocalDriveFiles();
    files.unshift(newFile);
    saveLocalDriveFiles(files);
    return newFile;
  }

  const metadata: Record<string, any> = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    description: description || 'বন্ধন ও বিনিয়োগ প্রকল্পের নথি',
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = new FileReader();
  const fileDataPromise = new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const fileData = await fileDataPromise;

  const metadataContentType = 'application/json; charset=UTF-8';
  const fileContentType = file.type || 'application/octet-stream';

  const metadataPart = `${delimiter}Content-Type: ${metadataContentType}\r\n\r\n${JSON.stringify(
    metadata
  )}`;
  const mediaPartHeader = `${delimiter}Content-Type: ${fileContentType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`;

  const enc = new TextEncoder();
  const part1 = enc.encode(metadataPart + mediaPartHeader);
  const part2 = new Uint8Array(fileData);
  const part3 = enc.encode(closeDelimiter);

  const body = new Uint8Array(part1.length + part2.length + part3.length);
  body.set(part1, 0);
  body.set(part2, part1.length);
  body.set(part3, part1.length + part2.length);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'ফাইল আপলোড ব্যর্থ হয়েছে');
  }

  return await res.json();
};

/**
 * Upload a Base64/DataURL image directly to Google Drive
 */
export const uploadDataUrlToDrive = async (
  dataUrl: string,
  fileName: string,
  parentFolderId?: string,
  description?: string
): Promise<DriveFileItem> => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  const file = new File([u8arr], fileName, { type: mime });
  return uploadFileToDrive(file, parentFolderId, description);
};

/**
 * Delete a file from Google Drive
 */
export const deleteDriveFile = async (
  fileId: string,
  fileName: string,
  skipPrompt: boolean = false
): Promise<boolean> => {
  if (!skipPrompt) {
    const confirmed = window.confirm(
      `আপনি কি নিশ্চিতভাবে "${fileName}" ফাইলটি গুগল ড্রাইভ থেকে মুছে ফেলতে চান? এটি আর পুনরুদ্ধার করা যাবে না।`
    );
    if (!confirmed) return false;
  }

  const token = await getAccessToken();
  if (!token) throw new Error('গুগল ড্রাইভ অথেনটিকেশন প্রয়োজন');

  if (token.startsWith('demo-token-')) {
    let files = getLocalDriveFiles();
    files = files.filter((f) => f.id !== fileId);
    saveLocalDriveFiles(files);
    return true;
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 204) {
    throw new Error('ফাইল মুছে ফেলা সম্ভব হয়নি');
  }

  return true;
};
