import { describe, expect, it, vi } from 'vitest';

import FetchRestCommunicationService from '../index';

const create = async (opts) => {
	const service = new FetchRestCommunicationService();
	service._logger = { debug() {}, error() {}, exception() {} };
	service._config = { getBackend: () => ({ baseUrl: 'http://api/' }) };
	service._addTokenHeader = async () => 'token';
	const fetch = vi.fn(async () => ({ status: 200, json: async () => ({ success: true }) }));
	vi.stubGlobal('fetch', fetch);
	try {
		const instance = await service._create('cid', 'backend', opts);
		await instance.get('x');
		return fetch.mock.calls[0][1].headers;
	}
	finally {
		vi.unstubAllGlobals();
	}
};

describe('FetchRestCommunicationService headers', () => {
	it('sends a caller\'s headers with the defaults', async () => {
		const headers = await create({ headers: { 'x-extra': 'yes' } });

		// merged into opts and never sent
		expect(headers['x-extra']).toBe('yes');
		expect(headers['correlation-id']).toBe('cid');
		expect(headers.authorization).toContain('token');
	});

	it('sends the accept and content types by default', async () => {
		const headers = await create();

		expect(headers.Accept ?? headers.accept).toBeDefined();
		expect(headers['Content-Type'] ?? headers['content-type']).toBeDefined();
	});

	it('leaves them out when asked to', async () => {
		const headers = await create({ ignoreAcceptType: true, ignoreContentType: true });

		expect(headers.Accept ?? headers.accept).toBeUndefined();
		expect(headers['Content-Type'] ?? headers['content-type']).toBeUndefined();
	});
});
