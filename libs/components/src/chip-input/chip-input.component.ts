import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Optional,
  Self,
  booleanAttribute,
  computed,
  input,
  signal,
  viewChild,
} from "@angular/core";
import { ControlValueAccessor, NgControl, Validators } from "@angular/forms";

import { I18nPipe } from "@bitwarden/ui-common";

import { BitFormFieldControl } from "../form-field/form-field-control";
import { FocusableElement } from "../shared/focusable-element";

let nextId = 0;

/**
 * `<bit-chip-input>` renders a list of text chips with an inline input for adding new entries.
 * Comma or Enter key separates entries; backspace on an empty input removes the last chip.
 *
 * Implements `ControlValueAccessor` (value type: `string[]`) and `BitFormFieldControl` so it can
 * be nested inside `<bit-form-field>`.
 */
@Component({
  selector: "bit-chip-input",
  templateUrl: "chip-input.component.html",
  imports: [I18nPipe],
  providers: [
    { provide: BitFormFieldControl, useExisting: ChipInputComponent },
    { provide: FocusableElement, useExisting: ChipInputComponent },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipInputComponent
  implements ControlValueAccessor, BitFormFieldControl, FocusableElement
{
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>("inputRef");

  /** BitFormFieldControl */
  readonly id = signal(`bit-chip-input-${nextId++}`);
  readonly ariaDescribedBy?: string;
  readonly readOnly = false;
  // type and spellcheck are optional on BitFormFieldControl

  get labelForId(): string {
    return this.id();
  }

  get required(): boolean {
    return this.ngControl?.control?.hasValidator(Validators.required) ?? false;
  }

  get hasError(): boolean {
    return !!(this.ngControl?.status === "INVALID" && this.ngControl?.touched);
  }

  get error(): [string, any] {
    const errors = this.ngControl?.errors ?? {};
    const key = Object.keys(errors)[0];
    return [key, errors[key]];
  }

  focus(): void {
    this.inputRef()?.nativeElement.focus();
  }

  /** FocusableElement */
  getFocusTarget(): HTMLElement | undefined {
    return this.inputRef()?.nativeElement;
  }

  /** Placeholder text shown in the input when no chips are present */
  readonly placeholder = input<string>("");

  protected readonly disabledInput = input<boolean, unknown>(false, {
    alias: "disabled",
    transform: booleanAttribute,
  });

  private readonly disabledState = signal(false);

  readonly disabled = computed(() => this.disabledInput() || this.disabledState());

  protected readonly chips = signal<string[]>([]);

  protected readonly inputValue = "";

  constructor(@Optional() @Self() private readonly ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  protected addChip(value: string): void {
    const trimmed = value.trim();
    if (!trimmed || this.chips().includes(trimmed)) {
      this.inputValue = "";
      return;
    }
    this.chips.update((chips) => [...chips, trimmed]);
    this.inputValue = "";
    this.notifyOnChange?.(this.chips());
  }

  protected removeChip(index: number): void {
    this.chips.update((chips) => chips.filter((_, i) => i !== index));
    this.notifyOnChange?.(this.chips());
  }

  protected onInput(event: Event): void {
    this.inputValue = (event.target as HTMLInputElement).value;
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === "," || event.key === "Enter") {
      event.preventDefault();
      this.addChip(this.inputValue);
    } else if (event.key === "Backspace" && !this.inputValue) {
      this.chips.update((chips) => chips.slice(0, -1));
      this.notifyOnChange?.(this.chips());
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData("text") ?? "";
    pastedText.split(",").forEach((value) => this.addChip(value));
  }

  protected onBlur(): void {
    if (this.inputValue.trim()) {
      this.addChip(this.inputValue);
    }
    this.notifyOnTouched?.();
  }

  /** ControlValueAccessor */

  private readonly notifyOnChange?: (value: string[]) => void;
  private readonly notifyOnTouched?: () => void;

  writeValue(values: string[]): void {
    this.chips.set(Array.isArray(values) ? values : []);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.notifyOnChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.notifyOnTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledState.set(isDisabled);
  }
}
