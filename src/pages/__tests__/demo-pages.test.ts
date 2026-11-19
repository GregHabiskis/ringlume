import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const srcDir = new URL('../../', import.meta.url);

const read = (path: string) => readFile(new URL(path, srcDir), 'utf8');

describe('/book-demo', () => {
	it('keeps the page header, subline, and a centered demo form', async () => {
		const source = await read(
			'components/cms-regions/forms/BookDemoBody.astro',
		);

		expect(source).toContain('{copy.heading}');
		expect(source).toContain('copy.intro');
		expect(source).toContain('demoFreeMinutes: offer.demoFreeMinutes');
		expect(source).toContain('getOffer(Astro.locals.site.offer)');
		expect(source).toContain('<DemoRequestForm />');
		expect(source).toContain('<div class="max-w-3xl mx-auto">');
	});

	it('removes the repeated next-steps block', async () => {
		const source = await read(
			'components/cms-regions/forms/BookDemoBody.astro',
		);

		expect(source).not.toContain('What happens next');
		expect(source).not.toContain('Send us your details.');
		expect(source).not.toContain(
			'We build a voice agent around your business.',
		);
		expect(source).not.toContain('<aside');
		expect(source).not.toContain('lg:grid-cols-[minmax(0,1fr)_31.5rem]');
	});

	it('makes no setup-time or production claim', async () => {
		const source = await read(
			'components/cms-regions/forms/BookDemoBody.astro',
		);

		expect(source).not.toMatch(/afternoon/i);
		expect(source).not.toContain('12 hours');
		expect(source).not.toContain('PRODUCTION_MAX');
		expect(source).not.toMatch(/setup time/i);
	});
});

describe('/book-demo/thanks', () => {
	it('confirms the 1-hour email delivery and offers the next steps', async () => {
		const source = await read(
			'components/cms-regions/forms/BookDemoThanksBody.astro',
		);

		expect(
			await read(
				'pages/' +
					(source.includes('bookDemoThanks') ? 'book-demo' : 'contact') +
					'/thanks.astro',
			),
		).toContain('noindex');
		expect(source).toContain('copy.message');
		expect(source).toContain('deliveryMax: offer.demoDeliveryMax');
		expect(source).toContain('getOffer(Astro.locals.site.offer)');
		expect(source).toContain('href={site.links.liveDemo}');
		expect(source).toContain('{copy.tryLabel}');
		expect(source).toContain('href={site.links.setupMeeting}');
		expect(source).toContain('{copy.bookingLabel}');
		expect(source).not.toContain('import Header');
		expect(source).not.toContain('import Footer');
	});
});

describe('/contact/thanks', () => {
	it('confirms the message and points at the demo', async () => {
		const source = await read(
			'components/cms-regions/forms/ContactThanksBody.astro',
		);

		expect(
			await read(
				'pages/' +
					(source.includes('bookDemoThanks') ? 'book-demo' : 'contact') +
					'/thanks.astro',
			),
		).toContain('noindex');
		expect(source).toContain('{copy.message}');
		expect(source).toContain('href={site.links.freeDemo}');
		expect(source).toContain('{copy.demoLabel}');
		expect(source).not.toContain('cal.com');
		expect(source).not.toContain('import Header');
		expect(source).not.toContain('import Footer');
	});
});

describe('/contact', () => {
	it('keeps the header copy and the two-channel layout', async () => {
		const source = await read('components/cms-regions/forms/ContactBody.astro');

		expect(source).toContain('<ContactForm />');
		expect(source).toContain('{copy.heading}');
		expect(source).not.toContain(
			"Have questions about our virtual receptionist service? We're here to help.",
		);
		expect(source).toContain('href={site.links.whatsapp}');
		expect(source).toContain('href={site.links.email}');
		expect(source).toContain(
			'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6',
		);
		expect(source).toContain('lg:grid-cols-[minmax(0,1fr)_31.5rem]');
		expect(source).toContain('items-start');
		expect(source).not.toMatch(/telegram|https?:\/\/t\.me|fshahariar/i);
	});

	it('shows exactly two channel cards and puts the form first', async () => {
		const source = await read('components/cms-regions/forms/ContactBody.astro');

		expect(
			source.match(
				/glass glass-fill glass-regular glass-card rounded-2xl p-8/g,
			),
		).toHaveLength(2);
		expect(source.indexOf('<ContactForm />')).toBeLessThan(
			source.indexOf('href={site.links.whatsapp}'),
		);
	});
});
