"use client";
import React, { useMemo, type JSX } from "react";
import { motion } from "framer-motion";
import { cn } from "@workspace/ui/lib/utils";

export type ColorVariant =
  | "default"
  | "purple"
  | "blue"
  | "green"
  | "red"
  | "orange"
  | "pink"
  | "custom";

export type SizeVariant = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";

export interface TextShimmerProps {
  children: string;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  spread?: number;
  color?: ColorVariant;
  size?: SizeVariant;
  flip?: boolean;
  customColors?: {
    baseColor?: string;
    shimmerColor?: string;
  };
}

const getColorVariables = (color: ColorVariant = "default") => {
  const colorMap = {
    default: {
      lightBaseColor: "#a1a1aa",
      lightShimmerColor: "#000000",
      darkBaseColor: "#71717a",
      darkShimmerColor: "#ffffff",
    },
    purple: {
      lightBaseColor: "#c4b5fd",
      lightShimmerColor: "#7c3aed",
      darkBaseColor: "#8b5cf6",
      darkShimmerColor: "#e9d5ff",
    },
    blue: {
      lightBaseColor: "#93c5fd",
      lightShimmerColor: "#2563eb",
      darkBaseColor: "#60a5fa",
      darkShimmerColor: "#dbeafe",
    },
    green: {
      lightBaseColor: "#86efac",
      lightShimmerColor: "#16a34a",
      darkBaseColor: "#4ade80",
      darkShimmerColor: "#dcfce7",
    },
    red: {
      lightBaseColor: "#fca5a5",
      lightShimmerColor: "#dc2626",
      darkBaseColor: "#f87171",
      darkShimmerColor: "#fee2e2",
    },
    orange: {
      lightBaseColor: "#fdba74",
      lightShimmerColor: "#ea580c",
      darkBaseColor: "#fb923c",
      darkShimmerColor: "#fed7aa",
    },
    pink: {
      lightBaseColor: "#f9a8d4",
      lightShimmerColor: "#db2777",
      darkBaseColor: "#f472b6",
      darkShimmerColor: "#fce7f3",
    },
    custom: {
      lightBaseColor: "#a1a1aa",
      lightShimmerColor: "#000000",
      darkBaseColor: "#71717a",
      darkShimmerColor: "#ffffff",
    },
  };

  return colorMap[color];
};

const getSizeClasses = (size: SizeVariant = "base") => {
  const sizeMap = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
  };

  return sizeMap[size];
};

/**
 * Enhanced TextShimmer component with flexible color and size options
 *
 * @example
 * // Basic usage (backward compatible)
 * <TextShimmer>Hello World</TextShimmer>
 *
 * @example
 * // With color and size
 * <TextShimmer color="purple" size="lg">Loading...</TextShimmer>
 *
 * @example
 * // With flipped colors (inverted light/dark)
 * <TextShimmer color="blue" flip>Inverted Style</TextShimmer>
 *
 * @example
 * // With custom colors
 * <TextShimmer
 *   color="custom"
 *   customColors={{ baseColor: "#ff0000", shimmerColor: "#ffffff" }}
 * >
 *   Custom Colors
 * </TextShimmer>
 */
export function TextShimmer({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
  color = "default",
  size = "base",
  flip = false,
  customColors,
}: TextShimmerProps) {
  const MotionComponent = motion(Component as keyof JSX.IntrinsicElements);

  const dynamicSpread = useMemo(() => {
    return children.length * spread;
  }, [children, spread]);

  const colorVariables = getColorVariables(color);
  const sizeClass = getSizeClasses(size);

  const shimmerStyles = useMemo(() => {
    // Apply flip logic - swap light and dark colors when flip is true
    const lightBase = flip
      ? colorVariables.darkBaseColor
      : colorVariables.lightBaseColor;
    const lightShimmer = flip
      ? colorVariables.darkShimmerColor
      : colorVariables.lightShimmerColor;
    const darkBase = flip
      ? colorVariables.lightBaseColor
      : colorVariables.darkBaseColor;
    const darkShimmer = flip
      ? colorVariables.lightShimmerColor
      : colorVariables.darkShimmerColor;

    const baseStyles: React.CSSProperties & Record<string, string> = {
      "--spread": `${dynamicSpread}px`,
      "--light-base-color": lightBase,
      "--light-shimmer-color": lightShimmer,
      "--dark-base-color": darkBase,
      "--dark-shimmer-color": darkShimmer,
    };

    // Override with custom colors if provided
    if (color === "custom" && customColors) {
      if (customColors.baseColor) {
        baseStyles["--light-base-color"] = customColors.baseColor;
        baseStyles["--dark-base-color"] = customColors.baseColor;
      }
      if (customColors.shimmerColor) {
        baseStyles["--light-shimmer-color"] = customColors.shimmerColor;
        baseStyles["--dark-shimmer-color"] = customColors.shimmerColor;
      }
    }

    return baseStyles;
  }, [dynamicSpread, colorVariables, flip, color, customColors]);

  return (
    <MotionComponent
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        // Light mode gradient
        "[background-image:linear-gradient(90deg,transparent_calc(50%-var(--spread)),var(--light-shimmer-color),transparent_calc(50%+var(--spread))),linear-gradient(var(--light-base-color),var(--light-base-color))]",
        // Dark mode gradient
        "dark:[background-image:linear-gradient(90deg,transparent_calc(50%-var(--spread)),var(--dark-shimmer-color),transparent_calc(50%+var(--spread))),linear-gradient(var(--dark-base-color),var(--dark-base-color))]",
        "[background-repeat:no-repeat,padding-box]",
        sizeClass,
        className
      )}
      initial={{ backgroundPosition: "100% center" }}
      animate={{ backgroundPosition: "0% center" }}
      transition={{
        repeat: Infinity,
        duration,
        ease: "linear",
      }}
      style={shimmerStyles}
    >
      {children}
    </MotionComponent>
  );
}
