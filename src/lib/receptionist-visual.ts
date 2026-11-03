export const VISUAL_DURATION = 10000;

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

// A short silent storyboard, not a real call or a service-speed benchmark.
export function getVisualFrame(elapsed: number) {
	const time = Number.isFinite(elapsed)
		? Math.max(0, elapsed) % VISUAL_DURATION
		: 0;
	const answeredAt = VISUAL_CONVERSATION[0].at;
	const bookedAt = VISUAL_CONVERSATION[6].at;
	const endedAt = VISUAL_CONVERSATION[7].at;
	const phase =
		time < answeredAt ? 0 : time < bookedAt ? 1 : time < 6500 ? 2 : 3;
	const messages = VISUAL_CONVERSATION.filter(({ at }) => time >= at).length;
	const nextMessage = VISUAL_CONVERSATION[messages];
	return {
		phase,
		activeStep: phase - 1,
		messages,
		typing: Boolean(nextMessage && time >= nextMessage.at - 500),
		callerTyping: nextMessage?.speaker === 'caller',
		answered: phase > 0,
		booked: phase >= 2,
		summarized: phase === 3,
		status: [
			'Incoming call',
			'Ringlume is on the call',
			'Estimate booked',
			'Your team is in the loop',
		][phase],
		timer: `0:${String(Math.floor(Math.min(endedAt - answeredAt, Math.max(0, time - answeredAt)) / 1000)).padStart(2, '0')}`,
	};
}
