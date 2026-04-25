interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingStyles = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div
      className={[
        "bg-rose-100 rounded-3xl",
        paddingStyles[padding],
        className,
      ].join(" ")}
      style={{ boxShadow: "var(--shadow)" }}
    >
      {children}
    </div>
  );
}
