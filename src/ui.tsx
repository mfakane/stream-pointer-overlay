import { createContext, type JSX } from "preact";
import { useContext, useId } from "preact/hooks";
export function Button(
  { variant = "primary", ...props }:
    & JSX.ButtonHTMLAttributes<HTMLButtonElement>
    & {
      variant?: string;
    },
) {
  return (
    <button
      type="button"
      data-slot="button"
      data-variant={variant}
      {...props}
    />
  );
}
export function Input(
  { onChange, ...props }: JSX.InputHTMLAttributes<HTMLInputElement>,
) {
  return <input data-slot="input" {...props} onInput={onChange} />;
}
const RadioContext = createContext({
  value: "",
  name: "",
  change: (_value: string) => {},
});
export function RadioGroup(
  { value, onValueChange, children, ...props }:
    & Omit<JSX.HTMLAttributes<HTMLDivElement>, "value">
    & { value: string; onValueChange: (value: string) => void },
) {
  const name = useId();
  return (
    <RadioContext.Provider value={{ value, name, change: onValueChange }}>
      <div role="radiogroup" {...props}>{children}</div>
    </RadioContext.Provider>
  );
}
export function RadioGroupItem(
  { value, ...props }:
    & Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "value">
    & { value: string },
) {
  const group = useContext(RadioContext);
  return (
    <input
      {...props}
      data-slot="radio-group-item"
      data-checked={group.value === value ? true : undefined}
      type="radio"
      name={group.name}
      value={value}
      checked={group.value === value}
      onChange={() => group.change(value)}
    />
  );
}
export function Slider(
  { value, onValueChange, ...props }:
    & Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "value">
    & { value: number[]; onValueChange: (value: number[]) => void },
) {
  return (
    <input
      {...props}
      data-slot="slider"
      type="range"
      value={value[0]}
      onInput={(e) => onValueChange([Number(e.currentTarget.value)])}
    />
  );
}
