"use client";

const SIDES = ["marginTop", "marginRight", "marginBottom", "marginLeft"] as const;
const PADDING_SIDES = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"] as const;
const SIDE_LABELS: Record<string, string> = {
  marginTop: "Cima",
  marginRight: "Dir",
  marginBottom: "Baixo",
  marginLeft: "Esq",
  paddingTop: "Cima",
  paddingRight: "Dir",
  paddingBottom: "Baixo",
  paddingLeft: "Esq",
};

export type BoxSides = {
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
};

type Props = {
  label: string;
  values: BoxSides;
  onChange: (values: BoxSides) => void;
  sides?: readonly string[];
  min?: number;
  max?: number;
};

const DEFAULT_SIDES = [...SIDES];
const PADDING_ONLY = [...PADDING_SIDES];
const MARGIN_ONLY = [...SIDES];

export function BoxModelInput({
  label,
  values,
  onChange,
  sides = DEFAULT_SIDES,
  min = 0,
  max = 48,
}: Props) {
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n)));

  const handleChange = (side: string, raw: string) => {
    const num = raw === "" ? undefined : clamp(Number(raw) || 0);
    onChange({ ...values, [side]: num });
  };

  return (
    <div className="space-y-2">
      <span className="block text-slate-300 text-sm font-medium">{label}</span>
      <div className="grid grid-cols-4 gap-2">
        {sides.map((side) => (
          <label key={side} className="flex flex-col gap-0.5 text-xs text-slate-400">
            {SIDE_LABELS[side] ?? side}
            <input
              type="number"
              min={min}
              max={max}
              className="w-full rounded border border-slate-600 bg-slate-800 text-slate-200 px-2 py-1 text-sm"
              value={values[side as keyof BoxSides] ?? ""}
              onChange={(e) => handleChange(side, e.target.value)}
              placeholder="0"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function MarginBoxModelInput(
  props: Omit<Props, "sides"> & { sides?: readonly string[] }
) {
  return <BoxModelInput {...props} sides={props.sides ?? MARGIN_ONLY} />;
}

export function PaddingBoxModelInput(
  props: Omit<Props, "sides"> & { sides?: readonly string[] }
) {
  return <BoxModelInput {...props} sides={props.sides ?? PADDING_ONLY} />;
}
