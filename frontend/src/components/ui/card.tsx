import React from "react";
import classNames from "classnames";

export const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={classNames(
        "bg-white shadow-xl rounded-2xl p-8 w-full max-w-md mx-auto transition-all duration-300",
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <div className={classNames("space-y-6", className)}>{children}</div>;
};
