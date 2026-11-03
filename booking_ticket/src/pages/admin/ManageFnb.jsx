import { useEffect, useState } from "react";
import { Edit2, Plus, Trash2, Utensils, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { Loading } from "../../components/Loading";
import { Title } from "../../components/admin/Title";

const emptyForm = (kind) => kind === "foods"
  ? { name: "", description: "", imageUrl: "", price: 0, category: "Bắp rang", isActive: true }
  : { name: "", description: "", imageUrl: "", price: 0, isActive: true, selectedItems: [] };

export function ManageFnb() {
  const [kind, setKind] = useState("foods");
  const [foods, setFoods] = useState([]);
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm("foods"));
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [foodData, comboData] = await Promise.all([
        api.get("/api/admin/fnb/foods"),
        api.get("/api/admin/fnb/combos"),
      ]);
      setFoods(Array.isArray(foodData) ? foodData : []);
      setCombos(Array.isArray(comboData) ? comboData : []);
    } catch (error) {
      toast.error(error.message || "Không thể tải thực đơn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(kind));
    setModalOpen(true);
  };

  const openEdit = async (item) => {
    try {
      setEditingId(kind === "foods" ? item.foodItemId : item.comboId);
      if (kind === "foods") {
        const data = await api.get(`/api/admin/fnb/foods/${item.foodItemId}`);
        setForm({ ...emptyForm(kind), ...data });
      } else {
        const data = await api.get(`/api/admin/fnb/combos/${item.comboId}`);
        setForm({
          ...emptyForm(kind),
          ...data,
          selectedItems: (data.items || []).map((line) => ({
            foodItemId: line.foodItemId,
            quantity: line.quantity,
          })),
        });
      }
      setModalOpen(true);
    } catch (error) {
      toast.error(error.message || "Không thể tải thông tin để sửa.");
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const path = `/api/admin/fnb/${kind}`;
      if (editingId) await api.put(`${path}/${editingId}`, form);
      else await api.post(path, form);
      toast.success(editingId ? "Đã cập nhật." : "Đã tạo mới.");
      setModalOpen(false);
      await load();
    } catch (error) {
      toast.error(error.message || "Không thể lưu dữ liệu.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    const id = kind === "foods" ? item.foodItemId : item.comboId;
    if (!window.confirm(`Xóa “${item.name}”?`)) return;
    try {
      await api.delete(`/api/admin/fnb/${kind}/${id}`);
      toast.success("Đã xóa.");
      await load();
    } catch (error) {
      toast.error(error.message || "Không thể xóa.");
    }
  };

  const toggle = async (item) => {
    const id = kind === "foods" ? item.foodItemId : item.comboId;
    try {
      await api.request(`/api/admin/fnb/${kind}/${id}/toggle`, { method: "PATCH" });
      await load();
    } catch (error) {
      toast.error(error.message || "Không thể đổi trạng thái.");
    }
  };

  const updateComboLine = (index, field, value) => {
    setForm((current) => ({
      ...current,
      selectedItems: current.selectedItems.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: Number(value) } : line),
    }));
  };

  if (loading) return <Loading />;
  const rows = kind === "foods" ? foods : combos;

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Title text1="Quản lý" text2="Đồ ăn & Combo" />
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white">
          <Plus className="h-4 w-4" /> Thêm mới
        </button>
      </div>

      <div className="mt-5 flex gap-2">
        {[ ["foods", "Món ăn / đồ uống"], ["combos", "Combo"] ].map(([value, label]) => (
          <button key={value} onClick={() => setKind(value)} className={`rounded-lg px-4 py-2 text-sm ${kind === value ? "bg-primary text-white" : "bg-gray-900 text-gray-300"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-primary/20 bg-gray-900/80">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="border-b border-gray-800 bg-black/50 text-xs uppercase text-gray-400">
            <tr><th className="p-4">Tên</th><th className="p-4">Danh mục / Thành phần</th><th className="p-4">Giá</th><th className="p-4">Trạng thái</th><th className="p-4 text-right">Thao tác</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rows.map((item) => {
              const id = kind === "foods" ? item.foodItemId : item.comboId;
              return <tr key={id}>
                <td className="p-4 font-semibold text-white"><span className="inline-flex items-center gap-2"><Utensils className="h-4 w-4 text-primary" />{item.name}</span></td>
                <td className="p-4">{kind === "foods" ? item.category : (item.items || []).map((line) => `${line.foodItemName} × ${line.quantity}`).join(", ")}</td>
                <td className="p-4">{Number(item.price).toLocaleString("vi-VN")} ₫</td>
                <td className="p-4">{item.isActive ? "Đang bán" : "Ngừng bán"}</td>
                <td className="space-x-2 p-4 text-right">
                  <button title={item.isActive ? "Ngừng bán" : "Mở bán"} onClick={() => toggle(item)} className="rounded px-2 py-1 text-xs text-gray-300 hover:bg-white/10">{item.isActive ? "Ngừng bán" : "Mở bán"}</button>
                  <button title="Sửa" onClick={() => openEdit(item)} className="rounded p-1.5 text-gray-300 hover:bg-white/10"><Edit2 className="h-4 w-4" /></button>
                  <button title="Xóa" onClick={() => remove(item)} className="rounded p-1.5 text-gray-300 hover:bg-red-950/50 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>;
            })}
            {rows.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">Chưa có dữ liệu.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <form onSubmit={save} className="max-h-[90vh] w-full max-w-xl space-y-3 overflow-y-auto rounded-2xl border border-gray-700 bg-[#111927] p-6">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-white">{editingId ? "Cập nhật" : "Tạo mới"} {kind === "foods" ? "món" : "combo"}</h2><button type="button" onClick={() => setModalOpen(false)}><X className="h-5 w-5 text-gray-400" /></button></div>
          <label className="block text-sm text-gray-300">Tên<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 p-2 text-white" /></label>
          <label className="block text-sm text-gray-300">Mô tả<textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 p-2 text-white" /></label>
          <label className="block text-sm text-gray-300">Link ảnh<input value={form.imageUrl || ""} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 p-2 text-white" /></label>
          <label className="block text-sm text-gray-300">Giá<input required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 p-2 text-white" /></label>
          {kind === "foods" ? <label className="block text-sm text-gray-300">Danh mục<input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/50 p-2 text-white" /></label> : <div className="space-y-2"><div className="text-sm text-gray-300">Thành phần combo</div>{form.selectedItems.map((line, index) => <div key={index} className="flex gap-2"><select required value={line.foodItemId} onChange={(e) => updateComboLine(index, "foodItemId", e.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-black/50 p-2 text-white"><option value="">Chọn món</option>{foods.filter((food) => food.isActive).map((food) => <option key={food.foodItemId} value={food.foodItemId}>{food.name}</option>)}</select><input aria-label="Số lượng" type="number" min="1" value={line.quantity} onChange={(e) => updateComboLine(index, "quantity", e.target.value)} className="w-20 rounded-lg border border-gray-700 bg-black/50 p-2 text-white" /><button type="button" onClick={() => setForm({ ...form, selectedItems: form.selectedItems.filter((_, i) => i !== index) })} className="px-2 text-red-400">×</button></div>)}<button type="button" onClick={() => setForm({ ...form, selectedItems: [...form.selectedItems, { foodItemId: "", quantity: 1 }] })} className="text-sm text-primary">+ Thêm món</button></div>}
          <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Đang kinh doanh</label>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2 text-sm text-gray-300">Hủy</button><button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu"}</button></div>
        </form>
      </div>}
    </div>
  );
}
