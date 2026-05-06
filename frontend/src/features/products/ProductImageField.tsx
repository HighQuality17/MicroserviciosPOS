import clsx from 'clsx';
import { ImagePlus, RotateCcw, Trash2, UploadCloud } from 'lucide-react';
import { type ChangeEvent, type DragEvent, useEffect, useId, useRef, useState } from 'react';
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
  const [dragActive, setDragActive] = useState(false);
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
  const fileStateLabel = resolveFileStateLabel({
    state: previewState,
    pendingImageFile,
    hasExistingImage,
  });

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

  function handleDragEnter(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    setDragActive(false);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) event.dataTransfer.dropEffect = 'copy';
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const file = event.dataTransfer.files?.[0] ?? null;
    if (file) onSelectImage(file);
  }

  return (
    <section
      className={clsx(
        'product-image-field products-form-group products-form-group--strong surface-subtle-strong',
        error && 'product-image-field--error',
        disabled && 'product-image-field--disabled',
        dragActive && 'product-image-field--drag-active',
      )}
      aria-labelledby={headingId}
      aria-describedby={clsx(helpId, error ? errorId : undefined)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="product-image-field__header">
        <div className="min-w-0">
          <p
            id={headingId}
            className="products-form-group__label text-[11px] font-semibold uppercase tracking-[0.22em] theme-text-secondary"
          >
            {label}
          </p>
        </div>
        <span className="product-image-field__status" data-state={previewState}>
          {resolvePreviewStatus(previewState)}
        </span>
      </div>

      <div className="product-image-field__body">
        <button
          type="button"
          className="product-image-field__preview-shell"
          data-state={previewState}
          data-drag-active={dragActive || undefined}
          onClick={handleSelectButtonClick}
          disabled={disabled}
          aria-label={selectLabel}
          aria-controls={inputId}
        >
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
          {previewState === 'empty' ? (
            <span className="product-image-field__drop-hint">
              <UploadCloud size={16} aria-hidden="true" />
              Click o arrastra
            </span>
          ) : null}
          {previewState === 'marked' ? (
            <div className="product-image-field__preview-overlay" aria-hidden="true">
              <span>Se quitara</span>
            </div>
          ) : null}
        </button>

        <div className="product-image-field__content">
          <div className="product-image-field__copy">
            <p className="product-image-field__title">Portada POS</p>
            <p className="product-image-field__caption">{resolveCaption(previewState)}</p>
          </div>

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
            <span className="product-image-field__token">WebP/PNG/JPG</span>
            <span className="product-image-field__token">3 MB</span>
            <span className="product-image-field__token">1:1</span>
          </div>

          <p className="product-image-field__file theme-text-secondary">{fileStateLabel}</p>

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
      return 'Actual';
    case 'pending':
      return 'Nueva';
    case 'marked':
      return 'Quitar';
    default:
      return 'Sin imagen';
  }
}

function resolvePreviewNote(state: 'empty' | 'current' | 'pending' | 'marked') {
  switch (state) {
    case 'current':
      return 'Actual';
    case 'pending':
      return 'Nueva';
    case 'marked':
      return 'Quitar';
    default:
      return 'Sin imagen';
  }
}

function resolveCaption(state: 'empty' | 'current' | 'pending' | 'marked') {
  switch (state) {
    case 'pending':
      return 'Se guardara al confirmar.';
    case 'marked':
      return 'Puedes conservarla o reemplazarla.';
    case 'current':
      return 'Lista para catalogo y POS.';
    default:
      return 'Portada limpia, cuadrada y legible.';
  }
}

function resolveFileStateLabel({
  state,
  pendingImageFile,
  hasExistingImage,
}: {
  state: 'empty' | 'current' | 'pending' | 'marked';
  pendingImageFile?: File | null;
  hasExistingImage: boolean;
}) {
  if (pendingImageFile) {
    return `${pendingImageFile.name} · ${formatFileSize(pendingImageFile.size)}`;
  }

  if (state === 'marked') return 'Se quitara al guardar.';
  if (hasExistingImage) return 'Imagen guardada.';
  return 'Sin archivo.';
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
