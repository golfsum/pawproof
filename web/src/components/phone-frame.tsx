import { cn } from "@/lib/utils";

// CSS iPhone mockup that frames a screenshot. The image lives in
// /public/screenshots. Uses a plain <img> (not next/image) so it works
// without remotePatterns config and renders crisply at the small sizes
// we use here. The screenshot is portrait (~9:19.5).
export function PhoneFrame({
  src,
  alt,
  priority,
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("phone-frame", className)}>
      <div className="phone-notch" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        className="phone-screen"
      />
      <style>{`
        .phone-frame {
          position: relative;
          width: 100%;
          max-width: 280px;
          aspect-ratio: 9 / 19.5;
          margin: 0 auto;
          background: #0e1a20;
          border-radius: 38px;
          padding: 10px;
          box-shadow:
            0 2px 4px rgba(15, 23, 42, 0.08),
            0 18px 40px -12px rgba(15, 23, 42, 0.35),
            inset 0 0 0 2px rgba(255, 255, 255, 0.06);
        }
        .phone-notch {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          width: 34%;
          height: 22px;
          background: #0e1a20;
          border-radius: 0 0 14px 14px;
          z-index: 2;
        }
        .phone-screen {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          border-radius: 28px;
          background: #faf1dd;
        }
      `}</style>
    </div>
  );
}
