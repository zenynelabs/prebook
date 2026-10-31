const PAGE_REVEALED = "prebooking:revealed";

/** Marks the first page load as revealed; hero intros waiting on it start now. */
export function revealPage() {
  document.documentElement.dataset.revealed = "";
  window.dispatchEvent(new Event(PAGE_REVEALED));
}

/** Runs `callback` once the loader lifts, or immediately after client navigation. */
export function onPageReveal(callback: () => void) {
  if (document.documentElement.dataset.revealed !== undefined) {
    callback();
    return () => {};
  }
  window.addEventListener(PAGE_REVEALED, callback, { once: true });
  return () => window.removeEventListener(PAGE_REVEALED, callback);
}
