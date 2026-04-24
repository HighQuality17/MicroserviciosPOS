import clsx from 'clsx';
import { ImagePlus, RotateCcw, Trash2 } from 'lucide-react';
import { type ChangeEvent, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { ProductMedia, type ProductMediaKind } from '@/components/ProductMedia';
import type { ProductType } from '@/types/api';

const acceptedProductImageTypes = '.webp,.png,.jpg,.jpeg,image/webp,image/png,image/jpeg';

interface ProductImageFieldProps {
  label?: string;
  productName?: string;
  productType?: ProductType;
  mediaKind?: ProductMediaKind;
  imageUrl?: string | null;
  imageAlt?: string | null;
  pendingImageFile?: File | null;
  markedForRemoval?: boolean;
  disabled?: boolean;
  error?: string | null;
  onSelectImage: (file: File | null) => void;
  onRemoveImage: () => void;
  onRestoreImage?: () => void;
}

export function ProductImageField({
  label = 'Imagen del producto',
  productName,
  productType = 'SIMPLE',
  mediaKind,
  imageUrl,
  imageAlt,
  pendingImageFile,
  markedForRemoval = false,
  disabled = false,
  error,
  onSelectImage,
  onRemoveImage,
  onRestoreImage,
}: ProductImageFieldProps) {
  const inputId = useId();
  const headingId = useId();
  const helpId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingPreviewUrl = useObjectUrl(pendingImageFile);
  const hasExistingImage = Boolean(imageUrl);
  const hasPendingImage = Boolean(pendingImageFile);
  const previewState = resolvePreviewState({
    hasExistingImage,
    hasPendingImage,
    markedForRemoval,
  });
  const resolvedMediaKind =
    mediaKind ?? (productType === 'VARIANT' ? 'VARIANT' : 'SIMPLE');
  const previewSrc = hasPendingImage ? pendingPreviewUrl : imageUrl ?? null;
  const resolvedLabel = productName?.trim() || 'Producto';
  const resolvedAlt = imageAlt?.trim() || `Imagen de ${resolvedLabel}`;
  const canRestore = Boolean(hasExistingImage && markedForRemoval && onRestoreImage);
  const removeLabel = hasPendingImage ? 'Descartar preview' : 'Quitar imagen';
  const selectLabel =
    previewState === 'empty'
      ? 'Subir imagen'
      : previewState === 'marked'
        ? 'Seleccionar reemplazo'
        : 'Reemplazar imagen';

  function handleSelectButtonClick() {
    if (disabled) {
      return;
    }

    inputRef.current?.click();
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    onSelectImage(file);
    event.currentTarget.value = '';
  }

  return (
    <section
      className={clsx(
        'product-image-field products-form-group products-form-group--strong surface-subtle-strong',
        error && 'product-image-field--error',
        disabled && 'product-image-field--disabled',
      )}
      aria-labelledby={headingId}
      aria-describedby={clsx(helpId, error ? errorId : undefined)}
    >
      <div className="product-image-field__header">
        <div className="min-w-0">
          <p
            id={headingId}
            className="products-form-group__label text-[11px] font-semibold uppercase tracking-[0.22em] theme-text-secondary"
          >
            {label}
          </p>
          <p className="products-form-group__description mt-2 text-sm theme-text-muted">
            Preview principal persistida para catalogo y POS. Puedes subir, reemplazar o quitar imagen segun estado actual.
          </p>
        </div>
        <span className="product-image-field__status" data-state={previewState}>
          {resolvePreviewStatus(previewState)}
        </span>
      </div>

      <div className="product-image-field__body">
        <div className="product-image-field__preview-shell" data-state={previewState}>
          <ProductMedia
            label={resolvedLabel}
            src={previewSrc}
            alt={resolvedAlt}
            kind={resolvedMediaKind}
            className="product-image-field__preview"
          />
          <span className="product-image-field__preview-note" data-state={previewState}>
            {resolvePreviewNote(previewState)}
          </span>
          {previewState === 'marked' ? (
            <div className="product-image-field__preview-overlay" aria-hidden="true">
              <span>Marcada para quitar</span>
            </div>
          ) : null}
        </div>

        <div className="product-image-field__content">
          <div className="product-image-field__actions">
            <Button
              type="button"
              variant="secondary"
              className="product-image-field__action product-image-field__action--primary"
              onClick={handleSelectButtonClick}
              disabled={disabled}
              aria-controls={inputId}
            >
              <ImagePlus size={16} aria-hidden="true" />
              {selectLabel}
            </Button>

            {(hasExistingImage || hasPendingImage) && !markedForRemoval ? (
              <Button
                type="button"
                variant="ghost"
                className="product-image-field__action"
                onClick={onRemoveImage}
                disabled={disabled}
              >
                <Trash2 size={16} aria-hidden="true" />
                {removeLabel}
              </Button>
            ) : null}

            {canRestore ? (
              <Button
                type="button"
                variant="ghost"
                className="product-image-field__action"
                onClick={onRestoreImage}
                disabled={disabled}
              >
                <RotateCcw size={16} aria-hidden="true" />
                Conservar actual
              </Button>
            ) : null}
          </div>

          <input
            ref={inputRef}
            id={inputId}
            type="file"
            className="sr-only"
            accept={acceptedProductImageTypes}
            onChange={handleInputChange}
            disabled={disabled}
            aria-describedby={clsx(helpId, error ? errorId : undefined)}
          />

          <div id={helpId} className="product-image-field__tokens" aria-label="Recomendaciones de imagen">
            <span className="product-image-field__token">WebP, PNG, JPG/JPEG</span>
            <span className="product-image-field__token">Max 3 MB</span>
            <span className="product-image-field__token">Cuadrada 1:1</span>
          </div>

          <p className="product-image-field__caption">
            {resolveCaption(previewState)}
          </p>

          {pendingImageFile ? (
            <p className="product-image-field__file theme-text-secondary">
              {pendingImageFile.name} · {formatFileSize(pendingImageFile.size)}
            </p>
          ) : hasExistingImage ? (
            <p className="product-image-field__file theme-text-secondary">
              Imagen actual lista para preview y reemplazo.
            </p>
          ) : (
            <p className="product-image-field__file theme-text-secondary">
              Aun no hay archivo seleccionado.
            </p>
          )}

          {error ? (
            <p id={errorId} role="alert" className="product-image-field__error-message">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function resolvePreviewState({
  hasExistingImage,
  hasPendingImage,
  markedForRemoval,
}: {
  hasExistingImage: boolean;
  hasPendingImage: boolean;
  markedForRemoval: boolean;
}) {
  if (hasPendingImage) return 'pending';
  if (markedForRemoval && hasExistingImage) return 'marked';
  if (hasExistingImage) return 'current';
  return 'empty';
}

function resolvePreviewStatus(state: 'empty' | 'current' | 'pending' | 'marked') {
  switch (state) {
    case 'current':
      return 'Imagen actual';
    case 'pending':
      return 'Preview local';
    case 'marked':
      return 'Marcada para quitar';
    default:
      return 'Sin imagen';
  }
}

function resolvePreviewNote(state: 'empty' | 'current' | 'pending' | 'marked') {
  switch (state) {
    case 'current':
      return 'Actual';
    case 'pending':
      return 'Preview local';
    case 'marked':
      return 'Marcada';
    default:
      return 'Sin imagen';
  }
}

function resolveCaption(state: 'empty' | 'current' | 'pending' | 'marked') {
  switch (state) {
    case 'pending':
      return 'Vista previa local lista para guardarse cuando confirmes cambios.';
    case 'marked':
      return 'Imagen actual marcada para quitar. Puedes conservarla o elegir un reemplazo antes de guardar.';
    case 'current':
      return 'Imagen actual guardada y lista para revisarla, reemplazarla o dejarla sin cambios.';
    default:
      return 'Sube una portada limpia y bien recortada para reforzar catalogo y POS.';
  }
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function useObjectUrl(file: File | null | undefined) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  return objectUrl;
}
