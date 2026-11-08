import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = {
  ".jpg": ["image/jpeg", "image/jpg", "image/pjpeg"],
  ".jpeg": ["image/jpeg", "image/jpg", "image/pjpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImageFileField({ label, value, onChange, folder, onUploadingChange, className = "" }) {
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const previewRef = useRef("");
  const uploadedKeyRef = useRef("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState(null);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const clearPreview = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setPicked(null);
  };

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const extension = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
      : "";
    const allowedMimes = ACCEPT[extension];
    const mime = (file.type || "").toLowerCase();
    const mimeMissing = !mime || mime === "application/octet-stream";
    if (!allowedMimes || (!mimeMissing && !allowedMimes.includes(mime))) {
      const message = "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.";
      setError(message);
      toast.error(message);
      return;
    }
    if (file.size <= 0) {
      const message = "Tệp ảnh rỗng.";
      setError(message);
      toast.error(message);
      return;
    }
    if (file.size > MAX_BYTES) {
      const message = "Ảnh phải nhỏ hơn hoặc bằng 5 MB.";
      setError(message);
      toast.error(message);
      return;
    }

    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (key === uploadedKeyRef.current && value) return;

    abortRef.current?.abort();
    const baseline = value || "";
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const preview = URL.createObjectURL(file);
    previewRef.current = preview;
    setPicked({ name: file.name, size: file.size, preview, baseline, uploadedUrl: "" });
    setError("");

    const controller = new AbortController();
    abortRef.current = controller;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await api.upload(
        `/api/admin/uploads?folder=${encodeURIComponent(folder)}`,
        form,
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      uploadedKeyRef.current = key;
      setPicked((current) => current ? { ...current, uploadedUrl: result.url } : current);
      onChange(result.url);
      toast.success("Đã tải ảnh lên.");
    } catch (uploadError) {
      if (uploadError?.name === "AbortError") return;
      clearPreview();
      uploadedKeyRef.current = "";
      const message = uploadError.message || "Không tải được ảnh lên.";
      setError(message);
      toast.error(message);
    } finally {
      if (abortRef.current === controller) setUploading(false);
    }
  };

  const cancelPicked = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    const baseline = picked?.baseline ?? "";
    const uploadedUrl = picked?.uploadedUrl;
    clearPreview();
    uploadedKeyRef.current = "";
    setError("");
    setUploading(false);
    if (uploadedUrl && value === uploadedUrl) onChange(baseline);
  };

  const removeImage = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearPreview();
    uploadedKeyRef.current = "";
    setError("");
    setUploading(false);
    onChange("");
  };

  const previewSrc = picked?.preview || value;

  return (
    <div className={className}>
      <span className="text-sm text-gray-300">{label}</span>
      <div className="mt-2 flex items-center gap-3">
        {previewSrc ? (
          <img src={previewSrc} alt="" className="h-24 w-16 rounded-lg object-cover bg-gray-800" />
        ) : (
          <div className="flex h-24 w-16 items-center justify-center rounded-lg bg-gray-800 text-[10px] text-gray-500">Chưa có ảnh</div>
        )}
        <div className="flex min-w-0 flex-col items-start gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:border-primary disabled:opacity-50"
          >
            {uploading ? "Đang tải..." : previewSrc ? "Đổi ảnh từ máy" : "Chọn ảnh từ máy"}
          </button>
          {picked && (
            <p className="max-w-full truncate text-xs text-gray-300" title={picked.name}>
              {picked.name} · {formatBytes(picked.size)}
            </p>
          )}
          {picked && (
            <button type="button" onClick={cancelPicked} className="text-xs text-gray-400 hover:text-white">
              Hủy ảnh đã chọn
            </button>
          )}
          {(value || picked) && (
            <button type="button" onClick={removeImage} className="text-xs text-red-300 hover:text-red-200">
              Gỡ ảnh
            </button>
          )}
          <p className="text-xs text-gray-500">JPG, PNG hoặc WebP. Tối đa 5 MB.</p>
          {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={pick} className="hidden" />
    </div>
  );
}
