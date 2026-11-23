interface BrandLogoProps {
  className?: string;
}

export default function BrandLogo({ className }: BrandLogoProps) {
  return <img src="/favicon.png?v=2" alt="Titans Academy" className={className} />;
}
