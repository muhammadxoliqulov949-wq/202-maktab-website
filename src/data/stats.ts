/**
 * School statistics — PROTOTYPE values.
 * In Phase 3 these will be served from the database/API; components never hard-code them.
 */
export type Stat = {
  id: string;
  value: number;
  suffix: string;
  label: string;
  description: string;
  icon: string;
};

export const STATS: Stat[] = [
  {
    id: "students",
    value: 1300,
    suffix: "+",
    label: "O‘quvchi",
    description: "1–11-sinflarda tahsil olayotgan bolalar",
    icon: "users",
  },
  {
    id: "capacity",
    value: 1050,
    suffix: "",
    label: "Loyiha quvvati",
    description: "Binoning bir smenada o‘zlashtira oladigan o‘rin soni",
    icon: "building",
  },
  {
    id: "staff",
    value: 92,
    suffix: "+",
    label: "Jamoa a’zolari",
    description: "Ustozlar, murabbiylar va ma’muriyat",
    icon: "teacher",
  },
  {
    id: "inclusive",
    value: 11,
    suffix: "+",
    label: "Inklyuziv ta’limdagi o‘quvchilar",
    description: "Maxsus ehtiyojli bolalar uchun qo‘llab-quvvatlash tizimi",
    icon: "heart",
  },
];
