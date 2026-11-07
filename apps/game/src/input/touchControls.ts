/** Pointer-based mobile movement joystick for AKWANTUO. */
export function installTouchControls(
  joystick: HTMLElement | null,
  joystickStick: HTMLElement | null,
  touchInput: { x: number; z: number }
): void {
  if (!joystick || !joystickStick) return;

  const resetStick = (): void => {
    touchInput.x = 0;
    touchInput.z = 0;
    joystickStick.style.transform = "translate(0, 0)";
  };

  const updateStick = (event: PointerEvent): void => {
    const bounds = joystick.getBoundingClientRect();
    const centreX = bounds.left + bounds.width / 2;
    const centreY = bounds.top + bounds.height / 2;
    const max = bounds.width * 0.31;
    const dx = event.clientX - centreX;
    const dy = event.clientY - centreY;
    const distance = Math.hypot(dx, dy);
    const scale = distance > max ? max / distance : 1;
    const x = dx * scale;
    const y = dy * scale;
    touchInput.x = x / max;
    touchInput.z = -y / max;
    joystickStick.style.transform = `translate(${x}px, ${y}px)`;
  };

  joystick.addEventListener("pointerdown", (event: PointerEvent) => {
    event.preventDefault();
    joystick.setPointerCapture(event.pointerId);
    updateStick(event);
  });
  joystick.addEventListener("pointermove", (event: PointerEvent) => {
    if (joystick.hasPointerCapture(event.pointerId)) updateStick(event);
  });
  joystick.addEventListener("pointerup", resetStick);
  joystick.addEventListener("pointercancel", resetStick);
  joystick.addEventListener("lostpointercapture", resetStick);
}
