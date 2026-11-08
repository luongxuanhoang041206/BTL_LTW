import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bold, Italic, Underline, List, ListOrdered, ImagePlus } from "lucide-react";
import toast from "react-hot-toast";

const FONT_FAMILIES = ["Arial", "Georgia", "Times New Roman", "Verdana", "Tahoma"];
const FONT_SIZES = [12, 14, 16, 18, 24, 32];

function normalizeColor(value) {
  if (!value) return null;
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const rgb = value.match(/\d+/g);
  if (!rgb || rgb.length < 3) return null;
  return `#${rgb.slice(0, 3).map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
}

function domToDocument(root) {
  const blocks = [];
  const images = [];

  const collectRuns = (node, inherited, runs) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) runs.push({ ...inherited, text: node.textContent });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node;
    if (element.tagName === "IMG") {
      images.push({ src: element.getAttribute("src"), alt: element.getAttribute("alt") || "" });
      return;
    }

    const next = { ...inherited };
    const tag = element.tagName.toLowerCase();
    if (["b", "strong"].includes(tag)) next.bold = true;
    if (["i", "em"].includes(tag)) next.italic = true;
    if (tag === "u") next.underline = true;
    const fontFamily = element.style.fontFamily || element.getAttribute("face");
    if (fontFamily) next.fontFamily = fontFamily.replaceAll(/["']/g, "").split(",")[0].trim();
    const size = Number.parseInt(element.style.fontSize, 10);
    if (size) next.fontSize = size;
    else if (element.tagName === "FONT" && element.getAttribute("size")) {
      const legacySize = Number(element.getAttribute("size"));
      next.fontSize = [12, 12, 14, 16, 18, 24, 32, 32][legacySize] || 16;
    }
    const color = element.style.color || element.getAttribute("color");
    if (color) next.color = normalizeColor(color);

    for (const child of element.childNodes) collectRuns(child, next, runs);
  };

  const addParagraph = (element) => {
    let runs = [];
    for (const child of element.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE && child.tagName === "IMG") {
        if (runs.length) blocks.push({ type: "paragraph", runs });
        runs = [];
        images.push({ src: child.getAttribute("src"), alt: child.getAttribute("alt") || "" });
      } else {
        collectRuns(child, {}, runs);
      }
    }
    if (runs.length || blocks.length === 0) blocks.push({ type: "paragraph", runs });
  };

  for (const child of root.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      if (child.textContent.trim()) blocks.push({ type: "paragraph", runs: [{ text: child.textContent }] });
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const element = child;
    if (["UL", "OL"].includes(element.tagName)) {
      const items = [...element.querySelectorAll(":scope > li")].map((item) => {
        const runs = [];
        for (const itemChild of item.childNodes) collectRuns(itemChild, {}, runs);
        return runs;
      });
      blocks.push({ type: "list", ordered: element.tagName === "OL", items });
    } else if (element.tagName === "IMG") {
      images.push({ src: element.getAttribute("src"), alt: element.getAttribute("alt") || "" });
    } else {
      addParagraph(element);
    }
  }

  return { format: "review-v1", blocks, images };
}

export function ReviewEditor({ rating, onRatingChange, onSubmit, submitting }) {
  const { t } = useTranslation();
  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const selectionRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [images, setImages] = useState([]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount) selectionRef.current = selection.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !selectionRef.current) return;
    editorRef.current?.focus();
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  };

  const command = (name, value) => {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
  };

  const submit = (event) => {
    event.preventDefault();
    const documentContent = domToDocument(editorRef.current);
    documentContent.images = images;
    onSubmit(JSON.stringify(documentContent));
  };

  const uploadImage = async (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    if (!files.length) return;
    const remaining = 5 - images.length;
    if (files.length > remaining) {
      toast.error(t("review.errMaxImages", { remaining }));
      return;
    }

    setUploadingImage(true);
    try {
      const uploaded = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) throw new Error(t("review.errMaxSize"));
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/movies/reviews/images", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.message || t("review.errUpload"));
        uploaded.push({ src: result.url, alt: file.name });
      }
      setImages((current) => [...current, ...uploaded]);
    } catch (error) {
      toast.error(error.message || t("review.errUpload"));
    } finally {
      setUploadingImage(false);
    }
  };

  const toolButton = (label, Icon, action) => (
    <button
      key={label}
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={action}
      className="rounded-md border border-white/10 p-2 text-gray-300 hover:border-primary/50 hover:text-white"
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-gray-900/70 p-5 mb-6">
      <p className="text-sm font-medium text-gray-200 mb-3">{t("review.hint")}</p>
      <div className="flex flex-wrap items-center gap-0.5 mb-4" role="radiogroup" aria-label={t("review.ratingGroupLabel")}>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={t("review.ratingAria", { rating: value })}
            onClick={() => onRatingChange(value)}
            className="p-1 cursor-pointer"
          >
            <span className={`text-xl leading-none ${value <= rating ? "text-yellow-400" : "text-gray-600"}`}>★</span>
          </button>
        ))}
        <span className="self-center ml-2 text-xs text-gray-400">{rating}/10</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-t-xl border border-white/10 bg-black/40 p-2">
        {toolButton(t("review.bold"), Bold, () => command("bold"))}
        {toolButton(t("review.italic"), Italic, () => command("italic"))}
        {toolButton(t("review.underline"), Underline, () => command("underline"))}
        {toolButton(t("review.ulist"), List, () => command("insertUnorderedList"))}
        {toolButton(t("review.olist"), ListOrdered, () => command("insertOrderedList"))}
        <select
          aria-label={t("review.fontFamily")}
          defaultValue="Arial"
          onMouseDown={saveSelection}
          onChange={(event) => { restoreSelection(); command("fontName", event.target.value); }}
          className="h-9 rounded-md border border-white/10 bg-gray-900 px-2 text-xs text-gray-200"
        >
          {FONT_FAMILIES.map((font) => <option key={font} value={font}>{font}</option>)}
        </select>
        <select
          aria-label={t("review.fontSize")}
          defaultValue="16"
          onMouseDown={saveSelection}
          onChange={(event) => {
            restoreSelection();
            const editorSize = Number(event.target.value) <= 12 ? 1
              : Number(event.target.value) <= 14 ? 2
                : Number(event.target.value) <= 16 ? 3
                  : Number(event.target.value) <= 18 ? 4
                    : Number(event.target.value) <= 24 ? 5 : 6;
            command("fontSize", String(editorSize));
          }}
          className="h-9 rounded-md border border-white/10 bg-gray-900 px-2 text-xs text-gray-200"
        >
          {FONT_SIZES.map((size) => <option key={size} value={size}>{size}px</option>)}
        </select>
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-white/10 px-2 text-xs text-gray-300" title={t("review.colorLabel")}>
          {t("review.color")}
          <input
            type="color"
            aria-label={t("review.colorLabel")}
            defaultValue="#ffffff"
            onMouseDown={saveSelection}
            onChange={(event) => { restoreSelection(); command("foreColor", event.target.value); }}
            className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={saveSelection}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        role="textbox"
        aria-label={t("review.editorAria")}
        aria-multiline="true"
        data-placeholder={t("review.editorPlaceholder")}
        className="min-h-36 rounded-b-xl border border-t-0 border-white/10 bg-black/30 p-3 text-sm text-white focus:outline-none focus:border-primary empty:before:content-[attr(data-placeholder)] empty:before:text-gray-500"
      />
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-200">{t("review.attachments")}</p>
            <p className="mt-1 text-xs text-gray-500">{t("review.attachmentsDesc")}</p>
          </div>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingImage || images.length >= 5}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 hover:border-primary/50 disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" /> {uploadingImage ? t("review.uploading") : t("review.addImage", { count: images.length })}
          </button>
          <input ref={imageInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={uploadImage} className="hidden" />
        </div>
        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {images.map((image, index) => (
              <div key={image.src} className="relative h-20 w-20 overflow-hidden rounded-lg border border-white/10">
                <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label={t("review.removeImage")}
                  onClick={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}
                  className="absolute right-1 top-1 rounded-full bg-black/80 px-1.5 text-xs text-white"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-500">{t("review.maxSize")}</span>
        <button
          type="submit"
          disabled={submitting || uploadingImage || rating < 1}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? t("review.submitting") : t("review.submitReview")}
        </button>
      </div>
    </form>
  );
}

export function ReviewContent({ comment }) {
  const { t } = useTranslation();
  if (!comment) return null;

  let documentContent;
  try {
    documentContent = JSON.parse(comment);
  } catch {
    return <p className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">{comment}</p>;
  }

  if (documentContent?.format !== "review-v1" || !Array.isArray(documentContent.blocks)) {
    return <p className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">{comment}</p>;
  }

  const renderRuns = (runs) => runs.map((run, runIndex) => (
    <span
      key={runIndex}
      style={{
        fontWeight: run.bold ? 700 : undefined,
        fontStyle: run.italic ? "italic" : undefined,
        textDecoration: run.underline ? "underline" : undefined,
        fontFamily: ["Arial", "Georgia", "Times New Roman", "Verdana", "Tahoma"].includes(run.fontFamily) ? run.fontFamily : undefined,
        fontSize: Number.isFinite(run.fontSize) ? `${Math.max(12, Math.min(32, run.fontSize))}px` : undefined,
        color: /^#[0-9a-f]{6}$/i.test(run.color || "") ? run.color : undefined,
      }}
    >
      {run.text}
    </span>
  ));

  const attachedImages = [
    ...(Array.isArray(documentContent.images) ? documentContent.images : []),
    ...documentContent.blocks.filter((block) => block.type === "image"),
  ].filter((image) => /^\/uploads\/reviews\/[a-f0-9]{32}\.(jpg|jpeg|png|webp)$/i.test(image.src || ""));

  return (
    <div className="text-sm leading-relaxed text-gray-300">
      <div className="space-y-2">
        {documentContent.blocks.map((block, blockIndex) => {
          if (block.type === "image") return null;
        if (block.type === "list" && Array.isArray(block.items)) {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag key={blockIndex} className={`pl-6 ${block.ordered ? "list-decimal" : "list-disc"}`}>
              {block.items.map((item, itemIndex) => <li key={itemIndex}>{renderRuns(item)}</li>)}
            </Tag>
          );
        }
        if (block.type !== "paragraph" || !Array.isArray(block.runs)) return null;
        return (
          <p key={blockIndex} className="whitespace-pre-wrap">
            {renderRuns(block.runs)}
          </p>
        );
        })}
      </div>
      {attachedImages.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex flex-wrap gap-3">
            {attachedImages.map((image, imageIndex) => (
              <img
                key={`${image.src}-${imageIndex}`}
                src={image.src}
                alt={image.alt || t("review.imageAlt")}
                loading="lazy"
                className="max-h-[28rem] max-w-full rounded-xl object-contain"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
