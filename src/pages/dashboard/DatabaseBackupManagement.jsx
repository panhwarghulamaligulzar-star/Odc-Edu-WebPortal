import { createElement, useCallback, useEffect, useState } from "react";
import {
  Archive,
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  Database,
  Download,
  HardDrive,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  createDatabaseBackup,
  deleteDatabaseBackup,
  downloadDatabaseBackup,
  getDatabaseBackupHistory,
  getDatabaseBackupOverview,
  uploadDatabaseBackupToDrive,
  verifyDatabaseBackup,
} from "../../services/databaseBackupService";

const ENVIRONMENTS = [
  { id: "local", label: "Local Development Database" },
  { id: "production", label: "Live Production Database" },
];
const BACKUP_CONFIRMATION = "BACK UP LIVE PRODUCTION";
const DELETE_CONFIRMATION = "DELETE LIVE PRODUCTION BACKUP";

const formatBytes = (value) => {
  if (value === null || value === undefined) return "Unavailable";
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleString() : "Never";

const getErrorMessage = (error) => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message === "Network Error") {
    return "Could not reach the backup server. Refresh backup history before retrying; the backup may still be running on the server.";
  }
  return error.message || "The operation failed.";
};

const Metric = ({ label, value, icon }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between text-slate-500">
      <span className="text-sm">{label}</span>
      {createElement(icon, { size: 18 })}
    </div>
    <p className="mb-0 mt-3 text-xl font-semibold text-slate-900">{value}</p>
  </div>
);

const DatabaseBackupManagement = () => {
  const [environment, setEnvironment] = useState("local");
  const [overview, setOverview] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const hasInProgressBackup = backups.some(
    (backup) => backup.status === "in_progress",
  );

  const loadEnvironment = useCallback(async ({ reportError = true } = {}) => {
    setLoading(true);
    const [overviewResult, historyResult] = await Promise.allSettled([
      getDatabaseBackupOverview(environment),
      getDatabaseBackupHistory(environment),
    ]);
    let refreshError = "";

    if (overviewResult.status === "fulfilled") {
      const currentOverview = overviewResult.value.data;
      setOverview(currentOverview);
    } else {
      refreshError = getErrorMessage(overviewResult.reason);
    }

    if (historyResult.status === "fulfilled") {
      setBackups(historyResult.value.data.backups || []);
    } else if (overviewResult.status === "fulfilled") {
      refreshError = getErrorMessage(historyResult.reason);
    }

    setLoading(false);
    if (reportError) setError(refreshError);
    return !refreshError;
  }, [environment]);

  useEffect(() => {
    loadEnvironment();
  }, [loadEnvironment]);

  useEffect(() => {
    if (!hasInProgressBackup) return undefined;

    let active = true;
    let timer;
    const pollBackupStatus = async () => {
      try {
        const historyResult = await getDatabaseBackupHistory(environment);
        if (!active) return;
        setError("");
        const updatedBackups = historyResult.data.backups || [];
        setBackups(updatedBackups);

        if (
          !updatedBackups.some((backup) => backup.status === "in_progress")
        ) {
          const overviewResult = await getDatabaseBackupOverview(environment);
          if (active) setOverview(overviewResult.data);
          return;
        }
      } catch (requestError) {
        if (active) {
          setError(
            `Backup status refresh failed: ${getErrorMessage(requestError)} Retrying automatically.`,
          );
        }
      }

      if (active) {
        timer = window.setTimeout(pollBackupStatus, 2500);
      }
    };

    timer = window.setTimeout(pollBackupStatus, 2500);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [environment, hasInProgressBackup]);

  const runAction = async (actionId, operation, successMessage) => {
    setBusyAction(actionId);
    setError("");
    setNotice("");
    try {
      const result = await operation();
      const successText =
        typeof successMessage === "function"
          ? successMessage(result)
          : successMessage;
      const refreshed = await loadEnvironment({ reportError: false });
      setError("");
      setNotice(
        refreshed
          ? successText
          : `${successText} The server accepted the request, but the page could not refresh its status. Use Refresh to check progress.`,
      );
    } catch (requestError) {
      await loadEnvironment({ reportError: false });
      setError(getErrorMessage(requestError));
    } finally {
      setBusyAction("");
    }
  };

  const confirmDialog = async () => {
    if (!dialog) return;
    if (
      environment === "production" &&
      confirmation !==
        (dialog.kind === "backup" ? BACKUP_CONFIRMATION : DELETE_CONFIRMATION)
    ) {
      setError("Enter the exact confirmation phrase to continue.");
      return;
    }
    const currentDialog = dialog;
    setDialog(null);
    setConfirmation("");
    if (currentDialog.kind === "backup") {
      await runAction(
        "create",
        () =>
          createDatabaseBackup(
            environment,
            environment === "production" ? BACKUP_CONFIRMATION : undefined,
          ),
        "Backup started on the server. Progress will update in Backup history.",
      );
      return;
    }
    await runAction(
      `delete-${currentDialog.backup.id}`,
      () =>
        deleteDatabaseBackup(
          environment,
          currentDialog.backup.id,
          environment === "production" ? DELETE_CONFIRMATION : undefined,
        ),
      "Backup deleted.",
    );
  };

  const startDownload = (backup) =>
    runAction(
      `download-${backup.id}`,
      () => downloadDatabaseBackup(environment, backup),
      (result) =>
        result === "started"
          ? "Download started. The server will record completion after the file transfers."
          : "Backup downloaded.",
    );

  const startVerification = (backup) =>
    runAction(
      `verify-${backup.id}`,
      async () => {
        const response = await verifyDatabaseBackup(environment, backup.id);
        return response.data.verification;
      },
      (verification) =>
        `Backup integrity verified. SHA-256: ${verification.sha256}`,
    );

  const startDriveUpload = (backup) =>
    runAction(
      `drive-${backup.id}`,
      () => uploadDatabaseBackupToDrive(environment, backup.id),
      "Backup uploaded to Google Drive.",
    );

  const productionSelected = environment === "production";
  const productionGuidance = !overview
    ? "Production backups require a separate PRODUCTION_MONGO_URI on the backend API server and a completed, integrity-verified local backup downloaded through that same server. Restore is disabled."
    : !overview.configured
      ? "Production backup is disabled because PRODUCTION_MONGO_URI is missing from the backend API server. Configure it in the server's secret settings, then restart that backend. DB_URI and frontend VITE_API_URL are not substitutes."
      : overview.productionOperationsEnabled !== true
        ? "The production URI is configured, but production backup is still locked. Complete a local backup, verify its integrity, and download it through this same backend first."
        : "Production backup is configured and unlocked. Each live backup requires explicit confirmation. Restore is disabled; this page never changes production data.";

  return (
    <main className="w-full min-w-0">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium uppercase tracking-wide text-indigo-600">
            Super Admin
          </p>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">
            Database Backup Management
          </h1>
          <p className="m-0 text-sm text-slate-600">
            Backups are read-only snapshots. Database restore is not available
            from this module.
          </p>
        </div>
        <button
          type="button"
          onClick={loadEnvironment}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <section
        className={`mb-5 rounded-xl border p-4 ${
          productionSelected
            ? "border-red-300 bg-red-50 text-red-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
        }`}
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold">
            {productionSelected ? (
              <AlertTriangle size={20} />
            ) : (
              <ShieldCheck size={20} />
            )}
            <span>
              Selected environment:{" "}
              {productionSelected
                ? "LIVE PRODUCTION DATABASE"
                : "LOCAL DEVELOPMENT DATABASE"}
            </span>
          </div>
          {productionSelected && (
            <span className="rounded-full bg-red-700 px-3 py-1 text-xs font-bold text-white">
              LIVE DATA — BACKUP ONLY
            </span>
          )}
        </div>
        {productionSelected && (
          <p className="mb-0 mt-2 text-sm">
            {productionGuidance}
          </p>
        )}
      </section>

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Database environment">
        {ENVIRONMENTS.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => {
              setEnvironment(item.id);
              setNotice("");
              setError("");
            }}
            aria-pressed={environment === item.id}
            className={`rounded-lg border px-4 py-2 text-sm font-medium ${
              environment === item.id
                ? item.id === "production"
                  ? "border-red-700 bg-red-700 text-white"
                  : "border-indigo-700 bg-indigo-700 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}
      {overview?.connectionError && (
        <p
          role="status"
          className={`mb-5 rounded-lg border p-3 text-sm ${
            productionSelected
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {overview.connectionError}
        </p>
      )}

      {loading && !overview ? (
        <div className="flex items-center gap-2 py-10 text-slate-600">
          <LoaderCircle className="animate-spin" size={20} />
          Checking selected database…
        </div>
      ) : (
        <>
          <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Connection" value={overview?.connection?.status || "Unknown"} icon={Database} />
            <Metric label="Database" value={overview?.databaseName || "Not configured"} icon={HardDrive} />
            <Metric label="Database size" value={formatBytes(overview?.databaseSizeBytes)} icon={Archive} />
            <Metric label="Collections / documents" value={`${overview?.totalCollections ?? "—"} / ${overview?.totalDocuments ?? "—"}`} icon={Database} />
            <Metric label="Backups available" value={overview?.totalBackups ?? 0} icon={Archive} />
          </section>
          <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="m-0 text-sm text-slate-500">Last successful backup</p>
              <p className="mb-0 mt-1 font-semibold text-slate-900">
                {formatDate(overview?.lastSuccessfulBackup?.completedAt || overview?.lastSuccessfulBackup?.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {overview?.connection?.status === "disconnected" && (
                <span className="text-sm text-amber-700">Database connection unavailable</span>
              )}
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setDialog({ kind: "backup" });
                }}
                disabled={
                  busyAction === "create" ||
                  hasInProgressBackup ||
                  overview?.connection?.status !== "connected" ||
                  (productionSelected &&
                    overview?.productionOperationsEnabled !== true)
                }
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  productionSelected
                    ? "bg-red-700 hover:bg-red-800"
                    : "bg-indigo-700 hover:bg-indigo-800"
                }`}
              >
                {busyAction === "create" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Archive size={16} />
                )}
                Create Manual Backup
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <h2 className="m-0 text-lg font-semibold text-slate-900">Backup history</h2>
              <span className="text-sm text-slate-500">
                Storage: {import.meta.env.VITE_BACKUP_STORAGE_LABEL || "Backend backup storage"}
              </span>
            </div>
            {backups.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No backup records are available for this environment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Backup</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3">Status / integrity</th>
                      <th className="px-4 py-3">Google Drive</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {backups.map((backup) => (
                      <tr key={backup.id}>
                        <td className="max-w-[280px] px-4 py-3">
                          <p className="m-0 truncate font-medium text-slate-800" title={backup.filename}>
                            {backup.filename}
                          </p>
                          <p className="mb-0 mt-1 text-xs text-slate-500">
                            {backup.databaseName} · {backup.storageLocation}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {formatDate(backup.createdAt)}
                          <p className="mb-0 text-xs text-slate-400">
                            by {backup.createdBy}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {formatBytes(backup.sizeBytes)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={backup.status === "completed" ? "text-emerald-700" : backup.status === "failed" ? "text-red-700" : "text-amber-700"}>
                            {backup.status === "in_progress" && <LoaderCircle size={13} className="mr-1 inline animate-spin" />}
                            {backup.status}
                          </span>
                          {backup.status === "failed" && backup.errorMessage && (
                            <p className="mb-0 mt-1 max-w-[240px] text-xs text-red-700">
                              {backup.errorMessage}
                            </p>
                          )}
                          {backup.verification && (
                            <p className="mb-0 mt-1 flex items-center gap-1 text-xs text-emerald-700">
                              <CheckCircle2 size={13} />
                              gzip + SHA-256 verified
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {backup.googleDriveStatus === "uploaded"
                            ? `Uploaded · verified${backup.googleDriveEncrypted ? " · encrypted" : ""}`
                            : backup.googleDriveStatus === "failed"
                              ? backup.googleDriveFileId
                                ? "Upload verification failed; Drive file retained"
                                : "Upload failed"
                              : "Not uploaded"}
                          {backup.googleDriveFileId && (
                            <p
                              className="mb-0 mt-1 max-w-[190px] truncate text-xs text-slate-400"
                              title={backup.googleDriveFileId}
                            >
                              Drive ID: {backup.googleDriveFileId}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {backup.status !== "deleted" && backup.status !== "deleted_local" && (
                              <>
                                <button
                                  type="button"
                                  title="Download backup"
                                  disabled={backup.status !== "completed" || Boolean(busyAction) || (productionSelected && overview?.productionOperationsEnabled !== true)}
                                  onClick={() => startDownload(backup)}
                                  className="rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                >
                                  {busyAction === `download-${backup.id}` ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
                                </button>
                                <button
                                  type="button"
                                  title="Verify backup integrity"
                                  disabled={backup.status !== "completed" || Boolean(busyAction) || (productionSelected && overview?.productionOperationsEnabled !== true)}
                                  onClick={() => startVerification(backup)}
                                  className="rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                >
                                  {busyAction === `verify-${backup.id}` ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                </button>
                                {overview?.googleDriveConfigured && (
                              <button
                                type="button"
                                title="Upload to Google Drive"
                                disabled={backup.status !== "completed" || Boolean(backup.googleDriveFileId) || Boolean(busyAction) || (productionSelected && overview?.productionOperationsEnabled !== true)}
                                onClick={() => startDriveUpload(backup)}
                                className="rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                              >
                                {busyAction === `drive-${backup.id}` ? <LoaderCircle size={16} className="animate-spin" /> : <CloudUpload size={16} />}
                              </button>
                            )}
                                <button
                                  type="button"
                                  title="Delete backup"
                                  disabled={backup.status === "in_progress" || Boolean(busyAction) || (productionSelected && overview?.productionOperationsEnabled !== true)}
                                  onClick={() => {
                                    setError("");
                                    setDialog({ kind: "delete", backup });
                                  }}
                                  className="rounded-md border border-red-200 p-2 text-red-700 hover:bg-red-50 disabled:opacity-40"
                                >
                                  {busyAction === `delete-${backup.id}` ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-4 flex items-start gap-2 rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
            <CloudUpload size={16} className="mt-0.5 shrink-0" />
            <p className="m-0">
              Google Drive is optional and configured on the backend. Integrity
              verification checks gzip CRC and calculates SHA-256; it does not
              restore or modify either database.
            </p>
          </section>
        </>
      )}

      {dialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDialog(null);
              setConfirmation("");
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="backup-confirmation-title"
            className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="backup-confirmation-title" className="m-0 text-lg font-bold text-slate-900">
                  {dialog.kind === "backup" ? "Create database backup" : "Delete backup"}
                </h2>
                <p className="mb-0 mt-2 text-sm text-slate-600">
                  {productionSelected
                    ? "You are operating on LIVE PRODUCTION. This action does not restore or change production data."
                    : "Confirm this action for the local development database."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => {
                  setDialog(null);
                  setConfirmation("");
                }}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            {productionSelected && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-red-800">
                  Type{" "}
                  {dialog.kind === "backup"
                    ? BACKUP_CONFIRMATION
                    : DELETE_CONFIRMATION}
                </p>
                <input
                  autoFocus
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDialog(null);
                  setConfirmation("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  productionSelected ? "bg-red-700" : "bg-indigo-700"
                }`}
              >
                {dialog.kind === "backup" ? "Create backup" : "Delete backup"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

export default DatabaseBackupManagement;
