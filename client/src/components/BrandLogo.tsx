interface BrandLogoProps {
  className?: string;
}

export default function BrandLogo({ className }: BrandLogoProps) {
  return <img src="/favicon.png" alt="Titans Academy" className={className} />;
}
