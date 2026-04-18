import { ComponentProps, ReactNode, forwardRef } from 'react';
import clsx from 'clsx';
import { Button } from '@/components/Button';

interface IconButtonProps extends Omit<ComponentProps<typeof Button>, 'children'> {
  icon: ReactNode;
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, className, size = 'md', title, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      size={size}
      className={clsx('icon-button', className)}
      aria-label={label}
      title={title ?? label}
      {...props}
    >
      <span aria-hidden="true">{icon}</span>
    </Button>
  );
});
