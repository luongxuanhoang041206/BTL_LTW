import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { defaultWebsiteContent } from "../../context/WebsiteContentContext";
import { HeroSection } from "../../components/HeroSection";
import { FeatureSection } from "../../components/FeatureSection";
import { TrailersSection } from "../../components/TrailersSection";
import { NavBar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { ImageFileField } from "../../components/admin/ImageFileField";

const clone = (value) => JSON.parse(JSON.stringify(value));
const internalLink = (value) => value.startsWith("/") && !value.startsWith("//") || /^https:\/\//i.test(value);

export function WebsiteCms() {
  const [content, setContent] = useState(() => clone(defaultWebsiteContent));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  useEffect(() => {
    api.get("/api/admin/website-content").then((result) => {
      try {
        const loaded = JSON.parse(result.draft || "{}");
        setContent({ ...clone(defaultWebsiteContent), ...loaded,
          banner: { ...defaultWebsiteContent.banner, ...loaded.banner },
          header: { ...defaultWebsiteContent.header, ...loaded.header },
          footer: { ...defaultWebsiteContent.footer, ...loaded.footer },
          sections: loaded.sections?.length ? loaded.sections : clone(defaultWebsiteContent.sections),
          announcements: loaded.announcements || [] });
      } catch { setContent(clone(defaultWebsiteContent)); }
    }).catch((error) => showMessage(error.message, "error"));
  }, []);

  function showMessage(text, type = "info") { setMessage(text); setMessageType(type); }
  const update = (change) => setContent((old) => { const next = clone(old); change(next); return next; });
  const validationError = () => {
    const b = content.banner || {};
    if (b.active && (!b.title.trim() || !b.description.trim() || !b.ctaText.trim())) return "Banner đang bật cần có tiêu đề, mô tả và nhãn nút.";
    if (b.image && !/^https:\/\//i.test(b.image) && !/^\/uploads\//i.test(b.image)) return "Ảnh banner phải được tải từ máy hoặc là đường dẫn HTTPS.";
    if (b.ctaLink && !internalLink(b.ctaLink)) return "Liên kết banner chỉ được dùng đường dẫn nội bộ hoặc HTTPS.";
    if ((content.header?.links || []).some((link) => !link.text.trim() || !internalLink(link.href))) return "Mỗi liên kết đầu trang cần có nhãn và đường dẫn nội bộ hoặc HTTPS.";
    if ((content.announcements || []).some((a) => a.active && !a.text.trim())) return "Thông báo đang bật cần có nội dung.";
    return "";
  };
  async function save(publish = false) {
    const error = validationError();
    if (error) return showMessage(error, "error");
    setBusy(true); showMessage("");
    try {
      await api.put("/api/admin/website-content/draft", content);
      if (publish) await api.post("/api/admin/website-content/publish", {});
      showMessage(publish ? "Đã xuất bản nội dung." : "Đã lưu bản nháp.", "success");
    } catch (error) { showMessage(error.message || "Không thể lưu nội dung.", "error"); }
    finally { setBusy(false); }
  }

  const preview = useMemo(() => <div className="cms-preview-scale">
    <NavBar cmsContent={content} />
    {content.announcements.filter((a) => a.active && a.text.trim()).map((a, i) => <div key={i} role="status" className={`px-6 py-3 text-center text-sm ${a.type === "emergency" ? "bg-red-900 text-white" : "bg-primary/20 text-white"}`}>{a.text}</div>)}
    <HeroSection cmsContent={content} />{[...content.sections].sort((a,b)=>(a.order||0)-(b.order||0)).map(section => section.key === "nowShowing" ? <FeatureSection key={section.key} cmsContent={content} /> : section.key === "trailers" ? <TrailersSection key={section.key} cmsContent={content} /> : null)}<Footer cmsContent={content} />
  </div>, [content]);

  const inputClass = "mt-1 w-full rounded bg-black/40 border border-gray-700 px-3 py-2 text-sm text-white";
  const field = (label, value, onChange, props = {}) => <label className="block text-xs text-gray-400">{label}<input className={inputClass} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...props} /></label>;

  return <div className="text-white">
    <div className="flex flex-wrap justify-between gap-4"><div><h1 className="text-2xl font-bold">Quản lý website</h1><p className="mt-1 text-sm text-gray-400">Bản nháp được xem trước tại đây. Khách truy cập chỉ nhận nội dung đã xuất bản.</p></div><div className="flex gap-2"><button disabled={busy} onClick={() => save(false)} className="rounded-lg border border-gray-600 px-4 py-2 disabled:opacity-50">Lưu nháp</button><button disabled={busy} onClick={() => save(true)} className="rounded-lg bg-primary px-4 py-2 disabled:opacity-50">Xuất bản</button></div></div>
    {message && <p role="status" className={`mt-3 text-sm ${messageType === "error" ? "text-red-300" : "text-primary"}`}>{message}</p>}
    <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-5">
        <section className="space-y-3 rounded-xl border border-gray-700 bg-gray-900 p-4"><h2 className="font-semibold">Banner trang chủ</h2>
          {field("Tiêu đề",content.banner.title,v=>update(x=>x.banner.title=v),{maxLength:120,required:true})}
          {field("Mô tả",content.banner.description,v=>update(x=>x.banner.description=v),{maxLength:500})}
          <ImageFileField label="Ảnh banner" value={content.banner.image} onChange={(url) => update((x) => { x.banner.image = url; })} folder="banners" />
          {field("Nhãn nút",content.banner.ctaText,v=>update(x=>x.banner.ctaText=v),{maxLength:50})}
          {field("Liên kết nút",content.banner.ctaLink,v=>update(x=>x.banner.ctaLink=v),{maxLength:300})}
          {field("Thứ tự hiển thị",content.banner.order,v=>update(x=>x.banner.order=Number(v)),{type:"number",min:1})}
          <label className="text-sm"><input type="checkbox" checked={content.banner.active} onChange={e=>update(x=>x.banner.active=e.target.checked)}/> <span className="ml-2">Hiển thị banner</span></label>
        </section>
        <section className="space-y-3 rounded-xl border border-gray-700 bg-gray-900 p-4"><h2 className="font-semibold">Khu vực trang chủ</h2>{content.sections.map((section,index)=><div key={section.key} className="space-y-2 border-t border-gray-700 pt-3">
          {field(`Tiêu đề · ${section.key}`,section.title,v=>update(x=>x.sections[index].title=v),{maxLength:120})}
          {field("Mô tả",section.description,v=>update(x=>x.sections[index].description=v),{maxLength:300})}
          {field("Thứ tự",section.order,v=>update(x=>x.sections[index].order=Number(v)),{type:"number",min:1})}
          <label className="text-sm"><input type="checkbox" checked={section.visible} onChange={e=>update(x=>x.sections[index].visible=e.target.checked)}/> <span className="ml-2">Hiển thị</span></label>
        </div>)}</section>
        <section className="space-y-3 rounded-xl border border-gray-700 bg-gray-900 p-4"><h2 className="font-semibold">Đầu trang & chân trang</h2>
          {(content.header.links||[]).map((link,i)=><div key={i} className="grid grid-cols-2 gap-2">{field("Tên liên kết",link.text,v=>update(x=>x.header.links[i].text=v),{maxLength:60})}{field("Đường dẫn",link.href,v=>update(x=>x.header.links[i].href=v),{maxLength:300})}<button className="text-left text-xs text-red-300" onClick={()=>update(x=>x.header.links.splice(i,1))}>Xóa liên kết</button></div>)}
          <button className="text-sm text-primary" onClick={()=>update(x=>x.header.links.push({text:"Liên kết mới",href:"/home"}))}>+ Thêm liên kết đầu trang</button>
          {field("Lời nhắn chân trang",content.footer.feedback,v=>update(x=>x.footer.feedback=v),{maxLength:200})}
          {field("Bản quyền",content.footer.copyright,v=>update(x=>x.footer.copyright=v),{maxLength:200})}
          <h3 className="pt-2 text-sm font-medium">Liên kết chân trang</h3>
          {(content.footer.links||[]).map((link,i)=><div key={i} className="grid grid-cols-2 gap-2">{field("Nhãn",link.text,v=>update(x=>x.footer.links[i].text=v),{maxLength:80})}{field("URL",link.href,v=>update(x=>x.footer.links[i].href=v),{maxLength:300})}<button className="text-left text-xs text-red-300" onClick={()=>update(x=>x.footer.links.splice(i,1))}>Xóa liên kết</button></div>)}
          <button className="text-sm text-primary" onClick={()=>update(x=>x.footer.links.push({text:"Liên kết mới",href:"/home"}))}>+ Thêm liên kết chân trang</button>
        </section>
        <section className="space-y-3 rounded-xl border border-gray-700 bg-gray-900 p-4"><h2 className="font-semibold">Thông báo</h2>
          {content.announcements.map((a,i)=><div key={i} className="space-y-2 border-t border-gray-700 pt-3">{field("Nội dung",a.text,v=>update(x=>x.announcements[i].text=v),{maxLength:300})}
            <select className="rounded bg-black/40 border border-gray-700 px-2 py-1" value={a.type} onChange={e=>update(x=>x.announcements[i].type=e.target.value)}><option value="normal">Thông thường</option><option value="emergency">Khẩn cấp / bảo trì</option></select>
            <label className="ml-3 text-xs"><input type="checkbox" checked={a.active} onChange={e=>update(x=>x.announcements[i].active=e.target.checked)}/> Bật</label><button className="ml-3 text-xs text-red-300" onClick={()=>update(x=>x.announcements.splice(i,1))}>Xóa</button>
          </div>)}<button className="text-sm text-primary" onClick={()=>update(x=>x.announcements.push({text:"",type:"normal",active:false}))}>+ Thêm thông báo</button>
        </section>
      </div>
      <section className="min-h-[700px] overflow-auto rounded-xl border border-gray-700 bg-[#09090b]"><div className="sticky top-0 z-10 bg-gray-900 px-4 py-2 text-sm">Xem trước website</div>{preview}</section>
    </div>
  </div>;
}
