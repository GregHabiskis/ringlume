import { describe, expect, it } from 'vitest';
import {
	VISUAL_CONVERSATION,
	VISUAL_DURATION,
	VISUAL_CHECK_DURATION,
	getVisualFrame,
	VISUAL_TRANSFERS,
	DETAIL_HIGHLIGHT_DELAY,
	getVisualMessageParts,
	createVisualPlayback,
	getVisualTransferOrigin,
} from '../receptionist-visual';

describe('receptionist visual storyboard', () => {
	it('preserves the inbox cadence and finishes after the last completion check is drawn', () => {
		expect(VISUAL_DURATION).toBe(7820);
		expect(VISUAL_CONVERSATION.map(({ at }) => at)).toEqual([
			200, 850, 1500, 2250, 3100, 3900, 4700, 5600,
		]);
	});

	it('uses one consistent request that ends in an agreed booking', () => {
		const transcript = VISUAL_CONVERSATION.map(({ text }) => text).join(' ');
		expect(VISUAL_CONVERSATION).toHaveLength(8);
		expect(VISUAL_CONVERSATION.map(({ speaker }) => speaker)).toEqual([
			'receptionist',
			'caller',
			'receptionist',
			'caller',
			'receptionist',
			'caller',
			'receptionist',
			'caller',
		]);
		for (const detail of [
			'oak',
			'Alex Morgan',
			'24 Maple Lane',
			'202-555-0148',
			'Tuesday at 10:30',
		]) {
			expect(transcript).toContain(detail);
		}
		expect(VISUAL_CONVERSATION[6].text).toContain('You’re booked.');
		expect(transcript).not.toContain('have someone call me');
	});

	it('starts with an incoming call and no completed outcomes', () => {
		expect(getVisualFrame(0)).toMatchObject({
			phase: 0,
			answered: false,
			messages: 0,
			activeStep: 0,
			booked: false,
			summarized: false,
			timer: '0:00',
		});
	});

	it('reveals all messages sequentially without replacing earlier messages', () => {
		VISUAL_CONVERSATION.forEach(({ at }, index) => {
			expect(getVisualFrame(at - 1).messages).toBe(index);
			expect(getVisualFrame(at).messages).toBe(index + 1);
		});
		expect(getVisualFrame(199).answered).toBe(false);
		expect(getVisualFrame(200).answered).toBe(true);
	});

	it('shows speaking dots for the next speaker, then stops after the final message', () => {
		expect(getVisualFrame(349).typing).toBe(false);
		expect(getVisualFrame(350)).toMatchObject({
			typing: true,
			callerTyping: true,
		});
		expect(getVisualFrame(1000)).toMatchObject({
			typing: true,
			callerTyping: false,
		});
		expect(getVisualFrame(5600).typing).toBe(false);
	});

	it('books only after the caller agrees, then prepares the team summary', () => {
		expect(VISUAL_CONVERSATION[5].text).toContain('Tuesday at 10:30 works');
		expect(getVisualFrame(VISUAL_CONVERSATION[5].at).booked).toBe(false);
		expect(getVisualFrame(4699).booked).toBe(false);
		expect(getVisualFrame(4700)).toMatchObject({
			phase: 1,
			messages: 7,
			bookingStarted: true,
			bookingProgress: 0,
			booked: false,
			summarized: false,
		});
		expect(getVisualFrame(5600)).toMatchObject({
			phase: 2,
			bookingProgress: 1,
			booked: true,
		});
		expect(getVisualFrame(6499).summaryStarted).toBe(false);
		expect(getVisualFrame(6500)).toMatchObject({
			phase: 2,
			messages: 8,
			booked: true,
			summaryStarted: true,
			summaryProgress: 0,
			summarized: false,
		});
		expect(getVisualFrame(VISUAL_DURATION)).toMatchObject({
			phase: 3,
			summarized: true,
			summaryProgress: 1,
			complete: true,
		});
	});

	it('holds the completed view and stops the call timer during the handoff', () => {
		const completed = getVisualFrame(8000);
		expect(completed).toMatchObject({
			messages: 8,
			typing: false,
			timer: '0:05',
		});
		expect(getVisualFrame(VISUAL_DURATION)).toEqual(completed);
		expect(getVisualFrame(VISUAL_DURATION * 100)).toEqual(completed);
	});

	it('highlights exactly one progress border at a time in call order', () => {
		const activeSteps = new Set<number>();
		for (let time = 0; time < VISUAL_DURATION; time += 50) {
			const frame = getVisualFrame(time);
			const active = [0, 1, 2].filter((step) => frame.activeStep === step);
			expect(active.length).toBe(
				frame.stepProgress.some((value) => value < 1) ? 1 : 0,
			);
			if (active.length) activeSteps.add(active[0]);
		}
		expect([...activeSteps]).toEqual([0, 1, 2]);
	});

	it('starts each handwritten check only after its loading border completes and retains all three', () => {
		expect(VISUAL_CHECK_DURATION).toBe(420);
		for (const [index, end] of [850, 5600, 7400].entries()) {
			expect(getVisualFrame(end - 1).checkProgress[index]).toBe(0);
			expect(getVisualFrame(end).stepProgress[index]).toBe(1);
			expect(getVisualFrame(end).checkProgress[index]).toBe(0);
			expect(
				getVisualFrame(end + VISUAL_CHECK_DURATION / 2).checkProgress[index],
			).toBeCloseTo(0.5);
			expect(
				getVisualFrame(end + VISUAL_CHECK_DURATION).checkProgress[index],
			).toBe(1);
		}
		expect(getVisualFrame(7400)).toMatchObject({
			summarized: true,
			complete: false,
		});
		expect(getVisualFrame(VISUAL_DURATION)).toMatchObject({
			stepProgress: [1, 1, 1],
			checkProgress: [1, 1, 1],
			complete: true,
		});
	});

	it('never loops and handles invalid input deterministically', () => {
		expect(getVisualFrame(VISUAL_DURATION).complete).toBe(true);
		expect(getVisualFrame(VISUAL_DURATION + 2250)).toEqual(
			getVisualFrame(VISUAL_DURATION),
		);
		for (const value of [-1, NaN, Infinity, -Infinity]) {
			expect(getVisualFrame(value)).toEqual(getVisualFrame(0));
		}
	});

	it('highlights captured facts exactly 500ms after the message appears', () => {
		expect(DETAIL_HIGHLIGHT_DELAY).toBe(500);
		VISUAL_CONVERSATION.forEach(({ at }, index) => {
			expect(getVisualFrame(at).highlights[index]).toBe(false);
			expect(getVisualFrame(at + 499).highlights[index]).toBe(false);
			expect(getVisualFrame(at + 500).highlights[index]).toBe(true);
		});
	});

	it('marks name, address, phone and appointment text without changing any message', () => {
		VISUAL_CONVERSATION.forEach(({ text }, index) => {
			expect(
				getVisualMessageParts(index)
					.map((part) => part.text)
					.join(''),
			).toBe(text);
		});
		expect(
			getVisualMessageParts(3)
				.filter((part) => part.detail)
				.map((part) => part.text),
		).toEqual(['Alex Morgan', '24 Maple Lane', '202-555-0148']);
		expect(
			getVisualMessageParts(5)
				.filter((part) => part.detail)
				.map((part) => part.text),
		).toEqual(['Tuesday at 10:30']);
	});

	it('moves each border monotonically around its card only once, synchronized with the transfers', () => {
		let previous = [0, 0, 0];
		for (let time = 0; time <= VISUAL_DURATION + 500; time += 10) {
			const frame = getVisualFrame(time);
			frame.stepProgress.forEach((value, index) => {
				expect(value).toBeGreaterThanOrEqual(previous[index]);
				expect(value).toBeLessThanOrEqual(1);
			});
			previous = frame.stepProgress;
		}
		const bookingEnd =
			VISUAL_TRANSFERS.booking.at + VISUAL_TRANSFERS.booking.duration;
		expect(getVisualFrame(bookingEnd - 1).stepProgress[1]).toBeLessThan(1);
		expect(getVisualFrame(bookingEnd).stepProgress[1]).toBe(1);
		expect(getVisualFrame(VISUAL_DURATION)).toMatchObject({
			stepProgress: [1, 1, 1],
			activeStep: -1,
		});
	});
});

describe('one-shot visual playback', () => {
	it('finishes once and exposes Replay without advancing or restarting itself', () => {
		const clock = createVisualPlayback();
		expect(clock.state.label).toBe('Pause animation');
		clock.advance(VISUAL_DURATION + 1000);
		expect(clock.state).toMatchObject({
			elapsed: VISUAL_DURATION,
			complete: true,
			label: 'Replay',
		});
		clock.advance(999999);
		expect(clock.state.elapsed).toBe(VISUAL_DURATION);
	});
	it('pauses and resumes without advancing highlights or transfers while paused', () => {
		const clock = createVisualPlayback();
		clock.advance(2700);
		clock.press();
		expect(clock.state.label).toBe('Resume animation');
		const frame = getVisualFrame(clock.state.elapsed);
		clock.advance(100000);
		expect(getVisualFrame(clock.state.elapsed)).toEqual(frame);
		clock.press();
		clock.advance(50);
		expect(clock.state.label).toBe('Pause animation');
		expect(getVisualFrame(clock.state.elapsed).highlights[3]).toBe(true);
	});
	it('resets every event only when Replay is explicitly pressed', () => {
		const clock = createVisualPlayback();
		clock.finish();
		clock.press();
		expect(clock.state).toMatchObject({
			elapsed: 0,
			paused: false,
			complete: false,
			label: 'Pause animation',
		});
		expect(getVisualFrame(clock.state.elapsed)).toMatchObject({
			messages: 0,
			highlights: Array(8).fill(false),
			bookingProgress: 0,
			summaryProgress: 0,
			stepProgress: [0, 0, 0],
			checkProgress: [0, 0, 0],
		});
	});
	it('pauses the ink mid-stroke and resumes it without redrawing a completed check', () => {
		const clock = createVisualPlayback();
		clock.advance(950);
		const partial = getVisualFrame(clock.state.elapsed).checkProgress[0];
		expect(partial).toBeGreaterThan(0);
		expect(partial).toBeLessThan(1);
		clock.press();
		clock.advance(5000);
		expect(getVisualFrame(clock.state.elapsed).checkProgress[0]).toBe(partial);
		clock.press();
		clock.advance(320);
		expect(getVisualFrame(clock.state.elapsed).checkProgress[0]).toBe(1);
		clock.advance(1000);
		expect(getVisualFrame(clock.state.elapsed).checkProgress[0]).toBe(1);
	});
	it('supports the completed reduced-motion view and ignores invalid elapsed deltas', () => {
		const clock = createVisualPlayback();
		for (const delta of [-1, NaN, Infinity]) clock.advance(delta);
		expect(clock.state.elapsed).toBe(0);
		clock.press();
		clock.finish();
		expect(clock.state).toMatchObject({
			paused: false,
			complete: true,
			label: 'Replay',
		});
	});
});

describe('inbox-to-outcome transfer geometry', () => {
	const inbox = { left: 20, top: 100, width: 300, height: 288 };
	const source = { left: 40, top: 200, width: 200, height: 80 };
	it('starts at the message when the destination is beside the inbox', () => {
		expect(
			getVisualTransferOrigin(source, inbox, {
				left: 500,
				top: 200,
				width: 240,
				height: 100,
			}),
		).toEqual({ x: -480, y: -10 });
	});
	it('slides down from the inbox on a stacked mobile layout', () => {
		expect(
			getVisualTransferOrigin(source, inbox, {
				left: 40,
				top: 600,
				width: 240,
				height: 100,
			}),
		).toEqual({ x: -20, y: -410 });
	});
	it('keeps the origin inside the visible inbox when the source has scrolled out of view', () => {
		expect(
			getVisualTransferOrigin({ ...source, top: 1000 }, inbox, {
				left: 40,
				top: 600,
				width: 240,
				height: 100,
			}).y,
		).toBe(-262);
	});
});
