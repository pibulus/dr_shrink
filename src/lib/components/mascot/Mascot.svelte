<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';

	import './mascot-animations.css';
	import { ANIMATION_STATES, CSS_CLASSES, PULSE_CONFIG, EYE_CONFIG } from './animationConfig.js';

	import { mascotState, theme as localTheme } from './stores/index.js';
	import { getThemeNames, FALLBACK_THEME } from './mascotTheme.js';
	import { animationService, blinkService } from './services/index.js';
	import { forceReflow } from './utils/animationUtils.js';
	import { initialMascotAnimation } from './actions/initialMascotAnimation.js';
	import { createEyeTracking } from './eyeTracking.js';
	import { getGradientId } from './gradients.js';
	import { buildMascotPersonality } from './personality.js';
	import { getAccessory } from './accessories.js';
	import { getCharacterUrl } from './characters.js';

	const dispatch = createEventDispatcher();

	// Sustained "engaged" state (was isRecording). DrShrink: compressing in progress.
	export let active = false;
	// Transient "working" state (was isProcessing). DrShrink: encoding step running.
	export let busy = false;
	// Pauses all animation (was the appActive coupling). App drives blur/offscreen.
	export let paused = false;
	export let debug = false;
	export let debugAnim = false;
	export let seed = 0;
	export let externalTheme = null;
	export let width = '100%';
	export let height = '100%';
	export let opacity = 1;
	export let scale = 1;
	// Renders a <button> when true, a decorative element when false (was `clickable`).
	export let interactive = true;
	// Accessible label for the interactive button.
	export let ariaLabel = 'Mascot';
	// "New hat" — accessory name from accessories.js (e.g. 'top-hat', 'pirate-patch').
	export let accessory = 'none';
	// Per-mascot vertical nudge for the accessory (1024-space units).
	export let accessoryOffsetY = 0;
	// Which character art to render (art/<name>.svg). Default: first available.
	export let character = 'brain';
	const mascotInstanceId = Symbol('mascot-instance');
	let mascotSvg;
	let spinPivotElement;
	let leftEye;
	let rightEye;
	let backgroundElement;
	let lastActiveState = false;
	let currentTheme = FALLBACK_THEME; // Initialize immediately to prevent black silhouette flash
	let themeStore = externalTheme || localTheme;
	let unsubscribeTheme;
	let eyeTracker;
	let fullyReady = false; // Single initialization flag - prevents ALL rendering until ready
	let readyRafId = null; // Track RAF for cleanup
	let personalityStyle = '';
	let personalityMood = 'drift';
	// Themes are whatever the app registered via defineMascotThemes().
	$: validThemes = new Set(getThemeNames());

	// === REACTIVE DECLARATIONS ===
	// All reactive logic gated by fullyReady to prevent cascade during initialization
	$: animationsEnabled = !paused;
	$: animationClass = animationsEnabled ? 'animations-enabled' : 'animations-paused';
	$: gradientId = getGradientId(currentTheme);
	$: accessorySvg = getAccessory(accessory).svg;
	$: mascotPathsUrl = getCharacterUrl(character);
	$: specialAnimationClass =
		$mascotState.current === ANIMATION_STATES.EASTER_EGG && $mascotState.specialAnimation
			? `mascot-special-${$mascotState.specialAnimation}`
			: '';
	$: mascotLabel = interactive ? ariaLabel : undefined;

	// React to active state changes ONLY when fully ready
	$: if (fullyReady && browser && active !== lastActiveState) {
		mascotState.setRecording(active);
		lastActiveState = active;
	}

	$: if (fullyReady && browser) {
		mascotState.setProcessing(busy);
	}

	// Theme changes trigger visual updates ONLY when fully ready
	// NOTE: CSS variables now injected at layout level, so no injection needed here
	$: if (fullyReady && currentTheme && mascotSvg && browser) {
		applyThemeChanges();
	}

	function setDebugMode() {
		if (browser) {
			mascotState.setDebug(debug);
		}
	}

	// Watch for changes to externalTheme prop in a safer way
	function setupThemeSubscription() {
		// Clean up previous subscription if it exists
		if (unsubscribeTheme) unsubscribeTheme();

		if (typeof externalTheme === 'string') {
			currentTheme = validThemes.has(externalTheme) ? externalTheme : FALLBACK_THEME;
			unsubscribeTheme = null;
			return;
		}

		// Update the theme store reference
		themeStore =
			externalTheme && typeof externalTheme.subscribe === 'function' ? externalTheme : localTheme;

		unsubscribeTheme = themeStore.subscribe((value) => {
			currentTheme = validThemes.has(value) ? value : FALLBACK_THEME;
		});
	}

	// Apply theme changes when they occur
	// NOTE: CSS variables are now injected at layout level (+layout.svelte)
	// This function only handles visual reflow to ensure smooth transitions
	function applyThemeChanges() {
		if (!browser || !mascotSvg || !currentTheme) return;

		const svgElement = mascotSvg.querySelector('svg');
		if (!svgElement) return;

		// Force a reflow to ensure CSS transitions apply correctly
		forceReflow(svgElement);

		// Get the shape element
		const shapeElem = svgElement.querySelector('.mascot-shape');
		if (shapeElem) {
			// Force shape animation restart
			forceReflow(shapeElem);
		}

		// Log theme change if in debug mode
		if (debug) {
			console.log('[Mascot] Theme changed, reflow applied');
		}
	}

	// Clean up on destroy - ensure all animation resources are cleared
	onDestroy(() => {
		// Cancel pending RAF
		if (readyRafId) {
			cancelAnimationFrame(readyRafId);
			readyRafId = null;
		}

		// Clean up theme store subscription
		if (unsubscribeTheme) {
			unsubscribeTheme();
		}

		// NOTE: No mascot style element to remove - CSS variables now managed at layout level

		// Reset mascot state
		mascotState.setWobbleTarget(null, mascotInstanceId);
		mascotState.reset(mascotInstanceId);
	});

	// Public methods to expose animation controls
	export function pulse() {
		// Add subtle pulse animation
		if (mascotSvg) {
			// Pass duration from config
			animationService.applyPulseEffect(mascotSvg, PULSE_CONFIG.DURATION);
		}
	}

	export function startThinking() {
		// Transition to thinking state
		mascotState.setAnimationState(ANIMATION_STATES.THINKING);
		mascotState.setProcessing(true);
	}

	export function stopThinking() {
		// Transition to idle state
		mascotState.setAnimationState(ANIMATION_STATES.IDLE);
		mascotState.setProcessing(false);
	}

	// Trigger a reaction blink burst. `intensity` scales the effect (was textLength).
	// DrShrink: react(bytesSaved); ZipList: react(itemsAdded).
	export function react(intensity = 0) {
		blinkService.reactToTranscript({ leftEye, rightEye }, intensity);
	}

	// Handle click on the mascot — app-neutral: emit an `activate` event.
	function handleClick() {
		if (interactive) {
			dispatch('activate');
			// Wobble is driven by the `active` state change the app makes in response.
		}
	}

	// Setup on mount with simplified initialization sequence
	onMount(() => {
		// Set initial values to prevent unnecessary updates
		lastActiveState = active;

		// CRITICAL: Setup theme subscription FIRST to ensure currentTheme is correct
		// This happens before setting fullyReady to prevent theme change flash
		setDebugMode();
		setupThemeSubscription();

		if (browser) {
			const personality = buildMascotPersonality({ seed });
			personalityStyle = personality.style;
			personalityMood = personality.mood;

			// Initialize element references for services
			const elements = {
				mascotSvg,
				leftEye,
				rightEye,
				backgroundElement
			};

			mascotState.setWobbleTarget(spinPivotElement, mascotInstanceId);

			// Initialize animation services
			const cleanupAnimations = animationService.initAnimations(elements, {
				seed,
				theme: currentTheme
			});

			// Initialize blink service
			const cleanupBlinks = blinkService.initBlinking(elements, {
				seed
			});

			// Initialize Eye Tracking Service
			eyeTracker = createEyeTracking({
				debug: debug, // Pass the debug prop
				eyeSensitivity: EYE_CONFIG.SMOOTHING,
				maxDistanceX: EYE_CONFIG.X_DIVISOR,
				maxDistanceY: EYE_CONFIG.Y_DIVISOR,
				maxXMovement: EYE_CONFIG.X_MULTIPLIER,
				maxYMovement: EYE_CONFIG.Y_MULTIPLIER
			});
			// Initialize with the main mascot SVG container (for getBoundingClientRect)
			eyeTracker.initialize(mascotSvg);

			// Set debug mode
			mascotState.setDebug(debug);

			// Check for first visit status on the client *before* reading the state
			mascotState.checkAndSetFirstVisit();

			// Initialize animation state based on the potentially updated first visit status
			const state = $mascotState; // Read the potentially updated state
			if (state.isFirstVisit) {
				mascotState.setAnimationState(ANIMATION_STATES.INITIAL);
				// The Svelte action `initialMascotAnimation` (applied below in the template)
				// will handle applying the 'initial-load-effect' class and the timed blink.
				// It will then dispatch 'initialAnimationComplete'.
			} else {
				mascotState.setAnimationState(ANIMATION_STATES.IDLE);
			}

			// FINAL STEP: Set fullyReady flag after all setup is complete
			// This prevents any reactive cascade during initialization
			// Single requestAnimationFrame ensures one clean render with all resources ready
			readyRafId = requestAnimationFrame(() => {
				fullyReady = true;
				readyRafId = null;
			});

			// Add global event listeners for waking up / resetting inactivity
			document.addEventListener('mousemove', handleUserInteraction, { passive: true });
			document.addEventListener('pointerdown', handleUserInteraction, { passive: true });

			// Return cleanup function
			return () => {
				// Cleanup animations and services
				cleanupAnimations();
				cleanupBlinks();
				if (eyeTracker) {
					eyeTracker.cleanup(); // Cleanup eye tracker
				}
				// Cleanup global event listeners
				document.removeEventListener('mousemove', handleUserInteraction);
				document.removeEventListener('pointerdown', handleUserInteraction);
				// The Svelte action will handle its own timer cleanup via its destroy method.
			};
		}
	});

	function handleInitialAnimationComplete() {
		mascotState.completeFirstVisit();
		mascotState.setAnimationState(ANIMATION_STATES.IDLE);
	}

	// Interaction handlers for inactivity timer and waking up
	function handleUserInteraction() {
		if (!browser) return;
		const currentState = $mascotState.current;
		if (currentState === ANIMATION_STATES.IDLE) {
			mascotState.resetInactivityTimer();
		} else if (currentState === ANIMATION_STATES.ASLEEP) {
			mascotState.wakeUp();
		}
	}
</script>

<button
	bind:this={mascotSvg}
	class="mascot-container theme-{currentTheme} {animationClass}
      {$mascotState.isRecording ? CSS_CLASSES.RECORDING : ''}
      {$mascotState.current === ANIMATION_STATES.EASTER_EGG &&
	$mascotState.specialAnimation === 'spin'
		? CSS_CLASSES.SPIN
		: ''}
      {specialAnimationClass}
      {$mascotState.current === ANIMATION_STATES.INITIAL ? 'initializing' : ''}
      {$mascotState.current === ANIMATION_STATES.ASLEEP ? CSS_CLASSES.ASLEEP : ''}
      {$mascotState.current === ANIMATION_STATES.WAKING_UP ? CSS_CLASSES.WAKING_UP : ''}
      {!interactive ? 'mascot-non-clickable' : ''}"
	style="width: {width}; height: {height}; opacity: {opacity}; transform: scale({scale}); {personalityStyle}"
	data-mascot-mood={personalityMood}
	on:click={() => {
		if (interactive) {
			handleClick();
			handleUserInteraction();
		}
	}}
	on:keydown={(e) => {
		if (interactive && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			handleClick();
		}
	}}
	aria-label={mascotLabel}
	aria-pressed={interactive ? $mascotState.isRecording.toString() : undefined}
	aria-disabled={!interactive}
	tabindex={interactive ? '0' : '-1'}
>
	<span class="mascot-float-stage">
		<svg
			viewBox="0 0 1024 1024"
			xmlns="http://www.w3.org/2000/svg"
			xmlns:xlink="http://www.w3.org/1999/xlink"
			class="mascot-svg theme-{currentTheme} {animationClass}"
			pointer-events="none"
			class:visible={fullyReady}
			class:recording={$mascotState.isRecording}
			class:spin={$mascotState.current === ANIMATION_STATES.EASTER_EGG &&
				$mascotState.specialAnimation === 'spin'}
			class:asleep={$mascotState.current === ANIMATION_STATES.ASLEEP}
			class:waking-up={$mascotState.current === ANIMATION_STATES.WAKING_UP}
			class:debug-animation={debugAnim}
		>
			<!-- Global gradient definitions are now in +layout.svelte -->

			<!-- Wrapper group for wobble and special transforms -->

			<g bind:this={spinPivotElement} class="mascot-spin-pivot">
				<g
					class="mascot-wobble-group"
					use:initialMascotAnimation={fullyReady && $mascotState.isFirstVisit
						? { blinkService, leftEye, rightEye, debug, oneTimeOnly: true }
						: undefined}
					on:initialAnimationComplete={handleInitialAnimationComplete}
				>
					<g class="mascot-layer mascot-bg" bind:this={backgroundElement}>
						<use
							xlink:href={mascotPathsUrl}
							href={mascotPathsUrl + '#mascot-background'}
							class="mascot-shape"
							fill="url(#{gradientId})"
						/>
					</g>

					<g class="mascot-layer mascot-outline">
						<use
							xlink:href={mascotPathsUrl}
							href={mascotPathsUrl + '#mascot-body-path'}
							class="mascot-outline-path"
							fill="#000000"
							opacity="1"
						/>
					</g>

					<g class="mascot-layer mascot-eyes">
						<use
							bind:this={leftEye}
							xlink:href={mascotPathsUrl}
							href={mascotPathsUrl + '#mascot-eye-left-path'}
							class="mascot-eye mascot-eye-left"
							fill="#000000"
						/>
						<use
							bind:this={rightEye}
							xlink:href={mascotPathsUrl}
							href={mascotPathsUrl + '#mascot-eye-right-path'}
							class="mascot-eye mascot-eye-right"
							fill="#000000"
						/>
					</g>

					{#if accessorySvg}
						<!-- The "new hat" — accessory layer, rides the wobble/float, sits on top -->
						<g
							class="mascot-layer mascot-accessory"
							transform={accessoryOffsetY ? `translate(0 ${accessoryOffsetY})` : undefined}
						>
							{@html accessorySvg}
						</g>
					{/if}
				</g>
				<!-- End of mascot-wobble-group -->
			</g>
			<!-- End of mascot-spin-pivot -->
		</svg>
	</span>
</button>

<style>
	.mascot-container {
		position: relative;
		width: 100%;
		height: 100%;
		cursor: pointer;
		background: transparent;
		border: none;
		outline: none;
		-webkit-tap-highlight-color: transparent;
		display: flex;
		justify-content: center;
		align-items: center;
		/* Allow the float/grow/wobble animations to extend past the box without
		   clipping. Art also carries ~10% internal padding for headroom. */
		overflow: visible;
		/* Safari-specific fixes for flashing */
		-webkit-backface-visibility: hidden;
		-webkit-transform: translateZ(0);
		transform: translateZ(0);
	}

	.mascot-container:focus,
	.mascot-container:active {
		outline: none !important;
		outline-offset: 0 !important;
		box-shadow: none !important;
		border: none !important;
	}

	.mascot-container:focus-visible {
		outline: 3px solid rgba(245, 158, 11, 0.95) !important;
		outline-offset: 0.5rem !important;
		border-radius: 999px;
		box-shadow: 0 0 0 0.35rem rgba(255, 250, 239, 0.95) !important;
	}

	.mascot-non-clickable {
		cursor: default;
		pointer-events: none;
	}

	.mascot-float-stage {
		display: flex;
		width: 100%;
		height: 100%;
		align-items: center;
		justify-content: center;
		line-height: 0;
		pointer-events: none;
		transform-origin: center center;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.mascot-svg {
		width: 100%;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
		opacity: 1; /* Start visible to prevent flashing */
		position: relative;
		z-index: 1;
		/* Safari-specific fixes */
		-webkit-backface-visibility: hidden;
		-webkit-transform: translateZ(0);
		transform: translateZ(0);
		will-change: transform;
	}

	.mascot-layer {
		transform-origin: center center;
	}

	/* Apply grow animation only on initial load with a separate class */
	:global(.initial-load) .mascot-layer {
		animation: grow-mascot var(--mascot-grow-duration, 2s) cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	/* Dynamically apply animation durations from config */
	.mascot-svg.theme-peach .mascot-shape {
		animation-duration: var(--mascot-shimmer-duration, 5s), var(--mascot-peach-flow-duration, 9s);
		animation-timing-function:
			var(--mascot-shimmer-ease, ease-in-out),
			var(--mascot-peach-flow-ease, cubic-bezier(0.4, 0, 0.6, 1));
	}

	.mascot-svg.theme-mint .mascot-shape {
		animation-duration: var(--mascot-shimmer-duration, 6s), var(--mascot-mint-flow-duration, 10s);
		animation-timing-function:
			var(--mascot-shimmer-ease, ease-in-out),
			var(--mascot-mint-flow-ease, cubic-bezier(0.4, 0, 0.6, 1));
	}

	.mascot-svg.theme-bubblegum .mascot-shape {
		animation-duration:
			var(--mascot-shimmer-duration, 7s), var(--mascot-bubblegum-flow-duration, 12s);
		animation-timing-function:
			var(--mascot-shimmer-ease, ease-in-out),
			var(--mascot-bubblegum-flow-ease, cubic-bezier(0.4, 0, 0.6, 1));
	}

	.mascot-svg.theme-rainbow .mascot-shape {
		animation-duration: var(--mascot-rainbow-flow-duration, 9s);
		animation-timing-function: var(--mascot-rainbow-flow-ease, cubic-bezier(0.4, 0, 0.6, 1));
	}

	/* Debug mode styles */
	.mascot-svg.debug-animation {
		border: 1px dashed rgba(255, 0, 0, 0.5);
	}

	.mascot-svg.debug-animation .mascot-shape {
		outline: 1px dotted rgba(0, 255, 0, 0.5);
	}

	.mascot-svg.debug-animation .mascot-eye {
		outline: 1px dotted rgba(0, 0, 255, 0.5);
	}

	/* Slow down animations in debug mode for easier inspection */
	.mascot-svg.debug-animation .mascot-shape {
		animation-duration:
			calc(var(--mascot-shimmer-duration, 5s) * 2), calc(var(--mascot-peach-flow-duration, 9s) * 2) !important;
	}

	/* Animation state control */
	.animations-enabled .mascot-svg .mascot-shape {
		animation-play-state: running;
	}

	.animations-paused .mascot-svg .mascot-shape {
		animation-play-state: paused;
	}
</style>
