import { SurfaceCard, type SurfaceCardProps } from '@/components/SurfaceCard';

export type CardProps = SurfaceCardProps;

export function Card(props: CardProps) {
  return <SurfaceCard padding="md" {...props} />;
}

