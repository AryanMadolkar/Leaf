type LeafLogoProps = {
  className?: string;
  size?: number;
  priority?: boolean;
};

/**
 * Brand mark — identical transparent assets for light/dark (no baked-in background).
 * Favicon uses the light mark on site cream (#FAF8F5).
 */
export default function LeafLogo({ className = "", size = 24, priority = false }: LeafLogoProps) {
  const shared = `absolute inset-0 h-full w-full object-contain transition-transform duration-300 group-hover:rotate-6 ${className}`;
  return (
    <span
      className="relative inline-block shrink-0 align-middle"
      style={{ width: size, height: size }}
      aria-label="Leaf"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/leaf-logo-light.png"
        alt=""
        width={size}
        height={size}
        decoding="async"
        {...(priority ? { fetchPriority: "high" as const } : {})}
        className={`${shared} dark:hidden`}
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/leaf-logo-dark.png"
        alt=""
        width={size}
        height={size}
        decoding="async"
        aria-hidden
        className={`${shared} hidden dark:block`}
        draggable={false}
      />
    </span>
  );
}
