import api from "../api/axiosInstance";
import useZustandStore from "../stores/zustandStore";

const endpoint = (environment) =>
  `/database-backups/${encodeURIComponent(environment)}`;

export const getDatabaseBackupOverview = (environment) =>
  api.get(`/database-backups/overview/${encodeURIComponent(environment)}`);

export const getDatabaseBackupHistory = (environment) =>
  api.get(`/database-backups/history/${encodeURIComponent(environment)}`);

export const createDatabaseBackup = (environment, confirmation) =>
  api.post(endpoint(environment), { confirmation });

export const verifyDatabaseBackup = (environment, backupId) =>
  api.post(`${endpoint(environment)}/${encodeURIComponent(backupId)}/verify`);

export const uploadDatabaseBackupToDrive = (environment, backupId) =>
  api.post(
    `${endpoint(environment)}/${encodeURIComponent(backupId)}/google-drive`,
  );

export const deleteDatabaseBackup = (environment, backupId, confirmation) =>
  api.delete(`${endpoint(environment)}/${encodeURIComponent(backupId)}`, {
    data: { confirmation },
  });

export const createDatabaseBackupDownloadTicket = (environment, backupId) =>
  api.post(
    `${endpoint(environment)}/${encodeURIComponent(backupId)}/download-ticket`,
  );

export const downloadDatabaseBackup = async (environment, backup) => {
  const token =
    useZustandStore.getState().token || localStorage.getItem("token");
  const relativeUrl = `${endpoint(environment)}/${encodeURIComponent(backup.id)}/download`;
  const url = new URL(api.getUri({ url: relativeUrl }), window.location.origin);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  if ("showSaveFilePicker" in window) {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: backup.filename,
    });
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(
        (await response.json()).message || "Backup download failed.",
      );
    }
    if (!response.body) {
      throw new Error("The browser could not stream the backup download.");
    }
    await response.body.pipeTo(await fileHandle.createWritable());
    await api.post(
      `${endpoint(environment)}/${encodeURIComponent(backup.id)}/download-complete`,
    );
    return;
  }

  const ticketResponse = await createDatabaseBackupDownloadTicket(
    environment,
    backup.id,
  );
  const ticketUrl = new URL(
    api.getUri({
      url: `${endpoint(environment)}/${encodeURIComponent(backup.id)}/download-file/${encodeURIComponent(ticketResponse.data.ticket)}`,
    }),
    window.location.origin,
  );
  const link = document.createElement("a");
  link.href = ticketUrl;
  link.download = backup.filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  return "started";
};
