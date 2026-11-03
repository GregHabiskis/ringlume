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
		expect(source).toContain('Example Tree Care');
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
			'const finalFrame = getVisualFrame(VISUAL_DURATION - 1)',
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
			'new ResizeObserver(positionConversation)',
			'height: 18rem',
			'font-size: 0.875rem',
			'line-height: 1.65',
			'margin-inline-start: auto',
			'visual-bubble-receptionist',
			'visual-typing-pulse 900ms',
		])
			expect(source).toContain(detail);
		expect(source).not.toContain('visual-exchange');
		expect(source).not.toContain('data-visual-reply');
	});

	it('uses a circulating green border instead of progress checkmarks', async () => {
		const source = await read('components/ReceptionistVisual.astro');
		expect(source).toContain('class="visual-step-border"');
		expect(source).toContain('stroke-dasharray: 16 84');
		expect(source).toContain('stroke: var(--brand-bright)');
		expect(source).toContain('visual-border-travel 1700ms linear infinite');
		expect(source).toContain('frame.activeStep === index');
		expect(source).toContain(
			'.visual-scene:not(.visual-running) .visual-step-border rect',
		);
		expect(source).toContain(
			':global(html.is-paused) .visual-step-border rect',
		);
		expect(source).not.toContain('m3 8 3 3 7-7');
		expect(source).not.toContain('m5 12 4 4L19 6');
	});

	it('supports pausing, reduced motion, offscreen pausing and background tabs', async () => {
		const source = await read('components/ReceptionistVisual.astro');
		expect(source).toContain('aria-pressed="false"');
		expect(source).toContain(
			"button.setAttribute('aria-pressed', String(paused))",
		);
		expect(source).toContain("paused ? 'Resume animation' : 'Pause animation'");
		expect(source).toContain('prefers-reduced-motion: reduce');
		expect(source).toContain(
			'reducedMotion.matches ? VISUAL_DURATION - 1 : elapsed',
		);
		expect(source).toContain('new IntersectionObserver');
		expect(source).toContain('!document.hidden');
		expect(source).toContain('clearInterval(interval)');
		expect(source).toContain(
			"document.addEventListener('visibilitychange', syncPlayback)",
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
