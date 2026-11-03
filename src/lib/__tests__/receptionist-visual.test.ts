import { describe, expect, it } from 'vitest';
import {
	VISUAL_CONVERSATION,
	VISUAL_DURATION,
	getVisualFrame,
} from '../receptionist-visual';

describe('receptionist visual storyboard', () => {
	it('uses the previous inbox message cadence and a short complete loop', () => {
		expect(VISUAL_DURATION).toBe(10000);
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
			activeStep: -1,
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
			phase: 2,
			messages: 7,
			booked: true,
			summarized: false,
		});
		expect(getVisualFrame(6499).summarized).toBe(false);
		expect(getVisualFrame(6500)).toMatchObject({
			phase: 3,
			messages: 8,
			booked: true,
			summarized: true,
		});
	});

	it('holds the completed view and stops the call timer during the handoff', () => {
		const completed = getVisualFrame(8000);
		expect(completed).toMatchObject({
			messages: 8,
			typing: false,
			timer: '0:05',
		});
		expect(getVisualFrame(VISUAL_DURATION - 1)).toEqual(completed);
	});

	it('highlights exactly one progress border at a time in call order', () => {
		const activeSteps = new Set<number>();
		for (let time = 0; time < VISUAL_DURATION; time += 50) {
			const frame = getVisualFrame(time);
			const active = [0, 1, 2].filter((step) => frame.activeStep === step);
			expect(active.length).toBe(frame.answered ? 1 : 0);
			if (active.length) activeSteps.add(active[0]);
		}
		expect([...activeSteps]).toEqual([0, 1, 2]);
	});

	it('loops cleanly and handles invalid input deterministically', () => {
		expect(getVisualFrame(VISUAL_DURATION)).toEqual(getVisualFrame(0));
		expect(getVisualFrame(VISUAL_DURATION + 2250)).toEqual(
			getVisualFrame(2250),
		);
		for (const value of [-1, NaN, Infinity, -Infinity]) {
			expect(getVisualFrame(value)).toEqual(getVisualFrame(0));
		}
	});
});
