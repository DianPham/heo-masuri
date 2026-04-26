export function signalPushEligible() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("push-eligible"));
}
