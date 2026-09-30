import { beforeEach, describe, expect, it, vi } from 'vitest';

import FetchRestCommunicationService from '../index';

describe('FetchRestCommunicationService._validate', () => {
	let service;

	beforeEach(() => {
		service = new FetchRestCommunicationService();
		service._logger = { debug() {}, error() {}, exception: vi.fn() };
	});

	it('returns the body of a 200', async () => {
		const body = { success: true, results: { a: 1 } };

		expect(await service._validate('cid', { status: 200, json: async () => body })).toEqual(body);
	});

	it('refreshes the token on a 401, and waits for it', async () => {
		let refreshed = false;
		const spy = vi.spyOn(service, '_refreshToken').mockImplementation(async () => { refreshed = true; });

		const response = await service._validate('cid', { status: 401 });

		// it called refreshToken(null, true): no correlationId, the user as true
		expect(spy).toHaveBeenCalledWith('cid', true);
		expect(refreshed).toBe(true);
		expect(response.success).toBe(false);
	});

	it('logs a failed refresh instead of throwing it', async () => {
		vi.spyOn(service, '_refreshToken').mockRejectedValue(new Error('refresh failed'));

		const response = await service._validate('cid', { status: 401 });

		expect(response.success).toBe(false);
		expect(service._logger.exception).toHaveBeenCalled();
	});

	it('does not refresh on other failures', async () => {
		const spy = vi.spyOn(service, '_refreshToken');

		await service._validate('cid', { status: 500 });

		expect(spy).not.toHaveBeenCalled();
	});
});
