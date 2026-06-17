/**
 * Mascot Animation Service
 *
 * Handles imperative animations for the Mascot component.
 * This service bridges the reactive state and imperative DOM manipulation
 * for performance-critical animations.
 */

import { get } from "svelte/store";
import {
  forceReflow,
  seedRandom,
  isBrowser,
  cleanupTimers,
} from "../utils/animationUtils.js";
import {
  ANIMATION_STATES,
  CSS_CLASSES,
  SPECIAL_CONFIG,
  ANIMATION_TIMING,
} from "../animationConfig.js";
import { mascotState } from "../stores/mascotState.js";
import { initGradientAnimation } from "../gradientAnimator.js";
import { pickSpecialAnimation } from "../personality.js";

// Animation timers
const timers = {
  specialAnimationTimeoutId: null,
  wobbleTimeoutId: null,
};
let specialAnimationCounter = 0;

// Flag to ensure initial load effect runs only once
let initialLoadEffectApplied = false;

/**
 * Initialize all animation systems
 *
 * @param {Object} elements - DOM elements references
 * @param {Object} config - Animation configuration
 * @returns {Function} Cleanup function
 */
export function initAnimations(elements, config = {}) {
  if (!elements || !isBrowser()) return () => {};

  const { seed = 0 } = config;

  // Initialize mascot shape gradient animation
  if (elements.mascotSvg && elements.mascotSvg.querySelector("svg")) {
    const svgEl = elements.mascotSvg.querySelector("svg");
    initThemeAnimation(svgEl, config.theme);
  }

  // Start watching for special animations (easter eggs)
  startSpecialAnimationWatch(elements.mascotSvg, seed);

  // Return cleanup function
  return () => {
    stopSpecialAnimationWatch();
    cleanupTimers(timers);
  };
}

/**
 * Initialize theme-based gradient animation
 *
 * @param {SVGElement} svgElement - SVG element to animate
 * @param {string} theme - Theme name
 */
export function initThemeAnimation(svgElement, theme) {
  if (!svgElement || !theme) return;

  // Force a reflow to ensure CSS transitions apply correctly
  forceReflow(svgElement);

  // Get the shape element
  const shapeElem = svgElement.querySelector(".mascot-shape");
  if (shapeElem) {
    forceReflow(shapeElem);
  }

  // Initialize gradient animations
  initGradientAnimation(theme, svgElement);
}

/**
 * Apply the initial loading animation
 *
 * @param {HTMLElement} mascotSvg - Mascot SVG container element
 */
export function applyInitialLoadEffect(mascotSvg) {
  // --- Prevent multiple executions ---
  if (initialLoadEffectApplied || !isBrowser()) {
    return;
  }
  // --- Mark as applied ---
  initialLoadEffectApplied = true;

  const state = get(mascotState);

  // Skip if not first visit
  if (!state.isFirstVisit) {
    return;
  }

  // Find the wobble group element within the provided mascotSvg container
  const wobbleGroup = mascotSvg?.querySelector(".mascot-wobble-group");

  if (!wobbleGroup) {
    return;
  }

  // --- Delay adding the class until the next frame ---
  requestAnimationFrame(() => {
    // Double-check the element still exists in case of rapid unmount
    if (!document.body.contains(wobbleGroup)) {
      return;
    }

    // Apply the combined animation class directly to the wobble group
    wobbleGroup.classList.add("initial-load-effect");

    // Set a single timeout to clean up after the combined animation finishes
    const cleanupDelay = ANIMATION_TIMING.INITIAL_LOAD_DURATION;

    setTimeout(() => {
      // Remove the animation class
      wobbleGroup.classList.remove("initial-load-effect");

      // Explicitly reset transform/opacity left by "forwards" fill mode
      wobbleGroup.style.transform = "";
      wobbleGroup.style.opacity = "";

      // Mark first visit as complete in the store
      mascotState.completeFirstVisit();

      // Ensure final state is IDLE (unless something else changed it)
      if (
        get(mascotState).current === ANIMATION_STATES.INITIAL ||
        get(mascotState).current === ANIMATION_STATES.IDLE
      ) {
        mascotState.setAnimationState(ANIMATION_STATES.IDLE);
      }
    }, cleanupDelay);
  }); // End of requestAnimationFrame callback
}

/**
 * Start watching for special animation opportunities (easter eggs)
 *
 * @param {HTMLElement} mascotSvg - Mascot SVG container
 * @param {number} seed - Random seed
 */
export function startSpecialAnimationWatch(mascotSvg, seed = 0) {
  if (!isBrowser() || !mascotSvg) return;

  // Clean up any existing timer
  stopSpecialAnimationWatch();

  // Schedule special animation check
  function checkForSpecialAnimation() {
    const state = get(mascotState);

    // Don't interrupt other animations or states
    // Only run if current state is IDLE and eyes are open.
    // The state machine will prevent transitioning from EASTER_EGG to EASTER_EGG if needed.
    if (state.current !== ANIMATION_STATES.IDLE || state.eyesClosed) {
      scheduleNextCheck();
      return;
    }

    // Random chance for special animation
    const random = seedRandom(seed, Date.now(), 0, 1);
    if (random < SPECIAL_CONFIG.CHANCE) {
      // Transition to EASTER_EGG state.
      // The state machine's cleanupDelay for EASTER_EGG will handle transitioning back to IDLE.
      mascotState.setSpecialAnimation(
        pickSpecialAnimation(seed, specialAnimationCounter++, new Date()),
      );
      mascotState.setAnimationState(ANIMATION_STATES.EASTER_EGG);
    }

    scheduleNextCheck();
  }

  function scheduleNextCheck() {
    // Schedule next check with slight variation
    const checkInterval =
      SPECIAL_CONFIG.CHECK_INTERVAL + seedRandom(seed, Date.now(), -5000, 5000);

    timers.specialAnimationTimeoutId = setTimeout(
      checkForSpecialAnimation,
      checkInterval,
    );
  }

  // Start the check cycle
  scheduleNextCheck();
}

/**
 * Stop watching for special animations
 */
export function stopSpecialAnimationWatch() {
  if (timers.specialAnimationTimeoutId) {
    clearTimeout(timers.specialAnimationTimeoutId);
    timers.specialAnimationTimeoutId = null;
  }
}

/**
 * Apply a pulse animation
 *
 * @param {HTMLElement} mascotSvg - Mascot SVG container
 * @param {number} duration - Pulse duration in ms
 */
export function applyPulseEffect(mascotSvg, duration) {
  if (!mascotSvg) return;

  // Add pulse class
  mascotSvg.classList.add(CSS_CLASSES.PULSE);

  // Remove class after animation completes
  setTimeout(() => {
    mascotSvg.classList.remove(CSS_CLASSES.PULSE);
  }, duration);
}

// Export the animation service
export default {
  initAnimations,
  initThemeAnimation,
  applyInitialLoadEffect,
  applyPulseEffect,
  // performSpecialAnimation, // No longer exported or used externally for spin
  startSpecialAnimationWatch,
  stopSpecialAnimationWatch,
};
