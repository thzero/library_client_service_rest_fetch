// import crc32 from 'crc/crc32'

import LibraryClientConstants from '@thzero/library_client/constants';

import LibraryCommonUtility from '@thzero/library_common/utility';

import RestCommunicationService from '@thzero/library_client/service/restCommunication';

const separator = ': ';
const acceptType = 'accept';
const contentType = 'Content-Type';
const contentTypeJson = 'application/json';

class FetchRestCommunicationService extends RestCommunicationService {
	constructor() {
		super();

		this._serviceAuth = null;
	}

	async init(injector) {
		await super.init(injector);

		this._serviceAuth = this._injector.getService(LibraryClientConstants.InjectorKeys.SERVICE_AUTH);
	}

	async delete(correlationId, key, url, options) {
		const executor = await this._create(correlationId, key, options);
		return await this._validate(correlationId, await executor.delete(LibraryCommonUtility.formatUrl(url)));
	}

	async deleteById(correlationId, key, url, id, options) {
		options = options ? options : {};
		options.ignoreContentType = true;
		const executor = await this._create(correlationId, key, options);
		return await this._validate(correlationId, await executor.delete(LibraryCommonUtility.formatUrlParams(url, id)));
	}

	async get(correlationId, key, url, options) {
		const executor = await this._create(correlationId, key, options);
		return await this._validate(correlationId, await executor.get(LibraryCommonUtility.formatUrl(url)));
	}

	async getById(correlationId, key, url, id, options) {
		const executor = await this._create(correlationId, key, options);
		return await this._validate(correlationId, await executor.get(LibraryCommonUtility.formatUrlParams(url, id)));
	}

	async post(correlationId, key, url, body, options) {
		const executor = await this._create(correlationId, key, options);
		return await this._validate(correlationId, await executor.post(LibraryCommonUtility.formatUrl(url), body));
	}

	async postById(correlationId, key, url, id, body, options) {
		const executor = await this._create(correlationId, key, options);
		return await this._validate(correlationId, await executor.post(LibraryCommonUtility.formatUrlParams(url, id), body));
	}

	async _create(correlationId, key, opts) {
		const config = this._config.getBackend(key);
		let baseUrl = config.baseUrl;
		if (!baseUrl.endsWith('/'))
			baseUrl += '/';

		if (opts && opts.replacements)
			baseUrl = baseUrl.replace(/\{([^\}]+)?}/g, ($1, $2) => { return opts.replacements[$2]; });

		const token = await this._addTokenHeader();
		const headers = {};
		if (config.apiKey)
			headers[LibraryClientConstants.Headers.AuthKeys.API] = config.apiKey;
		// eslint-disable-next-line
		if (!(opts && opts.ignoreCorrelationId))
			headers[LibraryClientConstants.Headers.CorrelationId] = correlationId ? correlationId : LibraryCommonUtility.generateId();
		if (token && !(opts && opts.ignoreToken))
			headers[LibraryClientConstants.Headers.AuthKeys.AUTH] = LibraryClientConstants.Headers.AuthKeys.AUTH_BEARER + separator + token;

		let ignoreAcceptType = false;
		if (opts && (opts.ignoreAcceptType !== null || opts.ignoreAcceptType !== undefined))
			ignoreAcceptType = opts.ignoreAcceptType;
		if (!ignoreAcceptType)
			headers[acceptType] = (opts && opts.acceptType != null ? opts.acceptType : contentTypeJson);

		let ignoreContentType = false;
		if (opts && (opts.ignoreContentType !== null || opts.ignoreContentType !== undefined))
			ignoreContentType = opts.ignoreContentType;
		if (!ignoreContentType)
			headers[contentType] = (opts && opts.contentType != null ? opts.contentType : contentTypeJson);

		if (opts && opts.headers)
			// opts = Object.assign(headers, opts.headers);
			opts = { ...headers, ...opts.headers };

		let options = {
			baseURL: baseUrl,
			headers: headers,
			validateStatus: function (status) {
				return status >= 200 && status <= 503;
			}
		};

		const instance = {
			delete: async (url) => { 
				options.method = 'DELETE';
				return await fetch(options.baseURL + url, options);
			},
			get: async (url) => { 
				options.method = 'GET';
				return await fetch(options.baseURL + url, options);
			},
			post: async (url, body) => { 
				options.method = 'POST';
				options.body = JSON.stringify(body);
				return await fetch(options.baseURL + url, options);
			}
		};

		return instance;
	}

	_requestNewToken() {
		return this._serviceAuth.refreshToken(null, true);
	}

	async _validate(correlationId, response) {
		if (response.status === 200) {
			// TODO: CRC
			// if (response.data.results && response.data.results.data) {
			// 	const dataCheck = crc32(JSON.stringify(response.data.results)).toString(16)
			// 	if (!response.data.check != dataCheck)
			// 		return this._error('FetchRestCommunicationService', '_validate')
			// }
			return await response.json();
		}

		if (response.status === 401)
			this._requestNewToken(correlationId, true);

		return this._error('FetchRestCommunicationService', '_validate', null, null, null, null, correlationId);
	}
}

export default FetchRestCommunicationService;
