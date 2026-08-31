"use client";

import { useEffect } from "react";

const SCROLLABLE_SELECTOR = '[class*="overflow-x-auto"]';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function restoreManagedAttributes(element: HTMLElement) {
  if (element.dataset.mysunScrollTabindex === "true") {
    element.removeAttribute("tabindex");
    delete element.dataset.mysunScrollTabindex;
  }
  if (element.dataset.mysunScrollRole === "true") {
    element.removeAttribute("role");
    delete element.dataset.mysunScrollRole;
  }
  if (element.dataset.mysunScrollLabel === "true") {
    element.removeAttribute("aria-label");
    delete element.dataset.mysunScrollLabel;
  }
  delete element.dataset.mysunScrollAccess;
}

function updateScrollableRegion(element: HTMLElement) {
  const hasHorizontalOverflow = element.scrollWidth > element.clientWidth + 2;
  const hasFocusableChild = Boolean(element.querySelector(FOCUSABLE_SELECTOR));

  if (!hasHorizontalOverflow || hasFocusableChild) {
    restoreManagedAttributes(element);
    return;
  }

  element.dataset.mysunScrollAccess = "true";

  if (!element.hasAttribute("tabindex")) {
    element.tabIndex = 0;
    element.dataset.mysunScrollTabindex = "true";
  }
  if (!element.hasAttribute("role")) {
    element.setAttribute("role", "region");
    element.dataset.mysunScrollRole = "true";
  }
  if (!element.hasAttribute("aria-label") && !element.hasAttribute("aria-labelledby")) {
    element.setAttribute("aria-label", "가로로 스크롤할 수 있는 항목 목록");
    element.dataset.mysunScrollLabel = "true";
  }
}

export default function ScrollableRegionAccessBridge() {
  useEffect(() => {
    let frame = 0;

    const scan = () => {
      frame = 0;
      document.querySelectorAll<HTMLElement>(SCROLLABLE_SELECTOR).forEach(updateScrollableRegion);
    };

    const scheduleScan = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(scan);
    };

    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"],
    });

    window.addEventListener("resize", scheduleScan);
    scheduleScan();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleScan);
      if (frame) window.cancelAnimationFrame(frame);
      document
        .querySelectorAll<HTMLElement>('[data-mysun-scroll-access="true"]')
        .forEach(restoreManagedAttributes);
    };
  }, []);

  return null;
}
