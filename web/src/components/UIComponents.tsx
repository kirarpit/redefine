import { FC, ReactNode } from "react";

// Card component for containing content with optional title
type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export const Card: FC<CardProps> = ({ title, children, className = "" }) => (
  <div
    className={`bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md p-4 ${className}`}
  >
    {title && (
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {title}
      </h4>
    )}
    {children}
  </div>
);

// Button component with variant support
type ButtonProps = {
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
  className?: string;
};

export const Button: FC<ButtonProps> = ({
  onClick,
  disabled = false,
  variant = "primary",
  children,
  className = "",
}) => {
  const baseStyles =
    "rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary:
      "bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-500",
    secondary:
      "bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200",
    danger:
      "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// Section component for layout
type SectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export const Section: FC<SectionProps> = ({ title, description, children }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {description}
        </p>
      )}
      {children}
    </div>
  </div>
);

// Toggle component for on/off settings
type ToggleProps = {
  label: string;
  id: string;
  defaultChecked?: boolean;
};

export const Toggle: FC<ToggleProps> = ({ label, id, defaultChecked }) => (
  <div className="flex items-center justify-between">
    <label className="text-sm text-gray-700 dark:text-gray-300">{label}</label>
    <div className="relative inline-block w-10 mr-2 align-middle select-none">
      <input
        type="checkbox"
        name="toggle"
        id={id}
        className="absolute block w-6 h-6 bg-white dark:bg-gray-600 rounded-full border-4 appearance-none cursor-pointer checked:right-0 checked:border-blue-500 dark:checked:border-blue-400 transition-all duration-200"
        defaultChecked={defaultChecked}
      />
      <label
        htmlFor={id}
        className="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"
      />
    </div>
  </div>
);
