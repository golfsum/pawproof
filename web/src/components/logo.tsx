import { cn } from "@/lib/utils";

// PawProof brand mark. Source art lives at /public/logo.svg.
export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.svg"
      alt="PawProof"
      className={cn("h-9 w-9 rounded-xl object-contain", className)}
    />
  );
}
