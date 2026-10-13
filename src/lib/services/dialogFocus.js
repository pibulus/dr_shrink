import { tick } from "svelte";

/** Focus and keyboard containment shared by the three dialog designs. */
export function dialogFocus(node) {
  const previous = document.activeElement;
  let mounted = true;
  tick().then(() => {
    if (mounted) node.focus();
  });
  function onKeydown(event) {
    if (event.key !== "Tab") return;
    const controls = [
      ...node.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
      ),
    ].filter((el) => el.getClientRects().length);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first) {
      event.preventDefault();
      node.focus();
    } else if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === node)
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || document.activeElement === node)
    ) {
      event.preventDefault();
      first.focus();
    }
  }
  node.addEventListener("keydown", onKeydown);
  return {
    destroy() {
      mounted = false;
      node.removeEventListener("keydown", onKeydown);
      if (previous?.isConnected) previous.focus?.();
    },
  };
}
