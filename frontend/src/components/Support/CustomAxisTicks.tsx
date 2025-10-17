import React from 'react';

/**
 * Custom Axis Tick Components for Multi-Row Label Support
 *
 * These components enable multi-line text rendering in Recharts x-axis labels,
 * solving overflow issues on laptop breakpoints by intelligently wrapping long text.
 *
 * Features:
 * - Automatic word breaking at spaces and hyphens
 * - Configurable maximum characters per line
 * - Consistent -45° rotation for diagonal label display
 * - SVG <tspan> elements for proper vertical spacing
 * - Readable font size (14px) optimized for clarity
 */

/**
 * CustomMonthTick - Renders month abbreviations (3 letters)
 *
 * Used in Category Breakdown monthly chart for rendering short month names
 * like "May", "Jun", "Jul", etc. These are typically short enough for single
 * lines, but the component maintains consistency with multi-line approach.
 *
 * @example
 * <XAxis dataKey="month" tick={<CustomMonthTick />} height={100} />
 */
interface MonthTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
}

export const CustomMonthTick: React.FC<MonthTickProps> = ({ x = 0, y = 0, payload }) => {
  if (!payload?.value) return null;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#374151"
        fontSize={14}
        transform="rotate(-45)"
      >
        {payload.value}
      </text>
    </g>
  );
};

/**
 * CustomCategoryTick - Renders category names with automatic line breaking
 *
 * Intelligently splits long text (>maxCharsPerLine) into multiple lines at
 * natural break points (spaces or hyphens). This is essential for category
 * names like "Non-billable" which would otherwise overflow the chart container.
 *
 * Algorithm:
 * 1. If text <= maxCharsPerLine: render as single line
 * 2. If text > maxCharsPerLine: split at spaces/hyphens
 * 3. Build lines incrementally, breaking when threshold exceeded
 * 4. Render each line as separate <tspan> with proper vertical spacing
 *
 * @param maxCharsPerLine - Maximum characters before line break (default: 10)
 *
 * @example
 * // "Non-billable" becomes:
 * // Line 1: "Non-"
 * // Line 2: "billable"
 * <XAxis dataKey="name" tick={<CustomCategoryTick maxCharsPerLine={10} />} height={120} />
 */
interface CategoryTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  maxCharsPerLine?: number;
}

export const CustomCategoryTick: React.FC<CategoryTickProps> = ({
  x = 0,
  y = 0,
  payload,
  maxCharsPerLine = 10,
}) => {
  if (!payload?.value) return null;

  const text = payload.value;

  // Split text into lines intelligently
  const lines: string[] = [];

  if (text.length <= maxCharsPerLine) {
    // Short text - single line
    lines.push(text);
  } else {
    // Long text - split at hyphen or space
    const words = text.split(/(\s|-)/); // Split but keep delimiters
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + word;
      if (testLine.length > maxCharsPerLine && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word.trim();
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        textAnchor="end"
        fill="#374151"
        fontSize={14}
        transform="rotate(-45)"
      >
        {lines.map((line, index) => (
          <tspan
            key={index}
            x={0}
            dy={index === 0 ? 16 : 12} // First line: 16px offset, subsequent: 12px spacing
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

/**
 * Usage Examples:
 *
 * // Monthly Chart (Category Breakdown):
 * <XAxis
 *   dataKey="month"
 *   tick={<CustomMonthTick />}
 *   height={100}
 *   interval={0}
 * />
 *
 * // Category Chart (Single Period):
 * <XAxis
 *   dataKey="name"
 *   tick={<CustomCategoryTick maxCharsPerLine={10} />}
 *   height={120}
 *   interval={0}
 * />
 *
 * // Category Distribution Chart:
 * <XAxis
 *   type="category"
 *   dataKey="name"
 *   tick={<CustomCategoryTick maxCharsPerLine={10} />}
 *   height={120}
 *   interval={0}
 * />
 */
