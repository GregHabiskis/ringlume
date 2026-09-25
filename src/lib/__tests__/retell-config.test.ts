import { describe, expect, it } from 'vitest';

import {
	isUsableRetellValue,
	resolveRetellConfig,
	type RetellEnv,
} from '../retell-config';

function env(overrides: Partial<RetellEnv> = {}): RetellEnv {
	return {
		PUBLIC_RETELL_VOICE_PUBLIC_KEY: 'public_key_662284caeebd49d44c29f',
		PUBLIC_RETELL_VOICE_AGENT_ID: 'agent_fe9ad8c2f25108a5476a5f9014',
		...overrides,
	};
}

describe('Retell configuration', () => {
	it('resolves a complete voice configuration', () => {
		const config = resolveRetellConfig(env());

		expect(config).toEqual({
			voicePublicKey: 'public_key_662284caeebd49d44c29f',
			voiceAgentId: 'agent_fe9ad8c2f25108a5476a5f9014',
			recaptchaKey: undefined,
		});
	});

	it('keeps an optional reCAPTCHA key when it is set', () => {
		const config = resolveRetellConfig(
			env({ PUBLIC_RETELL_RECAPTCHA_KEY: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' }),
		);

		expect(config?.recaptchaKey).toBe(
			'6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
		);
	});

	it('trims surrounding whitespace from credentials', () => {
		const config = resolveRetellConfig(
			env({
				PUBLIC_RETELL_VOICE_PUBLIC_KEY: '  public_key_abc  ',
				PUBLIC_RETELL_VOICE_AGENT_ID: '\tagent_def\n',
			}),
		);

		expect(config?.voicePublicKey).toBe('public_key_abc');
		expect(config?.voiceAgentId).toBe('agent_def');
	});

	it('returns null when the public key is missing', () => {
		expect(
			resolveRetellConfig(env({ PUBLIC_RETELL_VOICE_PUBLIC_KEY: '' })),
		).toBeNull();
	});

	it('returns null when the voice agent id is missing', () => {
		expect(
			resolveRetellConfig(env({ PUBLIC_RETELL_VOICE_AGENT_ID: undefined })),
		).toBeNull();
	});

	it('returns null while credentials are still placeholders', () => {
		expect(
			resolveRetellConfig(
				env({
					PUBLIC_RETELL_VOICE_PUBLIC_KEY: 'public_key_<replace>',
					PUBLIC_RETELL_VOICE_AGENT_ID: 'agent_<replace>',
				}),
			),
		).toBeNull();
	});

	it('treats blank and placeholder values as unusable', () => {
		expect(isUsableRetellValue(undefined)).toBe(false);
		expect(isUsableRetellValue('')).toBe(false);
		expect(isUsableRetellValue('   ')).toBe(false);
		expect(isUsableRetellValue('<your-public-key>')).toBe(false);
		expect(isUsableRetellValue('key_REPLACE_ME')).toBe(false);
		expect(isUsableRetellValue('public_key_662284caeebd49d44c29f')).toBe(
			true,
		);
	});
});
