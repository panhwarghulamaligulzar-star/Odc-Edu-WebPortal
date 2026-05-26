import { LockKeyhole } from "lucide-react";

const NoAccess = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-700">
          <LockKeyhole size={28} />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-2">No Module Access Assigned</h2>
        <p className="text-slate-600 leading-7">
          Your account has logged in successfully, but no dashboard modules have been
          assigned yet. Please ask the Super Admin to enable at least one module with
          <span className="font-semibold"> view </span>
          permission for your role.
        </p>
      </div>
    </div>
  );
};

export default NoAccess;
