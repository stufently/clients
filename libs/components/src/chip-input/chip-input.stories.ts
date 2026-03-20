import { FormsModule } from "@angular/forms";
import { Meta, StoryObj, moduleMetadata } from "@storybook/angular";
import { userEvent, within } from "storybook/test";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";

import { FormFieldModule } from "../form-field";
import { I18nMockService } from "../utils/i18n-mock.service";

import { ChipInputComponent } from "./chip-input.component";

export default {
  title: "Component Library/Chip Input",
  component: ChipInputComponent,
  decorators: [
    moduleMetadata({
      imports: [FormsModule, FormFieldModule],
      providers: [
        {
          provide: I18nService,
          useFactory: () => {
            return new I18nMockService({
              removeItem: (name: string) => `Remove ${name}`,
              required: "required",
            });
          },
        },
      ],
    }),
  ],
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/design/Zt3YSeb6E6lebAffrNLa0h/Tailwind-Component-Library",
    },
  },
} as Meta<ChipInputComponent>;

type Story = StoryObj<ChipInputComponent & { value: string[] }>;

export const Default: Story = {
  render: (args) => ({
    props: {
      ...args,
    },
    template: /* html */ `
      <bit-form-field>
        <bit-label>Emails</bit-label>
        <bit-chip-input
          placeholder="Add email address..."
        ></bit-chip-input>
        <bit-hint>Type an email and press comma or Enter to add it.</bit-hint>
      </bit-form-field>
    `,
  }),
};

export const WithValues: Story = {
  render: (args) => ({
    props: {
      ...args,
    },
    template: /* html */ `
      <bit-form-field>
        <bit-label>Emails</bit-label>
        <bit-chip-input
          placeholder="Add email address..."
          [ngModel]="value"
        ></bit-chip-input>
        <bit-hint>Type an email and press comma or Enter to add it.</bit-hint>
      </bit-form-field>
    `,
  }),
  args: {
    value: ["alice@example.com", "bob@example.com", "carol@example.com"],
  },
};

export const ManyValues: Story = {
  render: (args) => ({
    props: {
      ...args,
    },
    template: /* html */ `
      <bit-form-field>
        <bit-label>Emails</bit-label>
        <bit-chip-input
          placeholder="Add email address..."
          [ngModel]="value"
        ></bit-chip-input>
      </bit-form-field>
    `,
  }),
  args: {
    value: [
      "alice@example.com",
      "bob@example.com",
      "carol@example.com",
      "dave@example.com",
      "eve@example.com",
      "frank@example.com",
      "grace@example.com",
      "heidi@example.com",
      "ivan@example.com",
      "judy@example.com",
    ],
  },
};

export const WithValidation: Story = {
  render: (args) => ({
    props: {
      ...args,
      isValidEmail: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    },
    template: /* html */ `
      <bit-form-field>
        <bit-label>Emails</bit-label>
        <bit-chip-input
          placeholder="Add email address..."
          [ngModel]="value"
          [validate]="isValidEmail"
        ></bit-chip-input>
        <bit-hint>Invalid emails are highlighted in red.</bit-hint>
      </bit-form-field>
    `,
  }),
  args: {
    value: ["alice@example.com", "not-an-email", "bob@example.com", "also-invalid"],
  },
};

export const Disabled: Story = {
  render: (args) => ({
    props: {
      ...args,
    },
    template: /* html */ `
      <bit-form-field>
        <bit-label>Emails</bit-label>
        <bit-chip-input
          placeholder="Add email address..."
          [ngModel]="value"
          disabled
        ></bit-chip-input>
      </bit-form-field>
    `,
  }),
  args: {
    value: ["alice@example.com", "bob@example.com"],
  },
};

export const WithTyping: Story = {
  render: (args) => ({
    props: {
      ...args,
    },
    template: /* html */ `
      <bit-form-field>
        <bit-label>Emails</bit-label>
        <bit-chip-input
          placeholder="Add email address..."
          [ngModel]="value"
        ></bit-chip-input>
        <bit-hint>Type an email and press comma or Enter to add it.</bit-hint>
      </bit-form-field>
    `,
  }),
  args: {
    value: ["alice@example.com"],
  },
  play: async (context) => {
    const canvas = context.canvasElement;
    const input = within(canvas).getByRole("textbox");
    await userEvent.click(input);
    await userEvent.type(input, "bob@example.com,");
  },
};
