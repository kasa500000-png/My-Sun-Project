import FitLogApp from "@/components/FitLogApp";
import { assertUiuxVisualAccess } from "@/lib/uiux-visual-gate";

export const dynamic = "force-dynamic";

export default async function UiuxVisualPage() {
  await assertUiuxVisualAccess();

  return (
    <>
      <style>{`
        [data-uiux-visual-capture] *,
        [data-uiux-visual-capture] *::before,
        [data-uiux-visual-capture] *::after {
          content-visibility: visible !important;
          contain-intrinsic-size: none !important;
        }
      `}</style>
      <div data-uiux-visual-capture>
        <FitLogApp userEmail="uiux.visual@example.invalid" />
      </div>
    </>
  );
}
