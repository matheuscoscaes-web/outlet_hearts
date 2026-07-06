interface BadgeProps {
  children: React.ReactNode;
  variant?: "discount" | "warning" | "sold" | "reserved" | "new";
}

const variants = {
  discount: "bg-brand-600 text-white",
  warning: "bg-amber-500 text-white",
  sold: "bg-gray-500 text-white",
  reserved: "bg-orange-500 text-white",
  new: "bg-emerald-600 text-white",
};

export function Badge({ children, variant = "discount" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${variants[variant]}`}>
      {children}
    </span>
  );
}
