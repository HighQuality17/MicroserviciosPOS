import { Boxes, Layers3, Package2 } from 'lucide-react';
import { ComponentPropsWithoutRef, ReactNode, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

export type ProductMediaKind = 'SIMPLE' | 'VARIANT' | 'COMBO' | 'DEFAULT';
export type ProductMediaSize = 'sm' | 'md' | 'lg';

interface ProductMediaProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  label: string;
  src?: string | null;
  alt?: string;
  kind?: ProductMediaKind;
  size?: ProductMediaSize;
  monogram?: string;
  icon?: ReactNode;
  loading?: 'eager' | 'lazy';
}

const defaultIcons: Record<ProductMediaKind, ReactNode> = {
  SIMPLE: <Package2 size={18} strokeWidth={1.9} />,
  VARIANT: <Layers3 size={18} strokeWidth={1.9} />,
  COMBO: <Boxes size={18} strokeWidth={1.9} />,
  DEFAULT: <Package2 size={18} strokeWidth={1.9} />,
};

export function ProductMedia({
  label,
  src,
  alt,
  kind = 'DEFAULT',
  size = 'md',
  monogram,
  icon,
  loading = 'lazy',
  className,
  ...props
}: ProductMediaProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const resolvedMonogram = useMemo(() => monogram ?? createMonogram(label), [label, monogram]);
  const shouldRenderImage = Boolean(src) && !imageFailed;

  return (
    <div
      className={clsx('product-media', className)}
      data-kind={kind === 'DEFAULT' ? undefined : kind}
      data-size={size}
      {...props}
    >
      {shouldRenderImage ? (
        <img
          src={src ?? undefined}
          alt={alt ?? label}
          loading={loading}
          className="product-media__image"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="product-media__placeholder" aria-hidden="true">
          <div className="product-media__stack">
            <span className="product-media__icon">{icon ?? defaultIcons[kind]}</span>
            <span className="product-media__monogram">{resolvedMonogram}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function createMonogram(value: string) {
  const letters = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? '')
    .join('');

  return letters || 'POS';
}
