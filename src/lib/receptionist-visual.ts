export const VISUAL_TRANSFERS = {
	booking: { at: 4700, duration: 900, source: 6 },
	summary: { at: 6500, duration: 900, source: 6 },
} as const;
const SUMMARY_END =
	VISUAL_TRANSFERS.summary.at + VISUAL_TRANSFERS.summary.duration;
export const VISUAL_CHECK_DURATION = 420;
export const VISUAL_DURATION = SUMMARY_END + VISUAL_CHECK_DURATION;
export const DETAIL_HIGHLIGHT_DELAY = 500;

export const VISUAL_CONVERSATION = [
	{
		speaker: 'receptionist',
		text: 'Example Tree Care. How can I help?',
		at: 200,
	},
	{
		speaker: 'caller',
		text: 'I’d like an estimate for oak removal in my front yard.',
		at: 850,
	},
	{
		speaker: 'receptionist',
		text: 'Of course. May I have your name, property address, and callback number?',
		at: 1500,
	},
	{
		speaker: 'caller',
		text: 'Alex Morgan. 24 Maple Lane. My number is 202-555-0148.',
		at: 2250,
	},
	{
		speaker: 'receptionist',
		text: 'Thanks, Alex. There’s an estimate visit available Tuesday at 10:30. Does that work?',
		at: 3100,
	},
	{
		speaker: 'caller',
		text: 'Tuesday at 10:30 works. Thank you!',
		at: 3900,
	},
	{
		speaker: 'receptionist',
		text: 'You’re booked. I’ll pass the details along to the team.',
		at: 4700,
	},
	{
		speaker: 'caller',
		text: 'Perfect. See you Tuesday!',
		at: 5600,
	},
] as const;

const DETAILS: Readonly<Record<number, readonly string[]>> = {
	1: ['oak removal', 'front yard'],
	3: ['Alex Morgan', '24 Maple Lane', '202-555-0148'],
	4: ['Tuesday at 10:30'],
	5: ['Tuesday at 10:30'],
};

// Separate literal text from captured facts without injecting HTML or changing the transcript.
export function getVisualMessageParts(index: number) {
	const text = VISUAL_CONVERSATION[index].text;
	const ranges = (DETAILS[index] ?? [])
		.map((detail) => ({
			start: text.indexOf(detail),
			text: detail,
		}))
		.sort((a, b) => a.start - b.start);
	const parts: { text: string; detail: boolean }[] = [];
	let position = 0;
	for (const range of ranges) {
		if (range.start > position)
			parts.push({ text: text.slice(position, range.start), detail: false });
		parts.push({ text: range.text, detail: true });
		position = range.start + range.text.length;
	}
	if (position < text.length)
		parts.push({ text: text.slice(position), detail: false });
	return parts;
}

const progress = (time: number, start: number, duration: number) =>
	Math.max(0, Math.min(1, (time - start) / duration));

// A short silent storyboard, not a real call or a service-speed benchmark.
export function getVisualFrame(elapsed: number) {
	const time = Number.isFinite(elapsed)
		? Math.max(0, Math.min(VISUAL_DURATION, elapsed))
		: 0;
	const answeredAt = VISUAL_CONVERSATION[0].at;
	const bookedAt =
		VISUAL_TRANSFERS.booking.at + VISUAL_TRANSFERS.booking.duration;
	const endedAt = VISUAL_CONVERSATION[7].at;
	const phase =
		time < answeredAt ? 0 : time < bookedAt ? 1 : time < SUMMARY_END ? 2 : 3;
	const messages = VISUAL_CONVERSATION.filter(({ at }) => time >= at).length;
	const nextMessage = VISUAL_CONVERSATION[messages];
	const stepProgress = [
		progress(time, 0, VISUAL_CONVERSATION[1].at),
		progress(
			time,
			VISUAL_CONVERSATION[1].at,
			bookedAt - VISUAL_CONVERSATION[1].at,
		),
		progress(time, bookedAt, SUMMARY_END - bookedAt),
	];
	const checkProgress = [VISUAL_CONVERSATION[1].at, bookedAt, SUMMARY_END].map(
		(end) => progress(time, end, VISUAL_CHECK_DURATION),
	);
	return {
		phase,
		complete: time === VISUAL_DURATION,
		activeStep: stepProgress.findIndex((value) => value < 1),
		stepProgress,
		checkProgress,
		messages,
		highlights: VISUAL_CONVERSATION.map(
			({ at }) => time >= at + DETAIL_HIGHLIGHT_DELAY,
		),
		typing: Boolean(nextMessage && time >= nextMessage.at - 500),
		callerTyping: nextMessage?.speaker === 'caller',
		answered: phase > 0,
		booked: phase >= 2,
		summarized: phase === 3,
		bookingStarted: time >= VISUAL_TRANSFERS.booking.at,
		bookingProgress: progress(
			time,
			VISUAL_TRANSFERS.booking.at,
			VISUAL_TRANSFERS.booking.duration,
		),
		summaryStarted: time >= VISUAL_TRANSFERS.summary.at,
		summaryProgress: progress(
			time,
			VISUAL_TRANSFERS.summary.at,
			VISUAL_TRANSFERS.summary.duration,
		),
		status: [
			'Incoming call',
			'Ringlume is on the call',
			'Estimate booked',
			'Your team is in the loop',
		][phase],
		timer: `0:${String(Math.floor(Math.min(endedAt - answeredAt, Math.max(0, time - answeredAt)) / 1000)).padStart(2, '0')}`,
	};
}

// The clock cannot wrap or restart itself. Only the playback button can replay it.
export function createVisualPlayback() {
	let elapsed = 0;
	let paused = false;
	return {
		get state() {
			const complete = elapsed === VISUAL_DURATION;
			return {
				elapsed,
				paused,
				complete,
				label: complete
					? 'Replay'
					: paused
						? 'Resume animation'
						: 'Pause animation',
			};
		},
		advance(delta: number) {
			if (!paused && Number.isFinite(delta))
				elapsed = Math.min(VISUAL_DURATION, elapsed + Math.max(0, delta));
		},
		press() {
			if (elapsed === VISUAL_DURATION) {
				elapsed = 0;
				paused = false;
			} else paused = !paused;
		},
		finish() {
			elapsed = VISUAL_DURATION;
			paused = false;
		},
	};
}

// Clamp the message origin to the visible inbox, including on stacked mobile layouts.
export function getVisualTransferOrigin(
	source: { left: number; top: number; width: number; height: number },
	inbox: { left: number; top: number; width: number; height: number },
	target: { left: number; top: number; width: number; height: number },
) {
	const x = Math.max(
		inbox.left,
		Math.min(inbox.left + inbox.width, source.left + source.width / 2),
	);
	const y = Math.max(
		inbox.top,
		Math.min(inbox.top + inbox.height, source.top + source.height / 2),
	);
	return {
		x: x - target.left - target.width / 2,
		y: y - target.top - target.height / 2,
	};
}
