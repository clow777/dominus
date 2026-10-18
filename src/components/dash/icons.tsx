import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const ZapIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </Icon>
);
export const DollarIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 2v20M17 6.5C16 5.3 14.2 4.5 12 4.5c-2.8 0-4.5 1.3-4.5 3.2 0 4.3 9.5 2.1 9.5 6.6 0 2-1.9 3.4-5 3.4-2.4 0-4.4-.9-5.5-2.4" />
  </Icon>
);
export const CartIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
    <path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H6" />
  </Icon>
);
export const TargetIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </Icon>
);
export const KebabIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
  </Icon>
);
export const TrendUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m3 17 6-6 4 4 8-8M15 7h6v6" />
  </Icon>
);
export const TrendDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m3 7 6 6 4-4 8 8M15 17h6v-6" />
  </Icon>
);
