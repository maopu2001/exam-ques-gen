/**
 * Calculates standard 2x1 folded booklet page signature ordering
 * for any number of pages.
 */
export function getBookletOrder(numPages: number): (number | null)[] {
  const total = Math.ceil(numPages / 4) * 4;
  const pages: (number | null)[] = Array.from({ length: numPages }, (_, i) => i + 1);
  while (pages.length < total) {
    pages.push(null);
  }

  const order: (number | null)[] = [];
  const sheets = total / 4;

  for (let s = 0; s < sheets; s++) {
    const pLast = pages[total - 1 - 2 * s];
    const pFirst = pages[2 * s];
    const pSecond = pages[2 * s + 1];
    const pThird = pages[total - 2 - 2 * s];
    order.push(pLast, pFirst, pSecond, pThird);
  }

  return order;
}

export function formatBookletOrderForLatex(numPages: number): string {
  const order = getBookletOrder(numPages);
  const formatted = order.map((p) => (p === null ? "{}" : String(p)));
  return "{" + formatted.join(", ") + "}";
}
