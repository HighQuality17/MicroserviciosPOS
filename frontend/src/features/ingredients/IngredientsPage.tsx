import "@/features/products/products-d2b.css";
import "@/features/ingredients/ingredients-d2c.css";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { Boxes, ClipboardList, FlaskConical, Warehouse } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AccessState } from "@/components/AccessState";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { FeedbackMessage } from "@/components/FeedbackMessage";
import { Input } from "@/components/Input";
import { ModulePageHeader } from "@/components/ModulePageHeader";
import type {
  ModulePageHeaderBadge,
  ModulePageHeaderCard,
} from "@/components/ModulePageHeader";
import { SearchField } from "@/components/SearchField";
import { Select } from "@/components/Select";
import { StatusBadge } from "@/components/StatusBadge";
import { Textarea } from "@/components/Textarea";
import { CatalogItemsTable } from "@/features/products/CatalogItemsTable";
import { posApi } from "@/services/api/posApi";
import { useAppStore } from "@/store/appStore";
import { useSessionStore } from "@/store/sessionStore";
import type {
  Ingredient,
  IngredientDimension,
  IngredientMovementReasonCode,
  IngredientMovementType,
  StockAdjustmentItem,
  StockListItem,
} from "@/types/api";
import { isAccessDeniedError, translateProtectedError } from "@/utils/apiError";
import { formatCurrency, formatDate, toNumber } from "@/utils/format";
import { normalizeNumberInput, parseNumberInput } from "@/utils/numberInput";

const unitsByDimension: Record<IngredientDimension, string[]> = {
  WEIGHT: ["g", "kg"],
  VOLUME: ["ml", "L"],
  COUNT: ["unit"],
};

const unitFactors: Record<string, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  L: 1000,
  unit: 1,
};

const dimensionLabels: Record<IngredientDimension, string> = {
  WEIGHT: "Peso",
  VOLUME: "Volumen",
  COUNT: "Cantidad",
};

const unitLabels: Record<string, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  L: "L",
  unit: "unidad",
};

const movementTypeLabels: Record<IngredientMovementType, string> = {
  ENTRY: "Entrada",
  EXIT: "Salida",
  ADJUSTMENT: "Ajuste por conteo",
};


const movementTypeTones: Record<
  IngredientMovementType,
  "success" | "warning" | "info"
> = {
  ENTRY: "success",
  EXIT: "warning",
  ADJUSTMENT: "info",
};

const movementTypeOptions: IngredientMovementType[] = [
  "ENTRY",
  "EXIT",
  "ADJUSTMENT",
];

const AUDIT_HISTORY_LIMIT = 12;

const reasonLabels: Record<IngredientMovementReasonCode, string> = {
  PURCHASE: "Compra",
  INITIAL_LOAD: "Carga inicial",
  SUPPLIER_RETURN: "Devolucion proveedor",
  POSITIVE_ADJUSTMENT: "Ajuste positivo",
  WASTE: "Merma",
  DAMAGE: "Daño",
  INTERNAL_USE: "Uso interno",
  EXPIRATION: "Vencimiento",
  NEGATIVE_ADJUSTMENT: "Ajuste negativo",
  PHYSICAL_COUNT: "Conteo fisico",
  ADMIN_CORRECTION: "Correccion administrativa",
};

const reasonsByMovementType: Record<
  IngredientMovementType,
  IngredientMovementReasonCode[]
> = {
  ENTRY: ["PURCHASE", "INITIAL_LOAD", "SUPPLIER_RETURN", "POSITIVE_ADJUSTMENT"],
  EXIT: [
    "WASTE",
    "DAMAGE",
    "INTERNAL_USE",
    "EXPIRATION",
    "NEGATIVE_ADJUSTMENT",
  ],
  ADJUSTMENT: ["PHYSICAL_COUNT", "ADMIN_CORRECTION"],
};

function getDimensionLabel(dimension: IngredientDimension) {
  return dimensionLabels[dimension];
}

function getUnitLabel(unitCode: string) {
  return unitLabels[unitCode] ?? unitCode;
}

function formatQty(value: number | string | null | undefined) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(
    toNumber(value),
  );
}

function roundValue(value: number, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function getMovementDelta(item: StockAdjustmentItem) {
  if (item.movementType === "ENTRY") return toNumber(item.qtyBase);
  if (item.movementType === "EXIT") return toNumber(item.qtyBase) * -1;
  return toNumber(item.qtyBase);
}

function normalizeIngredientsSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

function matchesIngredientName(name: string, searchTerm: string) {
  const normalizedSearch = normalizeIngredientsSearch(searchTerm);
  if (!normalizedSearch) return true;

  return name.toLocaleLowerCase().includes(normalizedSearch);
}

function matchesAuditSearch(item: StockAdjustmentItem, searchTerm: string) {
  const normalizedSearch = normalizeIngredientsSearch(searchTerm);
  if (!normalizedSearch) return true;

  const candidate = [
    item.ingredient.name,
    movementTypeLabels[item.movementType],
    item.reasonCode ? reasonLabels[item.reasonCode] : "",
    item.adjustedByUser.name,
  ]
    .join(" ")
    .toLocaleLowerCase();

  return candidate.includes(normalizedSearch);
}

export function IngredientsPage() {
  const [searchParams] = useSearchParams();
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentLocation = useAppStore((state) => state.currentLocation);
  const availableLocations = useAppStore((state) => state.availableLocations);
  const sessionIngredients = useAppStore((state) => state.sessionIngredients);
  const addSessionIngredient = useAppStore(
    (state) => state.addSessionIngredient,
  );

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [stockItems, setStockItems] = useState<StockListItem[]>([]);
  const [adjustmentItems, setAdjustmentItems] = useState<StockAdjustmentItem[]>(
    [],
  );
  const [focusedAdjustment, setFocusedAdjustment] =
    useState<StockAdjustmentItem | null>(null);
  const [adjustmentItemsLocationId, setAdjustmentItemsLocationId] = useState<
    number | null
  >(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingAdjustments, setLoadingAdjustments] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [adjustmentsError, setAdjustmentsError] = useState<string | null>(null);
  const [catalogAccessDenied, setCatalogAccessDenied] = useState(false);
  const [stockAccessDenied, setStockAccessDenied] = useState(false);
  const [adjustmentsAccessDenied, setAdjustmentsAccessDenied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [creatingIngredient, setCreatingIngredient] = useState(false);
  const [submittingMovement, setSubmittingMovement] = useState(false);

  const [name, setName] = useState("");
  const [dimension, setDimension] = useState<IngredientDimension>("WEIGHT");
  const [defaultUnitCode, setDefaultUnitCode] = useState("g");
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null,
  );
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [movementType, setMovementType] =
    useState<IngredientMovementType>("ENTRY");
  const [reasonCode, setReasonCode] =
    useState<IngredientMovementReasonCode>("PURCHASE");
  const [qtyInput, setQtyInput] = useState("");
  const [countedStockInput, setCountedStockInput] = useState("");
  const [unitCode, setUnitCode] = useState("g");
  const [supportDocument, setSupportDocument] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [unitCostInput, setUnitCostInput] = useState("");
  const [notes, setNotes] = useState("");
  const [catalogSearchTerm, setCatalogSearchTerm] = useState("");
  const [stockSearchTerm, setStockSearchTerm] = useState("");
  const [auditSearchTerm, setAuditSearchTerm] = useState("");

  const isAdmin = currentUser?.role === "ADMIN";
  const movementIdFromQuery = useMemo(() => {
    const rawValue = searchParams.get("movementId");
    if (!rawValue) return null;

    const parsed = Number(rawValue);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);
  const locationIdFromQuery = useMemo(() => {
    const rawValue = searchParams.get("locationId");
    if (!rawValue) return null;

    const parsed = Number(rawValue);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const mergedIngredients = useMemo(() => {
    const stockIngredients = stockItems.map((item) => item.ingredient);
    const combined = [
      ...ingredients,
      ...sessionIngredients,
      ...stockIngredients,
    ];
    const map = new Map<number, Ingredient>();
    for (const ingredient of combined) map.set(ingredient.id, ingredient);
    return Array.from(map.values()).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }, [ingredients, sessionIngredients, stockItems]);

  const selectedIngredient =
    mergedIngredients.find(
      (ingredient) => ingredient.id === Number(selectedIngredientId),
    ) ?? null;
  const availableDefaultUnits = unitsByDimension[dimension];
  const availableAdjustUnits = selectedIngredient
    ? unitsByDimension[selectedIngredient.dimension]
    : [];
  const movementReasonOptions = reasonsByMovementType[movementType];

  useEffect(() => {
    setSelectedLocationId(currentLocation?.id ?? null);
  }, [currentLocation]);

  useEffect(() => {
    if (
      locationIdFromQuery !== null &&
      locationIdFromQuery !== selectedLocationId
    ) {
      setSelectedLocationId(locationIdFromQuery);
    }
  }, [locationIdFromQuery, selectedLocationId]);

  useEffect(() => {
    setDefaultUnitCode(availableDefaultUnits[0]);
  }, [availableDefaultUnits]);

  useEffect(() => {
    if (!selectedIngredient) {
      setUnitCode("");
      return;
    }

    const allowedUnits = unitsByDimension[selectedIngredient.dimension];
    const defaultUnit = selectedIngredient.defaultUnitCode;
    setUnitCode(
      allowedUnits.includes(defaultUnit as (typeof allowedUnits)[number])
        ? defaultUnit
        : allowedUnits[0],
    );
  }, [selectedIngredient]);

  useEffect(() => {
    if (!movementReasonOptions.includes(reasonCode)) {
      setReasonCode(movementReasonOptions[0]);
    }
  }, [movementReasonOptions, reasonCode]);

  useEffect(() => {
    void loadIngredients();
  }, []);

  useEffect(() => {
    if (selectedLocationId === null) {
      setStockItems([]);
      setAdjustmentItems([]);
      setAdjustmentItemsLocationId(null);
      setFocusedAdjustment(null);
      setAdjustmentsError(null);
      setLoadingStock(false);
      setLoadingAdjustments(false);
      return;
    }

    void loadStock(selectedLocationId);
    void loadAdjustments(selectedLocationId);
  }, [selectedLocationId]);

  useEffect(() => {
    if (movementIdFromQuery === null) {
      setFocusedAdjustment(null);
      return;
    }

    const targetMovementId = movementIdFromQuery;
    let cancelled = false;

    async function loadFocusedAdjustment() {
      try {
        const movement = await posApi.getStockAdjustmentById(targetMovementId);
        if (cancelled) return;

        setFocusedAdjustment(movement);
        if (movement.locationId !== selectedLocationId) {
          setSelectedLocationId(movement.locationId);
        }
      } catch {
        if (!cancelled) {
          setFocusedAdjustment(null);
        }
      }
    }

    void loadFocusedAdjustment();

    return () => {
      cancelled = true;
    };
  }, [movementIdFromQuery, selectedLocationId]);

  async function loadIngredients() {
    try {
      setLoadingCatalog(true);
      setCatalogError(null);
      setCatalogAccessDenied(false);
      setIngredients(await posApi.getIngredients());
    } catch (error) {
      setIngredients([]);
      setCatalogAccessDenied(isAccessDeniedError(error));
      setCatalogError(
        error instanceof Error
          ? translateProtectedError(error, "No fue posible cargar ingredientes")
          : "No fue posible cargar ingredientes",
      );
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function loadStock(locationId: number) {
    try {
      setLoadingStock(true);
      setStockError(null);
      setStockAccessDenied(false);
      const response = await posApi.getStock(locationId);
      setStockItems(response.items);
    } catch (error) {
      setStockItems([]);
      setStockAccessDenied(isAccessDeniedError(error));
      setStockError(
        error instanceof Error
          ? translateProtectedError(error, "No fue posible cargar stock")
          : "No fue posible cargar stock",
      );
    } finally {
      setLoadingStock(false);
    }
  }

  async function loadAdjustments(locationId: number) {
    if (!Number.isInteger(locationId) || locationId <= 0) {
      setAdjustmentItems([]);
      setAdjustmentItemsLocationId(null);
      setAdjustmentsError(null);
      setLoadingAdjustments(false);
      return;
    }

    try {
      setLoadingAdjustments(true);
      setAdjustmentsError(null);
      setAdjustmentsAccessDenied(false);
      const response = await posApi.getStockAdjustments({
        location_id: locationId,
        limit: AUDIT_HISTORY_LIMIT,
      });
      setAdjustmentItems(response.items);
      setAdjustmentItemsLocationId(locationId);
    } catch (error) {
      if (adjustmentItemsLocationId !== locationId) {
        setAdjustmentItems([]);
        setAdjustmentItemsLocationId(null);
      }
      setAdjustmentsAccessDenied(isAccessDeniedError(error));
      setAdjustmentsError(
        error instanceof Error
          ? translateProtectedError(error, "No fue posible cargar movimientos")
          : "No fue posible cargar movimientos",
      );
    } finally {
      setLoadingAdjustments(false);
    }
  }

  async function refreshIngredientsWorkspace() {
    await Promise.all([
      loadIngredients(),
      selectedLocationId !== null
        ? loadStock(selectedLocationId)
        : Promise.resolve(),
      selectedLocationId !== null
        ? loadAdjustments(selectedLocationId)
        : Promise.resolve(),
    ]);
  }

  async function handleCreateIngredient() {
    if (!name.trim()) {
      setSubmitError("El nombre del ingrediente es obligatorio.");
      return;
    }

    try {
      setCreatingIngredient(true);
      setSubmitError(null);
      setMessage(null);
      const ingredient = await posApi.createIngredient({
        name: name.trim(),
        dimension,
        default_unit_code: defaultUnitCode,
      });
      addSessionIngredient(ingredient);
      setSelectedIngredientId(String(ingredient.id));
      setName("");
      setMessage(`Ingrediente #${ingredient.id} creado correctamente.`);
      await loadIngredients();
      if (selectedLocationId !== null) await loadStock(selectedLocationId);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo crear el ingrediente",
      );
    } finally {
      setCreatingIngredient(false);
    }
  }

  const stockQtyByIngredientId = useMemo(
    () =>
      new Map(
        stockItems.map((item) => [
          item.ingredientId,
          toNumber(item.qtyOnHandBase),
        ]),
      ),
    [stockItems],
  );

  const currentBaseStock = selectedIngredient
    ? (stockQtyByIngredientId.get(selectedIngredient.id) ?? 0)
    : 0;
  const unitFactor = unitFactors[unitCode] ?? 1;
  const parsedQty = parseNumberInput(qtyInput);
  const parsedCountedStock = parseNumberInput(countedStockInput);
  const parsedUnitCost = unitCostInput.trim()
    ? parseNumberInput(unitCostInput)
    : null;

  const movementPreview = useMemo(() => {
    if (!selectedIngredient || !unitCode) return null;

    const currentInSelectedUnit = roundValue(currentBaseStock / unitFactor, 3);
    if (movementType === "ADJUSTMENT") {
      if (parsedCountedStock === null || parsedCountedStock < 0) {
        return {
          currentBaseStock,
          currentInSelectedUnit,
          deltaBase: null,
          nextBaseStock: null,
          invalid: true,
          invalidMessage: "Ingresa un stock contado valido.",
        };
      }

      const countedBase = roundValue(parsedCountedStock * unitFactor, 3);
      return {
        currentBaseStock,
        currentInSelectedUnit,
        deltaBase: roundValue(countedBase - currentBaseStock, 3),
        nextBaseStock: countedBase,
        invalid: false,
        invalidMessage: null,
      };
    }

    if (parsedQty === null || parsedQty <= 0) {
      return {
        currentBaseStock,
        currentInSelectedUnit,
        deltaBase: null,
        nextBaseStock: null,
        invalid: true,
        invalidMessage: "Ingresa una cantidad mayor a 0.",
      };
    }

    const qtyBase = roundValue(parsedQty * unitFactor, 3);
    const deltaBase = movementType === "EXIT" ? qtyBase * -1 : qtyBase;
    const nextBaseStock = roundValue(currentBaseStock + deltaBase, 3);
    return {
      currentBaseStock,
      currentInSelectedUnit,
      deltaBase,
      nextBaseStock,
      invalid: nextBaseStock < 0,
      invalidMessage:
        nextBaseStock < 0
          ? "El movimiento dejaria el stock en negativo."
          : null,
    };
  }, [
    currentBaseStock,
    movementType,
    parsedCountedStock,
    parsedQty,
    selectedIngredient,
    unitCode,
    unitFactor,
  ]);

  async function handleSubmitMovement() {
    if (!currentUser || !isAdmin) {
      setSubmitError("Tu perfil no puede registrar movimientos de stock.");
      return;
    }
    if (!selectedIngredient) {
      setSubmitError("Selecciona un ingrediente para registrar el movimiento.");
      return;
    }
    if (selectedLocationId === null) {
      setSubmitError(
        "Selecciona una ubicacion valida para registrar el movimiento.",
      );
      return;
    }
    if (!unitCode) {
      setSubmitError("Selecciona la unidad del movimiento.");
      return;
    }

    const trimmedNotes = notes.trim();
    if (movementType === "ADJUSTMENT") {
      if (parsedCountedStock === null || parsedCountedStock < 0) {
        setSubmitError("Ingresa un stock contado valido.");
        return;
      }
      if (!trimmedNotes) {
        setSubmitError(
          "Las observaciones son obligatorias para ajustes por conteo.",
        );
        return;
      }
    } else {
      if (parsedQty === null || parsedQty <= 0) {
        setSubmitError("Ingresa una cantidad valida mayor a 0.");
        return;
      }
      if (movementType === "EXIT" && !trimmedNotes) {
        setSubmitError(
          "Las observaciones son obligatorias para salidas manuales.",
        );
        return;
      }
    }
    if (parsedUnitCost !== null && parsedUnitCost < 0) {
      setSubmitError("El costo unitario no puede ser negativo.");
      return;
    }
    if (movementPreview?.invalid) {
      setSubmitError(
        movementPreview.invalidMessage ?? "No se puede guardar el movimiento.",
      );
      return;
    }

    try {
      setSubmittingMovement(true);
      setSubmitError(null);
      setMessage(null);
      await posApi.createStockAdjustment({
        location_id: selectedLocationId,
        ingredient_id: selectedIngredient.id,
        movement_type: movementType,
        reason_code: reasonCode,
        qty:
          movementType === "ADJUSTMENT" ? undefined : (parsedQty ?? undefined),
        unit_code: unitCode,
        counted_stock:
          movementType === "ADJUSTMENT"
            ? (parsedCountedStock ?? undefined)
            : undefined,
        support_document: supportDocument.trim() || undefined,
        unit_cost_at_time:
          movementType === "ENTRY" && parsedUnitCost !== null
            ? parsedUnitCost
            : undefined,
        batch_number: batchNumber.trim() || undefined,
        notes: trimmedNotes || undefined,
      });
      setQtyInput("");
      setCountedStockInput("");
      setSupportDocument("");
      setBatchNumber("");
      setUnitCostInput("");
      setNotes("");
      setMessage("Movimiento registrado correctamente.");
      await Promise.all([
        loadStock(selectedLocationId),
        loadAdjustments(selectedLocationId),
      ]);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el movimiento de stock",
      );
    } finally {
      setSubmittingMovement(false);
    }
  }

  const selectedLocation =
    availableLocations.find((location) => location.id === selectedLocationId) ??
    currentLocation ??
    null;
  const inventoryStatusTone =
    catalogAccessDenied || stockAccessDenied || adjustmentsAccessDenied
      ? "danger"
      : catalogError || stockError || adjustmentsError
        ? "warning"
        : loadingCatalog || loadingStock || loadingAdjustments
          ? "info"
          : selectedLocation
            ? "success"
            : "default";
  const inventoryStatusLabel =
    catalogAccessDenied || stockAccessDenied || adjustmentsAccessDenied
      ? "Acceso restringido"
      : catalogError || stockError || adjustmentsError
        ? "Revision requerida"
        : loadingCatalog || loadingStock || loadingAdjustments
          ? "Sincronizando"
          : selectedLocation
            ? "Inventario auditado"
            : "Selecciona ubicacion";
  const ingredientCatalogTone = loadingCatalog
    ? "info"
    : catalogError
      ? "warning"
      : mergedIngredients.length > 0
        ? "success"
        : "default";
  const stockTone = loadingStock
    ? "info"
    : selectedLocation
      ? stockItems.length > 0
        ? "info"
        : "warning"
      : "default";
  const outOfStockCount = selectedLocation
    ? mergedIngredients.filter(
        (ingredient) => (stockQtyByIngredientId.get(ingredient.id) ?? 0) <= 0,
      ).length
    : 0;
  const outOfStockTone = loadingStock
    ? "info"
    : !selectedLocation
      ? "default"
      : outOfStockCount > 0
        ? "warning"
        : "success";
  const totalStockBase = useMemo(
    () =>
      stockItems.reduce(
        (total, item) => total + toNumber(item.qtyOnHandBase),
        0,
      ),
    [stockItems],
  );
  const filteredCatalogIngredients = useMemo(
    () =>
      mergedIngredients.filter((ingredient) =>
        matchesIngredientName(ingredient.name, catalogSearchTerm),
      ),
    [catalogSearchTerm, mergedIngredients],
  );
  const filteredStockItems = useMemo(
    () =>
      stockItems.filter((item) =>
        matchesIngredientName(item.ingredient.name, stockSearchTerm),
      ),
    [stockItems, stockSearchTerm],
  );
  const mergedAdjustmentItems = useMemo(() => {
    const map = new Map<number, StockAdjustmentItem>();

    if (focusedAdjustment) {
      map.set(focusedAdjustment.id, focusedAdjustment);
    }

    for (const item of adjustmentItems) {
      map.set(item.id, item);
    }

    return Array.from(map.values());
  }, [adjustmentItems, focusedAdjustment]);
  const filteredAdjustmentItems = useMemo(
    () =>
      mergedAdjustmentItems.filter((item) =>
        matchesAuditSearch(item, auditSearchTerm),
      ),
    [mergedAdjustmentItems, auditSearchTerm],
  );
  const dimensionCounts = useMemo(() => {
    const counts: Record<IngredientDimension, number> = {
      WEIGHT: 0,
      VOLUME: 0,
      COUNT: 0,
    };

    for (const ingredient of mergedIngredients) {
      counts[ingredient.dimension] += 1;
    }

    return counts;
  }, [mergedIngredients]);
  const auditTone =
    loadingAdjustments
      ? "info"
      : adjustmentsError
        ? "warning"
        : selectedLocation
          ? adjustmentItems.length > 0 || focusedAdjustment !== null
            ? "success"
            : "default"
          : "default";
  const selectedLocationLabel = selectedLocation
    ? `#${selectedLocation.id} / ${selectedLocation.name}`
    : "Sin ubicacion activa";
  const selectedIngredientSummary = selectedIngredient
    ? `${selectedIngredient.name} / ${getUnitLabel(selectedIngredient.defaultUnitCode)}`
    : "Sin ingrediente seleccionado";
  const movementDeltaTone =
    movementPreview?.deltaBase === null || movementPreview?.deltaBase === undefined
      ? "neutral"
      : movementPreview.deltaBase < 0
        ? "negative"
        : movementPreview.deltaBase > 0
          ? "positive"
          : "neutral";
  const inventoryHeaderBadges: ModulePageHeaderBadge[] = [
    {
      label: inventoryStatusLabel,
      tone: inventoryStatusTone,
    },
    {
      label: isAdmin ? "Operacion habilitada" : "Modo consulta",
      tone: isAdmin ? "info" : "default",
    },
  ];
  const inventoryHeaderCards: ModulePageHeaderCard[] = [
    {
      label: "Catalogo base",
      value: String(mergedIngredients.length),
      note: loadingCatalog
        ? "Sincronizando"
        : `${dimensionCounts[dimension]} en ${getDimensionLabel(dimension).toLocaleLowerCase()}`,
      accent: ingredientCatalogTone,
      icon: <FlaskConical size={16} />,
      iconTone: ingredientCatalogTone,
      badge: {
        label: catalogError ? "Datos locales" : "Catalogo",
        tone: ingredientCatalogTone,
      },
    },
    {
      label: "Stock visible",
      value: selectedLocation ? String(stockItems.length) : "--",
      note: selectedLocation
        ? `${formatQty(totalStockBase)} base`
        : "Sin ubicacion",
      accent: stockTone,
      icon: <Warehouse size={16} />,
      iconTone: stockTone,
      badge: {
        label: selectedLocation ? "Por ubicacion" : "Sin POS",
        tone: selectedLocation ? "info" : "default",
      },
    },
    {
      label: "Sin stock",
      value: loadingStock ? "..." : String(outOfStockCount),
      note: selectedLocation
        ? "Pendientes de reposicion"
        : "Sin ubicacion",
      accent: outOfStockTone,
      icon: <Boxes size={16} />,
      iconTone: outOfStockTone,
      badge: {
        label: selectedLocation ? "Reposicion" : "Sin POS",
        tone: outOfStockTone,
      },
    },
    {
      label: "Auditoria reciente",
      value: selectedLocation ? String(adjustmentItems.length) : "--",
      note: selectedLocation
        ? `${AUDIT_HISTORY_LIMIT} recientes`
        : "Sin ubicacion",
      accent: auditTone,
      icon: <ClipboardList size={16} />,
      iconTone: auditTone,
      badge: {
        label: selectedLocation ? "Trazabilidad" : "Sin POS",
        tone: auditTone,
      },
    },
  ];
  const workspaceClassName = clsx(
    "products-workspace grid min-w-0 items-start gap-4 xl:gap-5",
    isAdmin
      ? "lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]"
      : "grid-cols-1",
  );

  return (
    <div className="products-page ingredients-page grid min-w-0 gap-5 sm:gap-6">
      <ModulePageHeader
        ariaLabel="Estado operativo de ingredientes"
        eyebrow="Administracion de inventario"
        title="Ingredientes"
        icon={<FlaskConical size={18} />}
        badges={inventoryHeaderBadges}
        description="Catalogo, stock y movimientos por ubicacion."
        summary={{
          label: "Contexto activo",
          value: selectedLocationLabel,
          note: selectedLocation
            ? `${adjustmentItems.length} movimientos / ${stockItems.length} items`
            : "Selecciona una ubicacion.",
        }}
        asideAction={
          <Button variant="secondary" onClick={() => void refreshIngredientsWorkspace()}>
            Actualizar inventario
          </Button>
        }
        cards={inventoryHeaderCards}
      />

      {message ? (
        <FeedbackMessage tone="success" className="products-feedback">
          {message}
        </FeedbackMessage>
      ) : null}
      {submitError ? (
        <FeedbackMessage tone="error" className="products-feedback">
          {submitError}
        </FeedbackMessage>
      ) : null}
      {!currentLocation ? (
        <Card
          padding="none"
          glow={false}
          className="products-panel products-panel--list"
          contentClassName="products-panel__body"
        >
          <EmptyState
            title="Sin punto de venta activo"
            description="Selecciona una ubicacion real en el encabezado para consultar y registrar inventario."
          />
        </Card>
      ) : null}
      {catalogAccessDenied || stockAccessDenied || adjustmentsAccessDenied ? (
        <AccessState description="Tu perfil actual no tiene permiso para consultar este modulo completo." />
      ) : null}
      {!isAdmin ? (
        <FeedbackMessage tone="info">
          Tu perfil esta en modo consulta. Puedes revisar catalogo, stock e
          historial, pero no crear ingredientes ni registrar movimientos
          manuales.
        </FeedbackMessage>
      ) : null}

      <div className={workspaceClassName}>
        {isAdmin ? (
          <div className="products-form-rail grid min-w-0 gap-4 sm:gap-5">
            <Card
              padding="none"
              glow={false}
              className="products-panel products-panel--form"
              contentClassName="products-panel__body"
            >
              <div className="products-panel__header">
                <div className="products-panel__header-copy">
                  <p className="products-panel__eyebrow">Administracion base</p>
                  <div className="products-panel__title-row">
                    <h2 className="font-display text-2xl font-bold theme-text-strong">
                      Crear ingrediente
                    </h2>
                  </div>
                </div>
              </div>
              <div className="products-panel__highlights ingredients-quick-metrics">
                <div className="products-panel__spotlight products-panel__spotlight--variant">
                  <p className="products-panel__spotlight-label">Catalogo</p>
                  <p className="products-panel__spotlight-value">
                    {mergedIngredients.length}
                  </p>
                </div>
                <div className="products-panel__spotlight">
                  <p className="products-panel__spotlight-label">Dimension</p>
                  <p className="products-panel__spotlight-value">
                    {getDimensionLabel(dimension)}
                  </p>
                </div>
              </div>
              <div className="products-form-stack grid gap-4">
                <Input
                  label="Nombre"
                  wrapperClassName="products-field"
                  labelClassName="products-field__label"
                  className="products-field__control"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Leche entera"
                />
                <div className="products-form-group products-form-group--strong rounded-lg p-4 sm:p-5">
                  <div className="products-form-group__heading">
                    <p className="products-form-group__label">Configuracion base</p>
                  </div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Select
                      label="Dimension"
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      value={dimension}
                      onChange={(event) =>
                        setDimension(event.target.value as IngredientDimension)
                      }
                    >
                      <option value="WEIGHT">{getDimensionLabel("WEIGHT")}</option>
                      <option value="VOLUME">{getDimensionLabel("VOLUME")}</option>
                      <option value="COUNT">{getDimensionLabel("COUNT")}</option>
                    </Select>
                    <Select
                      label="Unidad por defecto"
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      value={defaultUnitCode}
                      onChange={(event) => setDefaultUnitCode(event.target.value)}
                    >
                      {availableDefaultUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {getUnitLabel(unit)}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="products-panel__actions flex gap-3">
                  <Button
                    className="products-panel__cta"
                    disabled={creatingIngredient || !name.trim()}
                    onClick={handleCreateIngredient}
                  >
                    {creatingIngredient ? "Guardando..." : "Crear ingrediente"}
                  </Button>
                </div>
              </div>
            </Card>

            <Card
              padding="none"
              glow={false}
              className="products-panel products-panel--form"
              contentClassName="products-panel__body"
            >
              <div className="products-panel__header">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="products-panel__header-copy">
                    <p className="products-panel__eyebrow">Movimiento de stock</p>
                    <div className="products-panel__title-row">
                      <h2 className="font-display text-2xl font-bold theme-text-strong">
                        Registro auditado
                      </h2>
                    </div>
                  </div>
                  <StatusBadge
                    label={movementTypeLabels[movementType]}
                    tone={movementTypeTones[movementType]}
                  />
                </div>
              </div>
              <div className="products-panel__highlights">
                <div className="products-panel__spotlight products-panel__spotlight--variant">
                  <p className="products-panel__spotlight-label">Ubicacion activa</p>
                  <p className="products-panel__spotlight-value">
                    {selectedLocation ? `#${selectedLocation.id}` : "--"}
                  </p>
                  <p className="products-panel__spotlight-note">
                    {selectedLocation?.name ?? "Selecciona un POS para continuar."}
                  </p>
                </div>
                <div className="products-panel__spotlight">
                  <p className="products-panel__spotlight-label">Ingrediente</p>
                  <p className="products-panel__spotlight-value">
                    {selectedIngredient ? getUnitLabel(selectedIngredient.defaultUnitCode) : "--"}
                  </p>
                  <p className="products-panel__spotlight-note">
                    {selectedIngredientSummary}
                  </p>
                </div>
              </div>
              <div className="products-form-stack grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Ubicacion"
                    wrapperClassName="products-field"
                    labelClassName="products-field__label"
                    className="products-field__control"
                    value={selectedLocationId ?? ""}
                    onChange={(event) =>
                      setSelectedLocationId(
                        event.currentTarget.value
                          ? Number(event.currentTarget.value)
                          : null,
                      )
                    }
                  >
                    <option value="">Selecciona una ubicacion</option>
                    {availableLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        #{location.id} / {location.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Ingrediente"
                    wrapperClassName="products-field"
                    labelClassName="products-field__label"
                    className="products-field__control"
                    value={selectedIngredientId}
                    onChange={(event) =>
                      setSelectedIngredientId(event.target.value)
                    }
                  >
                    <option value="">Selecciona un ingrediente</option>
                    {mergedIngredients.map((ingredient) => (
                      <option key={ingredient.id} value={String(ingredient.id)}>
                        #{ingredient.id} / {ingredient.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="products-form-group products-form-group--strong rounded-lg p-4 sm:p-5">
                  <div className="products-form-group__heading">
                    <p className="products-form-group__label">Tipo de movimiento</p>
                  </div>
                  <div
                    className="ingredients-flow-selector mt-3"
                    role="group"
                    aria-label="Tipo de movimiento"
                  >
                    {movementTypeOptions.map((type) => (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={movementType === type}
                        data-active={movementType === type || undefined}
                        className="ingredients-flow-selector__option"
                        onClick={() => setMovementType(type)}
                      >
                        <span>{movementTypeLabels[type]}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Select
                      label="Motivo"
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      value={reasonCode}
                      onChange={(event) =>
                        setReasonCode(
                          event.target.value as IngredientMovementReasonCode,
                        )
                      }
                    >
                      {movementReasonOptions.map((code) => (
                        <option key={code} value={code}>
                          {reasonLabels[code]}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                {movementType === "ADJUSTMENT" ? (
                  <div className="products-form-group rounded-lg p-4 sm:p-5">
                    <div className="products-form-group__heading">
                      <p className="products-form-group__label">Conteo y base</p>
                    </div>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Input
                        label="Stock actual"
                        wrapperClassName="products-field"
                        labelClassName="products-field__label"
                        className="products-field__control"
                        value={formatQty(
                          movementPreview?.currentInSelectedUnit ??
                            currentBaseStock / unitFactor,
                        )}
                        readOnly
                      />
                      <Input
                        label="Stock actual base"
                        wrapperClassName="products-field"
                        labelClassName="products-field__label"
                        className="products-field__control"
                        value={formatQty(currentBaseStock)}
                        readOnly
                      />
                      <Input
                        type="number"
                        label="Stock contado"
                        wrapperClassName="products-field"
                        labelClassName="products-field__label"
                        className="products-field__control"
                        value={countedStockInput}
                        onChange={(event) => {
                          const nextValue = normalizeNumberInput(
                            event.target.value,
                            { allowDecimal: true },
                          );
                          if (nextValue !== null) setCountedStockInput(nextValue);
                        }}
                      />
                      <Select
                        label="Unidad de conteo"
                        wrapperClassName="products-field"
                        labelClassName="products-field__label"
                        className="products-field__control"
                        value={unitCode}
                        onChange={(event) => setUnitCode(event.target.value)}
                      >
                        {availableAdjustUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {getUnitLabel(unit)}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="products-form-group rounded-lg p-4 sm:p-5">
                    <div className="products-form-group__heading">
                      <p className="products-form-group__label">Cantidad operativa</p>
                    </div>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      <Input
                        type="number"
                        label="Cantidad"
                        wrapperClassName="products-field"
                        labelClassName="products-field__label"
                        className="products-field__control"
                        value={qtyInput}
                        onChange={(event) => {
                          const nextValue = normalizeNumberInput(
                            event.target.value,
                            { allowDecimal: true },
                          );
                          if (nextValue !== null) setQtyInput(nextValue);
                        }}
                      />
                      <Select
                        label="Unidad"
                        wrapperClassName="products-field"
                        labelClassName="products-field__label"
                        className="products-field__control"
                        value={unitCode}
                        onChange={(event) => setUnitCode(event.target.value)}
                      >
                        {availableAdjustUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {getUnitLabel(unit)}
                          </option>
                        ))}
                      </Select>
                      <Input
                        label="Stock actual base"
                        wrapperClassName="products-field"
                        labelClassName="products-field__label"
                        className="products-field__control"
                        value={formatQty(currentBaseStock)}
                        readOnly
                      />
                    </div>
                  </div>
                )}
                <div className="products-form-group rounded-lg p-4 sm:p-5">
                  <div className="products-form-group__heading">
                    <p className="products-form-group__label">Trazabilidad</p>
                  </div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Documento soporte"
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      value={supportDocument}
                      onChange={(event) => setSupportDocument(event.target.value)}
                      placeholder="Factura, acta o remision"
                    />
                    <Input
                      label="Lote"
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control"
                      value={batchNumber}
                      onChange={(event) => setBatchNumber(event.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                  {movementType === "ENTRY" ? (
                    <div className="mt-4">
                      <Input
                        type="number"
                        label="Costo unitario"
                        wrapperClassName="products-field"
                        labelClassName="products-field__label"
                        className="products-field__control"
                        value={unitCostInput}
                        onChange={(event) => {
                          const nextValue = normalizeNumberInput(
                            event.target.value,
                            { allowDecimal: true },
                          );
                          if (nextValue !== null) setUnitCostInput(nextValue);
                        }}
                        hint={
                          parsedUnitCost !== null
                            ? `Costo: ${formatCurrency(parsedUnitCost)}`
                            : "Opcional"
                        }
                      />
                    </div>
                  ) : null}
                  <div className="mt-4">
                    <Textarea
                      label="Observaciones"
                      wrapperClassName="products-field"
                      labelClassName="products-field__label"
                      className="products-field__control min-h-[7rem]"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      hint={
                        movementType === "ENTRY"
                          ? "Opcional"
                          : "Obligatorio para salidas y ajustes."
                      }
                    />
                  </div>
                </div>
                <div className="products-form-group products-form-group--strong rounded-lg p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="products-form-group__label">Impacto estimado</p>
                    <StatusBadge
                      label={movementPreview?.invalid ? "Bloqueado" : "Listo"}
                      tone={movementPreview?.invalid ? "danger" : "info"}
                    />
                  </div>
                  <div className="ingredients-impact-preview mt-3">
                    <div className="ingredients-impact-card" data-role="current">
                      <p className="ingredients-impact-card__label">Actual</p>
                      <p className="ingredients-impact-card__value">
                        {formatQty(
                          movementPreview?.currentBaseStock ?? currentBaseStock,
                        )}
                      </p>
                    </div>
                    <div
                      className="ingredients-impact-card"
                      data-role="delta"
                      data-tone={movementDeltaTone}
                    >
                      <p className="ingredients-impact-card__label">Diferencia</p>
                      <p className="ingredients-impact-card__value">
                        {movementPreview?.deltaBase === null ||
                        movementPreview?.deltaBase === undefined
                          ? "--"
                          : `${movementPreview.deltaBase >= 0 ? "+" : ""}${formatQty(movementPreview.deltaBase)}`}
                      </p>
                    </div>
                    <div className="ingredients-impact-card" data-role="next">
                      <p className="ingredients-impact-card__label">Nuevo</p>
                      <p className="ingredients-impact-card__value">
                        {movementPreview?.nextBaseStock === null ||
                        movementPreview?.nextBaseStock === undefined
                          ? "--"
                          : formatQty(movementPreview.nextBaseStock)}
                      </p>
                    </div>
                  </div>
                  {movementPreview?.invalidMessage ? (
                    <p className="mt-3 text-sm text-[color:var(--danger-text)]">
                      {movementPreview.invalidMessage}
                    </p>
                  ) : null}
                </div>
                <div className="ingredients-operator-strip">
                  <span>Responsable</span>
                  <span className="font-medium theme-text-strong">
                    {currentUser?.name ?? "Sin sesion"}
                  </span>
                </div>
                <div className="products-panel__actions flex gap-3">
                  <Button
                    className="products-panel__cta"
                    disabled={
                      submittingMovement ||
                      selectedLocationId === null ||
                      !selectedIngredient
                    }
                    onClick={handleSubmitMovement}
                  >
                    {submittingMovement ? "Guardando..." : "Registrar movimiento"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        <div className="products-data-rail grid min-w-0 gap-4 sm:gap-5">
          <Card
            padding="none"
            glow={false}
            className="products-panel products-panel--list"
            contentClassName="products-panel__body"
          >
            <div className="products-panel__header">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="products-panel__header-copy">
                  <p className="products-panel__eyebrow">Listado de ingredientes</p>
                  <div className="products-panel__title-row">
                    <h2 className="font-display text-2xl font-bold theme-text-strong">
                      Catalogo base
                    </h2>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="products-panel__secondary"
                  onClick={() => void loadIngredients()}
                >
                  Refrescar
                </Button>
              </div>
            </div>
            <IngredientsPanelToolbar
              label="Vista activa"
              value={`${filteredCatalogIngredients.length} de ${mergedIngredients.length} ingredientes`}
              badges={[
                {
                  label: catalogError ? "Datos disponibles" : "Catalogo principal",
                  tone: ingredientCatalogTone,
                },
                {
                  label: selectedLocation ? `POS #${selectedLocation.id}` : "Sin POS",
                  tone: selectedLocation ? "info" : "default",
                },
              ]}
              searchValue={catalogSearchTerm}
              onSearchChange={setCatalogSearchTerm}
              searchPlaceholder="Buscar ingrediente"
              searchAriaLabel="Buscar en catalogo base de ingredientes"
            />
            {loadingCatalog ? (
              <div className="mt-6 grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="data-list-card h-20 animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : mergedIngredients.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin ingredientes cargados"
                  description="Crea el primer ingrediente para comenzar a controlar inventario."
                />
              </div>
            ) : filteredCatalogIngredients.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin coincidencias para esta busqueda"
                  description="No encontramos ingredientes que coincidan con el nombre ingresado."
                />
              </div>
            ) : (
              <CatalogItemsTable
                ariaLabel="Catalogo de ingredientes"
                caption="Tabla base de ingredientes"
                rows={filteredCatalogIngredients}
                rowKey={(ingredient) => ingredient.id}
                rowClassName={(ingredient) =>
                  selectedLocation &&
                  (stockQtyByIngredientId.get(ingredient.id) ?? 0) <= 0
                    ? "opacity-85"
                    : undefined
                }
                maxHeightClassName="max-h-[24rem]"
                tableMinWidthClassName="min-w-[980px]"
                columns={[
                  {
                    key: "id",
                    header: "ID",
                    width: "72px",
                    cellClassName: "whitespace-nowrap text-xs theme-text-muted",
                    render: (ingredient) => `#${ingredient.id}`,
                  },
                  {
                    key: "ingredient",
                    header: "Ingrediente",
                    width: "420px",
                    render: (ingredient) => {
                      const stockOnHand =
                        stockQtyByIngredientId.get(ingredient.id) ?? 0;
                      return (
                        <div className="products-table-entity">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[15px] font-semibold theme-text-strong">
                              {ingredient.name}
                            </p>
                            <StatusBadge
                              label={getDimensionLabel(ingredient.dimension)}
                              tone={getIngredientDimensionTone(ingredient.dimension)}
                            />
                          </div>
                          <p className="products-table-entity__summary">
                            Unidad base {getUnitLabel(ingredient.defaultUnitCode)}
                          </p>
                          {selectedLocation ? (
                            <div className="products-table-meta">
                              <span className="products-table-meta__item">
                                <span className="theme-text-muted">POS</span>
                                <span className="font-medium theme-text-strong">
                                  {selectedLocation.name}
                                </span>
                              </span>
                              <span className="products-table-meta__item">
                                <span className="theme-text-muted">Stock</span>
                                <span className="font-medium theme-text-strong">
                                  {formatQty(stockOnHand)} base
                                </span>
                              </span>
                            </div>
                          ) : null}
                        </div>
                      );
                    },
                  },
                  {
                    key: "unit",
                    header: "Unidad base",
                    width: "124px",
                    cellClassName: "whitespace-nowrap",
                    render: (ingredient) => getUnitLabel(ingredient.defaultUnitCode),
                  },
                  {
                    key: "stock",
                    header: "Stock monitoreado",
                    width: "136px",
                    align: "right",
                    cellClassName: "whitespace-nowrap",
                    render: (ingredient) => (
                      <span className="products-table-price">
                        {selectedLocation
                          ? formatQty(stockQtyByIngredientId.get(ingredient.id) ?? 0)
                          : "--"}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Estado",
                    width: "132px",
                    render: (ingredient) => {
                      const stockOnHand =
                        stockQtyByIngredientId.get(ingredient.id) ?? 0;
                      const hasContext = Boolean(selectedLocation);
                      return (
                        <StatusBadge
                          label={
                            !hasContext
                              ? "Sin contexto"
                              : stockOnHand > 0
                                ? "Con stock"
                                : "Sin stock"
                          }
                          tone={
                            !hasContext
                              ? "default"
                              : stockOnHand > 0
                                ? "success"
                                : "warning"
                          }
                          className="min-w-[104px] justify-center"
                        />
                      );
                    },
                  },
                ]}
              />
            )}
            {catalogError ? (
              <FeedbackMessage tone="info" className="mt-4">
                Catalogo no disponible. Mostrando datos recuperados de la sesion y el stock.
              </FeedbackMessage>
            ) : null}
          </Card>

          <Card
            padding="none"
            glow={false}
            className="products-panel products-panel--list"
            contentClassName="products-panel__body"
          >
            <div className="products-panel__header">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="products-panel__header-copy">
                  <p className="products-panel__eyebrow">Existencias reales</p>
                  <div className="products-panel__title-row">
                    <h2 className="font-display text-2xl font-bold theme-text-strong">
                      Stock por ubicacion
                    </h2>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="products-panel__secondary"
                  onClick={() =>
                    selectedLocationId !== null && void loadStock(selectedLocationId)
                  }
                >
                  Refrescar
                </Button>
              </div>
            </div>
            <IngredientsPanelToolbar
              label="Contexto de stock"
              value={
                selectedLocation
                  ? `${filteredStockItems.length} de ${stockItems.length} items en ${selectedLocation.name}`
                  : "Selecciona una ubicacion para revisar existencias"
              }
              badges={[
                {
                  label: selectedLocation ? `POS #${selectedLocation.id}` : "Sin POS",
                  tone: selectedLocation ? "info" : "default",
                },
                {
                  label: selectedLocation
                    ? `${formatQty(totalStockBase)} base`
                    : "Sin lectura",
                  tone: stockTone,
                },
              ]}
              searchValue={stockSearchTerm}
              onSearchChange={setStockSearchTerm}
              searchPlaceholder="Buscar ingrediente"
              searchAriaLabel="Buscar en stock por ubicacion"
            />
            {loadingStock ? (
              <div className="mt-6 grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="data-list-card h-24 animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : stockItems.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin stock registrado"
                  description="Registra una entrada o ajuste para empezar a ver existencias por ubicacion."
                />
              </div>
            ) : filteredStockItems.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin coincidencias para esta busqueda"
                  description="No encontramos existencias que coincidan con el nombre del ingrediente."
                />
              </div>
            ) : (
              <CatalogItemsTable
                ariaLabel="Stock por ubicacion"
                caption="Tabla de stock por ubicacion"
                rows={filteredStockItems}
                rowKey={(item) => `${item.ingredientId}-${item.locationId}`}
                rowClassName={(item) =>
                  toNumber(item.qtyOnHandBase) <= 0 ? "opacity-85" : undefined
                }
                maxHeightClassName="max-h-[24rem]"
                tableMinWidthClassName="min-w-[960px]"
                columns={[
                  {
                    key: "id",
                    header: "ID",
                    width: "72px",
                    cellClassName: "whitespace-nowrap text-xs theme-text-muted",
                    render: (item) => `#${item.ingredientId}`,
                  },
                  {
                    key: "ingredient",
                    header: "Ingrediente",
                    width: "380px",
                    render: (item) => (
                      <div className="products-table-entity">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[15px] font-semibold theme-text-strong">
                            {item.ingredient.name}
                          </p>
                          <StatusBadge
                            label={getDimensionLabel(item.ingredient.dimension)}
                            tone={getIngredientDimensionTone(item.ingredient.dimension)}
                          />
                        </div>
                        <p className="products-table-entity__summary">
                          Unidad base {getUnitLabel(item.ingredient.defaultUnitCode)}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "location",
                    header: "Ubicacion",
                    width: "220px",
                    render: (item) => (
                      <div className="products-table-stack">
                        <p className="products-table-stack__title">{item.location.name}</p>
                        <p className="products-table-stack__detail">
                          POS #{item.location.id}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "stock",
                    header: "Stock base",
                    width: "128px",
                    align: "right",
                    cellClassName: "whitespace-nowrap",
                    render: (item) => (
                      <span className="products-table-price">
                        {formatQty(item.qtyOnHandBase)}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Estado",
                    width: "124px",
                    render: (item) => (
                      <StatusBadge
                        label={
                          toNumber(item.qtyOnHandBase) > 0
                            ? "Disponible"
                            : "Sin stock"
                        }
                        tone={
                          toNumber(item.qtyOnHandBase) > 0 ? "success" : "warning"
                        }
                        className="min-w-[104px] justify-center"
                      />
                    ),
                  },
                ]}
              />
            )}
            {stockError ? (
              <FeedbackMessage tone="error" className="mt-4">
                {stockError}
              </FeedbackMessage>
            ) : null}
          </Card>

          <Card
            padding="none"
            glow={false}
            className="products-panel products-panel--list"
            contentClassName="products-panel__body"
          >
            <div className="products-panel__header">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="products-panel__header-copy">
                  <p className="products-panel__eyebrow">Movimientos</p>
                  <div className="products-panel__title-row">
                    <h2 className="font-display text-2xl font-bold theme-text-strong">
                      Historial auditado
                    </h2>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="products-panel__secondary"
                  onClick={() =>
                    selectedLocationId !== null &&
                    void loadAdjustments(selectedLocationId)
                  }
                >
                  <ClipboardList size={16} />
                  Refrescar
                </Button>
              </div>
            </div>
            <IngredientsPanelToolbar
              label="Ventana auditada"
              value={
                selectedLocation
                  ? `${filteredAdjustmentItems.length} de ${mergedAdjustmentItems.length} movimientos recientes`
                  : "Selecciona una ubicacion para revisar auditoria"
              }
              badges={[
                {
                  label: selectedLocation ? `POS #${selectedLocation.id}` : "Sin POS",
                  tone: selectedLocation ? "info" : "default",
                },
                {
                  label: `Limite ${AUDIT_HISTORY_LIMIT}`,
                  tone: auditTone,
                },
              ]}
              searchValue={auditSearchTerm}
              onSearchChange={setAuditSearchTerm}
              searchPlaceholder="Buscar movimiento o ingrediente"
              searchAriaLabel="Buscar en historial auditado"
            />
            {loadingAdjustments ? (
              <div className="mt-6 grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="data-list-card h-28 animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : adjustmentItems.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin movimientos recientes"
                  description="Registra un movimiento para verlo aqui."
                />
              </div>
            ) : filteredAdjustmentItems.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin coincidencias para esta busqueda"
                  description="No encontramos movimientos que coincidan con ingrediente, tipo o responsable."
                />
              </div>
            ) : (
              <CatalogItemsTable
                ariaLabel="Historial de movimientos de stock"
                caption="Tabla de movimientos auditados"
                rows={filteredAdjustmentItems}
                rowKey={(item) => item.id}
                rowClassName={(item) =>
                  movementIdFromQuery === item.id
                    ? "table-row table-row-selected theme-text-strong"
                    : undefined
                }
                maxHeightClassName="max-h-[28rem]"
                tableMinWidthClassName="min-w-[1180px]"
                columns={[
                  {
                    key: "id",
                    header: "ID",
                    width: "72px",
                    cellClassName: "whitespace-nowrap text-xs theme-text-muted",
                    render: (item) => `#${item.id}`,
                  },
                  {
                    key: "movement",
                    header: "Movimiento",
                    width: "420px",
                    render: (item) => (
                      <div className="products-table-entity">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[15px] font-semibold theme-text-strong">
                            {item.ingredient.name}
                          </p>
                          {item.reasonCode ? (
                            <StatusBadge
                              label={reasonLabels[item.reasonCode]}
                              tone="info"
                            />
                          ) : null}
                        </div>
                        <p className="products-table-entity__summary">
                          {item.location.name} / {formatDate(item.createdAt)} /{" "}
                          {item.adjustedByUser.name}
                        </p>
                        {item.notes ? (
                          <p className="products-table-entity__summary">
                            {item.notes}
                          </p>
                        ) : null}
                        <div className="products-table-meta">
                          {item.supportDocument ? (
                            <span className="products-table-meta__item">
                              <span className="theme-text-muted">Doc</span>
                              <span className="font-medium theme-text-strong">
                                {item.supportDocument}
                              </span>
                            </span>
                          ) : null}
                          {item.batchNumber ? (
                            <span className="products-table-meta__item">
                              <span className="theme-text-muted">Lote</span>
                              <span className="font-medium theme-text-strong">
                                {item.batchNumber}
                              </span>
                            </span>
                          ) : null}
                          {item.unitCostAtTime !== null ? (
                            <span className="products-table-meta__item">
                              <span className="theme-text-muted">Costo</span>
                              <span className="font-medium theme-text-strong">
                                {formatCurrency(toNumber(item.unitCostAtTime))}
                              </span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "type",
                    header: "Tipo",
                    width: "132px",
                    render: (item) => (
                      <StatusBadge
                        label={movementTypeLabels[item.movementType]}
                        tone={movementTypeTones[item.movementType]}
                        className="min-w-[108px] justify-center"
                      />
                    ),
                  },
                  {
                    key: "user",
                    header: "Responsable",
                    width: "164px",
                    render: (item) => (
                      <div className="products-table-stack">
                        <p className="products-table-stack__title">
                          {item.adjustedByUser.name}
                        </p>
                        <p className="products-table-stack__detail">
                          {item.adjustedByUser.role}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "delta",
                    header: "Delta base",
                    width: "132px",
                    align: "right",
                    cellClassName: "whitespace-nowrap",
                    render: (item) => {
                      const delta = getMovementDelta(item);
                      return (
                        <span className="products-table-price">
                          {delta >= 0 ? "+" : ""}
                          {formatQty(delta)}
                        </span>
                      );
                    },
                  },
                  {
                    key: "next",
                    header: "Stock final",
                    width: "132px",
                    align: "right",
                    cellClassName: "whitespace-nowrap",
                    render: (item) => (
                      <span className="products-table-price">
                        {item.newStock === null ? "--" : formatQty(item.newStock)}
                      </span>
                    ),
                  },
                ]}
              />
            )}
            {adjustmentsError ? (
              <FeedbackMessage tone="error" className="mt-4">
                {adjustmentsError}
              </FeedbackMessage>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

type IngredientsToolbarBadge = {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

function IngredientsPanelToolbar({
  label,
  value,
  badges = [],
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar",
  searchAriaLabel,
}: {
  label: string;
  value: string;
  badges?: IngredientsToolbarBadge[];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
}) {
  const showControls = badges.length > 0 || typeof searchValue === "string";

  return (
    <div className="products-list-toolbar toolbar-shell mt-4 grid gap-3 rounded-lg px-4 py-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
      <div className="products-list-toolbar__summary">
        <p className="products-list-toolbar__label">{label}</p>
        <p className="products-list-toolbar__count">{value}</p>
      </div>
      {showControls ? (
        <div className="products-list-toolbar__controls flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
          {typeof searchValue === "string" && onSearchChange ? (
            <SearchField
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              onClear={() => onSearchChange("")}
              placeholder={searchPlaceholder}
              aria-label={searchAriaLabel ?? searchPlaceholder}
              fieldClassName="products-list-toolbar__search-field"
              className="min-h-10"
              wrapperClassName="products-list-toolbar__search w-full sm:max-w-[280px] xl:max-w-[320px]"
            />
          ) : null}
          {badges.length > 0 ? (
            <div className="products-list-toolbar__filters flex flex-wrap justify-end gap-2">
              {badges.map((badge) => (
                <StatusBadge
                  key={`${badge.label}-${badge.tone ?? "default"}`}
                  label={badge.label}
                  tone={badge.tone ?? "default"}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function getIngredientDimensionTone(dimension: IngredientDimension) {
  if (dimension === "VOLUME") return "info";
  if (dimension === "COUNT") return "success";
  return "default";
}



