import { FormsModule } from "@angular/forms";
import { Meta, StoryObj, moduleMetadata } from "@storybook/angular";
import { getAllByRole, userEvent } from "storybook/test";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";

import { MenuModule } from "../../menu";
import { I18nMockService } from "../../utils/i18n-mock.service";
import { fullWidthArgType, sharedArgTypes } from "../shared/shared-story-arg-types";

import { ChipFilterComponent } from "./chip-filter.component";

export default {
  title: "Component Library/Chips/Chip Filter",
  component: ChipFilterComponent,
  decorators: [
    moduleMetadata({
      imports: [MenuModule, FormsModule],
      providers: [
        {
          provide: I18nService,
          useFactory: () => {
            return new I18nMockService({
              viewItemsIn: (name) => `View items in ${name}`,
              back: "Back",
              backTo: (name) => `Back to ${name}`,
              removeItem: (name) => `Remove ${name}`,
            });
          },
        },
      ],
    }),
  ],
  argTypes: {
    ...sharedArgTypes,
    ...fullWidthArgType,
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/design/Zt3YSeb6E6lebAffrNLa0h/Tailwind-Component-Library?node-id=16329-29548&t=b5tDKylm5sWm2yKo-4",
    },
  },
} as Meta;

type Story = StoryObj<ChipFilterComponent & { value: any }>;

export const Default: Story = {
  render: (args) => ({
    props: {
      ...args,
    },
    template: /* html */ `
      <bit-chip-filter
        placeholderText="Folder"
        placeholderIcon="bwi-folder"
        [options]="options"
        [disabled]="disabled"
      ></bit-chip-filter>
      <bit-chip-filter
        placeholderText="Folder"
        placeholderIcon="bwi-folder"
        [options]="options"
        [ngModel]="value"
        [disabled]="disabled"
      ></bit-chip-filter>
    `,
  }),
  args: {
    options: [
      {
        label: "Foo",
        value: "foo",
        icon: "bwi-folder",
      },
      {
        label: "Bar",
        value: "bar",
        icon: "bwi-exclamation-triangle",
        iconClass: "tw-text-danger",
      },
      {
        label: "Baz",
        value: "baz",
        disabled: true,
      },
    ],
    value: "foo",
  },
};

export const MenuOpen: Story = {
  render: (args) => ({
    props: {
      ...args,
    },
    template: /* html */ `
      <bit-chip-filter
        placeholderText="Folder"
        placeholderIcon="bwi-folder"
        [options]="options"
        [ngModel]="value"
      ></bit-chip-filter>
    `,
  }),
  args: {
    options: [
      {
        label: "Foo",
        value: "foo",
        icon: "bwi-folder",
      },
      {
        label: "Bar",
        value: "bar",
        icon: "bwi-exclamation-triangle",
        iconClass: "tw-text-danger",
      },
      {
        label: "Baz",
        value: "baz",
        disabled: true,
      },
    ],
  },
  play: async (context) => {
    const canvas = context.canvasElement;
    const buttons = getAllByRole(canvas, "button");
    await userEvent.click(buttons[0]);
  },
};

export const FullWidth: Story = {
  render: (args) => ({
    props: {
      ...args,
    },
    template: /* html */ `
      <bit-chip-filter
        placeholderText="Folder"
        placeholderIcon="bwi-folder"
        [options]="options"
        [ngModel]="value"
        fullWidth
      ></bit-chip-filter>
    `,
  }),
  args: {
    options: [
      {
        label: "Foo",
        value: "foo",
        icon: "bwi-folder",
      },
      {
        label: "Bar",
        value: "bar",
        icon: "bwi-exclamation-triangle",
        iconClass: "tw-text-danger",
      },
      {
        label: "Baz",
        value: "baz",
        disabled: true,
      },
    ],
  },
};

export const NestedOptions: Story = {
  ...Default,
  args: {
    options: [
      {
        label: "Foo",
        value: "foo",
        icon: "bwi-folder",
        children: [
          {
            label: "Foo1 very long name of folder but even longer than you thought",
            value: "foo1",
            icon: "bwi-folder",
            children: [
              {
                label: "Foo2",
                value: "foo2",
                icon: "bwi-folder",
                children: [
                  {
                    label: "Foo3",
                    value: "foo3",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        label: "Bar",
        value: "bar",
        icon: "bwi-folder",
      },
      {
        label: "Baz",
        value: "baz",
        icon: "bwi-folder",
      },
    ],
    value: "foo1",
  },
};

export const TextOverflow: Story = {
  ...Default,
  args: {
    options: [
      {
        label: "Fooooooooooooooooooooooooooooooooooooooooooooo",
        value: "foo",
      },
    ],
    value: "foo",
  },
};

export const Inactive: Story = {
  render: (args) => ({
    props: {
      ...args,
    },
    template: /* html */ `
      <bit-chip-filter
        placeholderText="Folder"
        placeholderIcon="bwi-folder"
        [options]="options"
        disabled
      ></bit-chip-filter>
      <bit-chip-filter
        placeholderText="Folder"
        placeholderIcon="bwi-folder"
        [options]="options"
        [ngModel]="value"
        disabled
      ></bit-chip-filter>
    `,
  }),
  args: {
    options: [
      {
        label: "Foo",
        value: "foo",
        icon: "bwi-folder",
      },
    ],
    value: "foo",
  },
};

export const InteractionStates: Story = {
  render: (args) => ({
    props: {
      ...args,
    },
    template: /* html */ `
      <div class="tw-flex tw-flex-col tw-gap-6">
        <div class="tw-flex tw-items-center tw-gap-6">
          <span class="tw-text-sm tw-text-fg-body tw-w-24">Default</span>
          <bit-chip-filter
            placeholderText="Folder"
            placeholderIcon="bwi-folder"
            [options]="options"
            [disabled]="disabled"
          ></bit-chip-filter>
          <bit-chip-filter
            placeholderText="Folder"
            placeholderIcon="bwi-folder"
            [options]="options"
            [ngModel]="value"
            [disabled]="disabled"
          ></bit-chip-filter>
        </div>

        <div class="tw-flex tw-items-center tw-gap-6">
          <span class="tw-text-sm tw-text-fg-body tw-w-24">Hover</span>
          <bit-chip-filter
            placeholderText="Folder"
            placeholderIcon="bwi-folder"
            [options]="options"
            [disabled]="disabled"
            class="tw-test-has-button-hover-not-bit-chip-dismiss-button"
          ></bit-chip-filter>
          <bit-chip-filter
            placeholderText="Folder"
            placeholderIcon="bwi-folder"
            [options]="options"
            [ngModel]="value"
            [disabled]="disabled"
            class="tw-test-has-button-hover-not-bit-chip-dismiss-button"
          ></bit-chip-filter>
        </div>

        <div class="tw-flex tw-items-center tw-gap-6">
          <span class="tw-text-sm tw-text-fg-body tw-w-24">Focus</span>
          <bit-chip-filter
            placeholderText="Folder"
            placeholderIcon="bwi-folder"
            [options]="options"
            [disabled]="disabled"
            class="tw-test-has-button-focus-visible-not-bit-chip-dismiss-button tw-test-has-focus-visible-not-bit-chip-dismiss-button"
          ></bit-chip-filter>
          <bit-chip-filter
            placeholderText="Folder"
            placeholderIcon="bwi-folder"
            [options]="options"
            [ngModel]="value"
            [disabled]="disabled"
            class="tw-test-has-button-focus-visible-not-bit-chip-dismiss-button tw-test-has-focus-visible-not-bit-chip-dismiss-button"
          ></bit-chip-filter>
        </div>
      </div>
    `,
  }),
  args: {
    options: [
      {
        label: "Foo",
        value: "foo",
        icon: "bwi-folder",
      },
      {
        label: "Bar",
        value: "bar",
        icon: "bwi-exclamation-triangle",
        iconClass: "tw-text-danger",
      },
      {
        label: "Baz",
        value: "baz",
        disabled: true,
      },
    ],
    value: "foo",
  },
  parameters: {
    chromatic: {
      modes: {
        light: { theme: "light" },
        dark: { theme: "dark" },
      },
    },
  },
  // play: async (context) => {
  //   const canvas = context.canvas;
  //   const hoverChip = await canvas.findByTestId("hover-chip-story");

  //   const hoverChipButtonEl = hoverChip.querySelector("button[bit-chip-content]");

  //   if (!hoverChipButtonEl) {
  //     //eslint-disable-next-line
  //     console.error("sad");
  //     return;
  //   }

  //   hoverChipButtonEl.classList.add("tw-test-hover");
  // },
};
