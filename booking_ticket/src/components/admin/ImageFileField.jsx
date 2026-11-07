import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";

export function ImageFileField({ label, value, onChange, folder, className = "" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh phải nhỏ hơn 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await api.upload(`/api/admin/uploads?folder=${encodeURIComponent(folder)}`, form);
      onChange(result.url);
      toast.success("Đã tải ảnh lên.");
    } catch (error) {
      toast.error(error.message || "Không tải được ảnh lên.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <span className="text-sm text-gray-300">{label}</span>
      <div className="mt-2 flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="h-24 w-16 rounded-lg object-cover bg-gray-800" />
        ) : (
          <div className="flex h-24 w-16 items-center justify-center rounded-lg bg-gray-800 text-[10px] text-gray-500">Chưa có ảnh</div>
        )}
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:border-primary disabled:opacity-50"
          >
            {uploading ? "Đang tải..." : value ? "Đổi ảnh từ máy" : "Chọn ảnh từ máy"}
          </button>
          {value && (
            <button type="button" onClick={() => onChange("")} className="text-xs text-red-300 hover:text-red-200">
              Gỡ ảnh
            </button>
          )}
          <p className="text-xs text-gray-500">JPG, PNG hoặc WebP. Tối đa 5 MB.</p>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="hidden" />
    </div>
  );
}
