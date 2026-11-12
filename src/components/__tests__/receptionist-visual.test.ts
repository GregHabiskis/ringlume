import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const read = async (path: string) =>
	(await readFile(new URL(`../../${path}`, import.meta.url), 'utf8')).replace(
		/\s+/g,
		' ',
	);

describe('homepage visual demonstration', () => {
	it('keeps one demonstration between the hero and cost comparison', async () => {
		const [page, component] = await Promise.all([
			read('pages/index.astro'),
			read('components/ReceptionistVisual.astro'),
		]);
		expect(page).toMatch(
			/<Hero\s*\/>\s*<ReceptionistVisual\s*\/>\s*<ReceptionistComparison\s*\/>/,
		);
		expect(page.match(/<ReceptionistVisual\s*\/>/g)).toHaveLength(1);
		expect(page).not.toContain('Capabilities');
		expect(component).toContain('id="visual"');
		expect(component).toContain('aria-labelledby="visual-heading"');
		expect(component).toContain('id="visual-heading"');
	});

	it('preserves legacy Features bookmarks without restoring a second section', async () => {
		const source = await read('components/ReceptionistVisual.astro');
		expect(source).toContain(
			'<span id="capabilities" class="block scroll-mt-24" aria-hidden="true"></span>',
		);
		expect(source.match(/<section\b/g)).toHaveLength(1);
	});

	it('labels fictional activity and qualifies the booking flow', async () => {
		const source = await read('components/ReceptionistVisual.astro');
		expect(source).toContain('Illustrative example');
		expect(source).toContain('A fictional after-hours call to Ringlume.');
		expect(source).toContain('Booking is one possible outcome.');
		expect(source).toContain(
			'Ringlume can instead transfer the call or take a message, following your rules and availability.',
		);
		expect(source).toContain('not a live dashboard or a timing claim');
		expect(source).toContain('href="/#demo"');
		expect(source).toContain('Try it now');
	});

	it('keeps alternative outcomes readable without waiting for the animation', async () => {
		const source = await read('components/ReceptionistVisual.astro');
		const footnote =
			source.match(/<div class="visual-footnote">([\s\S]*?)<\/div>/)?.[1] ?? '';
		const explanation = footnote.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? '';
		expect(footnote).toContain('Booking is one possible outcome.');
		expect(footnote).toContain('transfer the call or take a message');
		expect(explanation).not.toMatch(
			/aria-hidden|data-visual-(?:scene|exchange|reply)/,
		);
		expect(source.match(/<script>/g)).toHaveLength(1);
	});

	it('server-renders a finished example and an accessible non-announcing transcript', async () => {
		const source = await read('components/ReceptionistVisual.astro');
		expect(source).toContain(
			'const finalFrame = getVisualFrame(VISUAL_DURATION)',
		);
		expect(source).toContain('data-phase={finalFrame.phase}');
		expect(source).toContain('data-visual-message');
		expect(source).toContain('class="sr-only"');
		expect(source).toContain('VISUAL_CONVERSATION.map');
		expect(source).toContain('aria-live="off"');
		expect(source).toContain('tabindex="0"');
		expect(source).not.toMatch(/aria-live="(?:polite|assertive)"/);
	});

	it('uses a continuous inbox with compact alternating bubbles and automatic scrolling', async () => {
		const source = await read('components/ReceptionistVisual.astro');
		for (const detail of [
			'class="visual-messages"',
			'data-visual-count',
			'data-visual-caption',
			'--conversation-offset',
			'last.offsetTop + last.offsetHeight',
			'new ResizeObserver',
			'height: 18rem',
			'font-size: 0.875rem',
			'line-height: 1.65',
			'margin-inline-start: auto',
			'visual-bubble-receptionist',
		])
			expect(source).toContain(detail);
		expect(source).not.toContain('visual-exchange');
		expect(source).not.toContain('data-visual-reply');
	});

	it('retains completed green borders and draws completion checks in the top-right corners', async () => {
		const source = await read('components/ReceptionistVisual.astro');
		expect(source).toContain('class="visual-step-border"');
		expect(source).toContain('stroke-dasharray: 100 100');
		expect(source).toContain('stroke: var(--brand-bright)');
		expect(source).toContain('frame.activeStep === index');
		expect(source).toContain('100 * (1 - frame.stepProgress[index])');
		expect(source).not.toContain('stroke-dasharray: 16 84');
		expect(source).not.toContain('-100 * frame.stepProgress[index]');
		expect(source).toContain('class="visual-step-button visual-step-done"');
		expect(source).toContain(
			'.visual-step-done .visual-step-border { opacity: 1; }',
		);
		expect(source).toContain(
			'.visual-step-done .visual-step-border rect { stroke-dasharray: none; }',
		);
		expect(source).toContain('data-visual-check');
		expect(source).toContain('100 * (1 - frame.checkProgress[index])');
		expect(source).toContain('top: -0.625rem');
		expect(source).toContain('right: -0.25rem');
		expect(source).toContain('pathLength="100"');
		expect(source).not.toContain('infinite');
		expect(source).not.toContain('@keyframes');
		expect(source).not.toContain('m3 8 3 3 7-7');
		expect(source).not.toContain('m5 12 4 4L19 6');
	});

	it('makes each progress card an accessible control to replay from its event', async () => {
		const source = await read('components/ReceptionistVisual.astro');
		expect(source).toContain('aria-label="Replay a storyboard event"');
		expect(source).toContain('data-visual-step={index}');
		expect(source).toContain(
			'aria-label={`Replay from ${label.toLowerCase()}`}',
		);
		expect(source).toContain('clock.playSegment(index)');
		expect(source).toContain('getVisualFrame(');
		expect(source).toContain('state.segmentIndex ?? undefined');
		expect(source).toContain('step.disabled = reducedMotion.matches');
		expect(source).toContain("step.addEventListener('click', () => {");
		expect(source).toContain('controlsVisible = true');
		expect(source).toContain('visibilityObserver.observe(progressControls)');
	});

	it('supports pausing, reduced motion, offscreen pausing and background tabs', async () => {
		const source = await read('components/ReceptionistVisual.astro');
		expect(source).toContain('aria-pressed="false"');
		expect(source).toContain(
			"button.setAttribute('aria-pressed', String(state.paused))",
		);
		expect(source).toContain('clock.press()');
		expect(source).toContain('prefers-reduced-motion: reduce');
		expect(source).toContain('if (reducedMotion.matches) clock.finish()');
		expect(source).toContain('new IntersectionObserver');
		expect(source).toContain('!document.hidden');
		expect(source).toContain('cancelAnimationFrame(request)');
		expect(source).toContain(
			"document.addEventListener('visibilitychange', syncPlayback)",
		);
	});

	it('stops at completion and changes the same control to Replay without an automatic restart', async () => {
		const source = await read('components/ReceptionistVisual.astro');
		expect(source).toContain('label.textContent = state.label');
		expect(source).toContain('!clock.state.complete');
		expect(source).toContain("scene.classList.remove('visual-running')");
		expect(source).toContain("button.removeAttribute('aria-pressed')");
		expect(source).toContain('inbox.scrollTop = 0');
		expect(source).not.toContain('setInterval');
		expect(source).not.toContain('% VISUAL_DURATION');
	});

	it('highlights literal captured facts and flies the two outcomes from measured inbox origins', async () => {
		const source = await read('components/ReceptionistVisual.astro');
		expect(source).toContain('getVisualMessageParts(index)');
		expect(source).toContain('<mark class="visual-detail">');
		expect(source).toContain('frame.highlights[index]');
		expect(source).toContain('getVisualTransferOrigin(');
		expect(source).toContain('flight.source.getBoundingClientRect()');
		expect(source).toContain('flight.mount.getBoundingClientRect()');
		expect(source).toContain('data-visual-booking-mount');
		expect(source).toContain('data-visual-summary-mount');
		expect(source).toContain('--flight-progress');
		expect(source).toContain('--from-x');
		expect(source).toContain('--from-y');
	});

	it('matches the named UI labels to the call subtitle and makes the company name larger', async () => {
		const source = await read('components/ReceptionistVisual.astro');
		expect(source).toContain('class="visual-company-name">Ringlume');
		expect(source).toContain(
			'class="visual-label visual-ui-label">Your calendar',
		);
		expect(source).toMatch(
			/class="visual-label visual-ui-label">\s*Ready for your team/,
		);
		for (const selector of [
			'.visual-call-title',
			'.visual-ui-label',
			'.visual-playback:not([hidden])',
		]) {
			const rule =
				source.match(
					new RegExp(
						`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]+)\\}`,
					),
				)?.[1] ?? '';
			expect(rule).toContain('font-size: var(--visual-ui-size)');
		}
		expect(source).toContain(
			'font-size: calc(var(--visual-ui-size) + 0.125rem)',
		);
	});

	it('uses existing materials, responsive layouts and no external assets or animation libraries', async () => {
		const source = await read('components/ReceptionistVisual.astro');
		expect(source).toContain('glass glass-fill glass-regular glass-card');
		expect(source).toContain('content-auto');
		expect(source).toContain('@media (min-width: 640px)');
		expect(source).toContain('@media (min-width: 1024px)');
		expect(source).toContain('@media (prefers-contrast: more)');
		expect(source).not.toMatch(
			/<script[^>]*src=|<video|<iframe|https?:\/\/|backdrop-filter|#[0-9a-f]{6}/i,
		);
	});
});
