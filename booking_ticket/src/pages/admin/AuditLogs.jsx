import { useEffect, useState } from "react";
import { Clock, Activity, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.get("/api/admin/system/audit-logs");
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Không thể tải nhật ký quản trị");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <Title text1="Nhật Ký" text2="Quản Trị & Vận Hành" />
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-gray-900 border border-gray-700 hover:border-gray-500 text-white rounded-xl text-xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Làm mới nhật ký
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="bg-gray-900/80 rounded-xl border border-primary/20 shadow-xl overflow-hidden">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-black/60 text-xs text-gray-400 uppercase border-b border-gray-800">
              <tr>
                <th className="p-4 pl-6">Hành Động</th>
                <th className="p-4">Người Thực Hiện</th>
                <th className="p-4">Đối Tượng</th>
                <th className="p-4">Chi Tiết Sự Kiện</th>
                <th className="p-4 text-center">Trạng Thái</th>
                <th className="p-4 text-right pr-6">Thời Gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 font-mono text-xs">
              {logs.length > 0 ? (
                logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition font-sans">
                    <td className="p-4 pl-6 font-semibold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary shrink-0" />
                      {log.action}
                    </td>
                    <td className="p-4 text-gray-300 font-mono text-xs">{log.performedBy}</td>
                    <td className="p-4 text-primary font-bold font-mono text-xs">{log.target}</td>
                    <td className="p-4 text-gray-300 text-xs max-w-xs truncate">{log.details}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-950/60 text-green-300 border border-green-800 font-mono">
                        <CheckCircle2 className="w-3 h-3" /> {log.status}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6 text-gray-500 font-mono text-xs">
                      {log.timestamp}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 font-sans">
                    Chưa có nhật ký hoạt động nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
