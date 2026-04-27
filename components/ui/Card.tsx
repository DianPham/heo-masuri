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
        "rounded-3xl",
        paddingStyles[padding],
        className,
      ].join(" ")}
      style={{
        background: "linear-gradient(145deg, #FFE4EA 0%, #FFF5F7 100%)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {children}
    </div>
  );
}
