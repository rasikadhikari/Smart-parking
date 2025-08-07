import React from "react";
import { Link, LinkProps } from "react-router-dom";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

interface DottedButtonProps extends ButtonProps {
  to?: string;
  children: React.ReactNode;
}

const DottedButton: React.FC<DottedButtonProps> = ({
  to,
  children,
  ...props
}) => {
  const className =
    "rounded-2xl border-2 border-dashed border-blue-500 bg-white px-6 py-3 font-semibold uppercase text-blue-800 transition-all duration-300 hover:translate-x-[-4px] hover:translate-y-[-4px] hover:rounded-md hover:shadow-[4px_4px_0px_blue] active:translate-x-[0px] active:translate-y-[0px] active:rounded-2xl active:shadow-none";

  if (to) {
    // Only include props that are valid for <Link>
    const linkProps: LinkProps = { to };
    return (
      <Link {...linkProps} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button className={className} {...props}>
      {children}
    </button>
  );
};

export { DottedButton };
