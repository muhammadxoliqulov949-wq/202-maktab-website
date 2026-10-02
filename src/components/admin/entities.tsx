import { CollectionManager, VisiblePill, textPreview, type EntityConfig } from "@/components/admin/CollectionManager";
import { Pill } from "@/components/admin/ui";

/** Per-entity configs for the generic collection manager. */

const VIS = { name: "isVisible", label: "Ko‘rinadi", type: "boolean" as const, defaultValue: true };
const ORDER = { name: "sortOrder", label: "Tartib raqami", type: "number" as const, placeholder: "bo‘sh = oxiriga" };
const IMG = (name: string, label: string, required = false) => ({ name, label, type: "text" as const, placeholder: "/images/… yoki https://…", required });

const THUMB = (key: string) => ({
  key,
  label: "Rasm",
  render: (row: Record<string, unknown>) =>
    row[key] ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={String(row[key])} alt="" className="h-10 w-14 rounded-lg border border-line object-cover" loading="lazy" />
    ) : (
      <span className="text-muted">—</span>
    ),
});

export const TEAM_CONFIG: EntityConfig = {
  entity: "team",
  title: "Jamoa",
  subtitle: "Ustozlar va ma’muriyat — PROTOTIP ma’lumotlar, real ismlar Phase 5’da",
  createLabel: "A’zo qo‘shish",
  searchable: true,
  reorderable: true,
  hasVisibility: true,
  emptyText: "A’zolar yo‘q.",
  columns: [
    { key: "name", label: "Ism", render: (r) => <span className="font-bold">{String(r.name)}</span>, sub: (r) => String(r.role ?? "") },
    {
      key: "group",
      label: "Guruh",
      render: (r) => <Pill tone="blue">{String(r.group)}</Pill>,
    },
    { key: "category", label: "Kategoriya" },
    { key: "experience", label: "Tajriba" },
    { key: "sortOrder", label: "№", render: (r) => <span className="tabular-nums text-muted">{String(r.sortOrder)}</span> },
  ],
  fields: [
    { name: "name", label: "To‘liq ism", type: "text", required: true },
    { name: "role", label: "Lavozim", type: "text", required: true },
    { name: "subject", label: "Fan", type: "text" },
    {
      name: "group",
      label: "Guruh",
      type: "select",
      options: [
        { value: "leadership", label: "Rahbariyat" },
        { value: "teachers", label: "Ustozlar" },
        { value: "administration", label: "Ma’muriyat" },
      ],
      defaultValue: "teachers",
    },
    { name: "category", label: "Kategoriya", type: "text", defaultValue: "Aniq fanlar", required: true },
    { name: "experience", label: "Tajriba", type: "text", placeholder: "masalan: 10 yil tajriba" },
    IMG("photo", "Foto URL"),
    { name: "alt", label: "Foto alt (tavsif)", type: "text" },
    { name: "bio", label: "Bio", type: "textarea" },
    { name: "email", label: "Email", type: "text" },
    { name: "phone", label: "Telefon", type: "text" },
    VIS,
    ORDER,
  ],
};

export const GALLERY_CONFIG: EntityConfig = {
  entity: "gallery",
  title: "Galereya",
  subtitle: "Rasm va videolar — media fayllar static/Storage’da, bazada faqat URL",
  createLabel: "Element qo‘shish",
  searchable: true,
  reorderable: true,
  hasVisibility: true,
  emptyText: "Galereya bo‘sh.",
  columns: [
    THUMB("src"),
    {
      key: "alt",
      label: "Tavsif",
      render: (r) => <span className="font-semibold">{textPreview(r.alt, 40)}</span>,
      sub: (r) => `${String(r.album ?? "")} · ${String(r.category ?? "")}`,
    },
    {
      key: "type",
      label: "Turi",
      render: (r) => <Pill tone={r.type === "video" ? "amber" : "blue"}>{r.type === "video" ? "Video" : "Rasm"}</Pill>,
    },
    { key: "dims", label: "O‘lcham", render: (r) => <span className="tabular-nums text-muted">{`${r.width}×${r.height}`}</span> },
  ],
  fields: [
    {
      name: "type",
      label: "Turi",
      type: "select",
      options: [
        { value: "image", label: "Rasm" },
        { value: "video", label: "Video" },
      ],
      defaultValue: "image",
    },
    IMG("src", "Media URL", true),
    IMG("poster", "Video poster (rasm)"),
    { name: "alt", label: "Alt matn", type: "text" },
    { name: "caption", label: "Sarlavha (caption)", type: "text" },
    { name: "album", label: "Album", type: "text", defaultValue: "" },
    {
      name: "category",
      label: "Kategoriya",
      type: "select",
      options: ["Darslar", "Sport", "Kutubxona", "Tadbirlar", "Ijod", "Maktab muhiti"].map((c) => ({ value: c, label: c })),
      defaultValue: "Maktab muhiti",
    },
    { name: "externalUrl", label: "Tashqi media URL", type: "text" },
    { name: "width", label: "Kenglik (px)", type: "number", defaultValue: 1200 },
    { name: "height", label: "Balandlik (px)", type: "number", defaultValue: 800 },
    VIS,
    ORDER,
  ],
};

export const FAQS_CONFIG: EntityConfig = {
  entity: "faqs",
  title: "Savol-javoblar",
  subtitle: "FAQ — public API faqat ko‘rinadiganlarni qaytaradi",
  createLabel: "Savol qo‘shish",
  searchable: true,
  reorderable: true,
  hasVisibility: true,
  emptyText: "Savollar yo‘q.",
  columns: [
    { key: "q", label: "Savol", render: (r) => <span className="font-bold">{textPreview(r.q, 60)}</span>, sub: (r) => textPreview(r.a, 90) },
  ],
  fields: [
    { name: "q", label: "Savol", type: "textarea", required: true },
    { name: "a", label: "Javob", type: "textarea", required: true },
    VIS,
    ORDER,
  ],
};

export const FACILITIES_CONFIG: EntityConfig = {
  entity: "facilities",
  title: "Inshootlar",
  subtitle: "Bosh sahifadagi scroll-hikoya bosqichlari",
  createLabel: "Inshoot qo‘shish",
  searchable: true,
  reorderable: true,
  hasVisibility: true,
  emptyText: "Inshootlar yo‘q.",
  columns: [
    THUMB("image"),
    { key: "title", label: "Sarlavha", render: (r) => <span className="font-bold">{String(r.title)}</span>, sub: (r) => String(r.kicker ?? "") },
    { key: "description", label: "Tavsif", render: (r) => <span className="text-muted">{textPreview(r.description, 70)}</span> },
  ],
  fields: [
    { name: "title", label: "Sarlavha", type: "text", required: true },
    { name: "kicker", label: "Kicker (01 — O‘quv xonalari uslubida)", type: "text" },
    { name: "description", label: "Tavsif", type: "textarea" },
    IMG("image", "Rasm URL", true),
    { name: "alt", label: "Alt matn", type: "text" },
    { name: "videoUrl", label: "Video URL (ixtiyoriy)", type: "text" },
    VIS,
    ORDER,
  ],
};

export const FEATURES_CONFIG: EntityConfig = {
  entity: "features",
  title: "Imkoniyatlar",
  subtitle: "«Ta’lim» bo‘limi plitalari (01–06)",
  createLabel: "Imkoniyat qo‘shish",
  searchable: true,
  reorderable: true,
  hasVisibility: true,
  emptyText: "Imkoniyatlar yo‘q.",
  columns: [
    { key: "title", label: "Sarlavha", render: (r) => <span className="font-bold">{String(r.title)}</span>, sub: (r) => textPreview(r.description, 70) },
    { key: "index", label: "№", render: (r) => <Pill tone="gray">{String(r.index || "—")}</Pill> },
    { key: "icon", label: "Ikona", render: (r) => <code className="text-xs">{String(r.icon)}</code> },
  ],
  fields: [
    { name: "title", label: "Sarlavha", type: "text", required: true },
    { name: "index", label: "Indeks (01…)", type: "text" },
    { name: "description", label: "Tavsif", type: "textarea" },
    { name: "icon", label: "Ikona nomi", type: "text", defaultValue: "book" },
    IMG("image", "Rasm URL"),
    { name: "alt", label: "Alt matn", type: "text" },
    VIS,
    ORDER,
  ],
};

export const STATISTICS_CONFIG: EntityConfig = {
  entity: "statistics",
  title: "Statistika",
  subtitle: "«Maktab raqamlarda» — qiymatlar PROTOTIP, real raqamlar Phase 5’da",
  createLabel: "Ko‘rsatkich qo‘shish",
  searchable: true,
  reorderable: true,
  hasVisibility: true,
  emptyText: "Ko‘rsatkichlar yo‘q.",
  columns: [
    { key: "label", label: "Nomlanish", render: (r) => <span className="font-bold">{String(r.label)}</span>, sub: (r) => textPreview(r.description, 60) },
    {
      key: "value",
      label: "Qiymat",
      render: (r) => (
        <span className="font-display text-lg font-extrabold tabular-nums">
          {String(r.value)}
          <span className="text-[color:var(--accent-ink)]">{String(r.suffix ?? "")}</span>
        </span>
      ),
    },
    { key: "icon", label: "Ikona", render: (r) => <code className="text-xs">{String(r.icon)}</code> },
  ],
  fields: [
    { name: "label", label: "Nomlanish", type: "text", required: true },
    { name: "value", label: "Qiymat", type: "number", required: true },
    { name: "suffix", label: "Qo‘shimcha (+ yoki bo‘sh)", type: "text", defaultValue: "+" },
    { name: "description", label: "Izoh", type: "textarea" },
    { name: "icon", label: "Ikona nomi", type: "text", defaultValue: "users" },
    VIS,
    ORDER,
  ],
};

export const QUICK_LINKS_CONFIG: EntityConfig = {
  entity: "quick-links",
  title: "Tez havolalar",
  subtitle: "Bosh sahifadagi tez kirish bloklari",
  createLabel: "Havola qo‘shish",
  searchable: true,
  reorderable: true,
  hasVisibility: true,
  emptyText: "Havolalar yo‘q.",
  columns: [
    { key: "title", label: "Sarlavha", render: (r) => <span className="font-bold">{String(r.title)}</span>, sub: (r) => String(r.href ?? "") },
    { key: "description", label: "Izoh", render: (r) => <span className="text-muted">{textPreview(r.description, 70)}</span> },
    { key: "icon", label: "Ikona", render: (r) => <code className="text-xs">{String(r.icon)}</code> },
  ],
  fields: [
    { name: "title", label: "Sarlavha", type: "text", required: true },
    { name: "description", label: "Izoh", type: "textarea" },
    { name: "icon", label: "Ikona nomi", type: "text", defaultValue: "link" },
    { name: "href", label: "URL (/contact#form yoki https://…)", type: "text", required: true },
    { name: "openInNewTab", label: "Yangi oynada ochilsin", type: "boolean", defaultValue: false },
    VIS,
    ORDER,
  ],
};

export function CollectionPage({ config }: { config: EntityConfig }) {
  return <CollectionManager config={config} />;
}

export { VisiblePill };
