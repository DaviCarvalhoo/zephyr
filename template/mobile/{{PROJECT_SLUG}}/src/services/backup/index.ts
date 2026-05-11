/**
 * Cloud backup. Uploads/downloads user-scoped tables as JSON via
 * server-issued presigned S3 URLs. Server is *not* in the data path
 * — once the URL is signed, the device talks directly to S3.
 *
 * Two-phase upload (atomic from the user's POV):
 *   1. POST /api/backup/upload-url    → presigned PUT to staging key
 *   2. PUT  s3://staging                ← upload directly
 *   3. POST /api/backup/promote        → server moves staging → real
 *
 * The previous backup survives if the upload fails between steps.
 *
 * Restore:
 *   1. GET /api/backup/download-url    → presigned GET
 *   2. GET s3://real                    ← download directly
 *   3. importUserTables(json)           ← apply locally in a tx
 *
 * Triggers (wired by AuthContext + Routes):
 *   - on login (premium user) — restoreFromCloud, bump dataVersion
 *   - on signOut (premium user) — backupToCloud BEFORE clearAuth
 *   - on cold-start + foreground (premium user) — backupToCloud,
 *     throttled to once per hour
 */

import { fetchApi } from '../fetch-api';
import { exportUserTables, importUserTables } from './export';

export interface BackupInfo {
    exists: boolean;
    lastModified?: string;
    size?: number;
}

interface UploadUrlResponse {
    ok: boolean;
    url: string;
    message?: string;
}

interface DownloadUrlResponse {
    ok: boolean;
    url: string;
    message?: string;
}

interface BackupInfoResponse {
    ok: boolean;
    exists: boolean;
    lastModified?: string;
    size?: number;
    message?: string;
}

interface PromoteResponse {
    ok: boolean;
    message?: string;
}

export async function getBackupInfo(token: string): Promise<BackupInfo> {
    const data = await fetchApi<BackupInfoResponse>('/api/backup/info', {
        token
    });
    if (!data.ok) {
        throw new Error(data.message ?? 'Failed to get backup info');
    }
    return {
        exists: data.exists,
        lastModified: data.lastModified,
        size: data.size
    };
}

export async function backupToCloud(
    token: string
): Promise<{ uploadedAt: string }> {
    const backup = await exportUserTables();
    const body = JSON.stringify(backup);

    const urlData = await fetchApi<UploadUrlResponse>(
        '/api/backup/upload-url',
        { method: 'POST', token }
    );
    if (!urlData.ok || !urlData.url) {
        throw new Error(urlData.message ?? 'Failed to get upload URL');
    }

    const uploadRes = await fetch(urlData.url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body
    });
    if (!uploadRes.ok) {
        throw new Error(`S3 upload failed: ${uploadRes.status}`);
    }

    const promoteData = await fetchApi<PromoteResponse>(
        '/api/backup/promote',
        { method: 'POST', token }
    );
    if (!promoteData.ok) {
        throw new Error(
            promoteData.message ?? 'Failed to promote backup'
        );
    }

    return { uploadedAt: new Date().toISOString() };
}

export async function restoreFromCloud(
    token: string
): Promise<{ restoredAt: string } | null> {
    const urlData = await fetchApi<DownloadUrlResponse>(
        '/api/backup/download-url',
        { token }
    );
    if (!urlData.ok || !urlData.url) {
        // No backup yet on the server — first login from this user.
        return null;
    }

    const dlRes = await fetch(urlData.url);
    if (!dlRes.ok) {
        throw new Error(`S3 download failed: ${dlRes.status}`);
    }
    const backup = await dlRes.json();

    await importUserTables(backup);
    return { restoredAt: new Date().toISOString() };
}

export { exportUserTables, importUserTables };
