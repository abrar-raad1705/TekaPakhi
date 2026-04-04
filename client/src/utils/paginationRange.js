/**
 * Generates a smart array of page numbers with ellipsis markers.
 * Example: [1, '…', 4, 5, 6, '…', 10]
 *
 * @param {number} current - Current page (1-indexed)
 * @param {number} total   - Total number of pages
 * @param {number} siblings - How many page numbers to show on each side of current
 * @returns {(number|string)[]}
 */
export function getPaginationRange(current, total, siblings = 1) {
  // If total pages is small enough, show all
  const totalPageNumbers = siblings * 2 + 5; // siblings + first + last + current + 2 ellipses
  if (total <= totalPageNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(current - siblings, 1);
  const rightSibling = Math.min(current + siblings, total);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftCount = 3 + 2 * siblings;
    const leftRange = Array.from({ length: leftCount }, (_, i) => i + 1);
    return [...leftRange, '…', total];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightCount = 3 + 2 * siblings;
    const rightRange = Array.from({ length: rightCount }, (_, i) => total - rightCount + i + 1);
    return [1, '…', ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSibling - leftSibling + 1 },
    (_, i) => leftSibling + i
  );
  return [1, '…', ...middleRange, '…', total];
}
