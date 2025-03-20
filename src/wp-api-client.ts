import { isRecord, isString } from '@tool-belt/type-predicates'
import { URLSearchParams } from 'url'
import {
	WP_Post_Type_Name,
	WP_REST_API_Application_Password,
	WP_REST_API_Block,
	WP_REST_API_Block_Directory_Item,
	WP_REST_API_Block_Type,
	WP_REST_API_Rendered_Block,
	WP_REST_API_Search_Result,
	WP_REST_API_Settings,
	WP_REST_API_Status,
	WP_REST_API_Taxonomy,
	WP_REST_API_Type,
} from 'wp-types'

import {
	END_POINT,
	END_POINT_PROTECTED,
	ERROR_MESSAGE,
	TRASHABLE,
} from './constants'
import { FetchClient } from './fetch-client'
import {
	AUTH_TYPE,
	DefaultEndpoint,
	DefaultEndpointWithRevision,
	EndpointCreate,
	EndpointDelete,
	EndpointDeleteUntrashable,
	EndpointFind,
	EndpointFindAll,
	EndpointFindOnly,
	EndpointTotal,
	EndpointUpdate,
	EndpointUpdateMedia,
	EndpointUpdatePartial,
	RenderedBlockDto,
	WpApiOptions,
	WPCategory,
	WPComment,
	WPMedia,
	WPPage,
	WPPlugin,
	WPPost,
	WpRestApiContext,
	WPTag,
	WPTheme,
	WPUser,
	GDPost,
	GDCategory,
	GDSearchParams,
	GDSearchResult,
	IMacGeneral,
	IMacGeneralData,
	IArchiveItems,
	IMacGeneralDetails,
	IGeneral,
	PostTypesResponse,
	CountryResponse,
	GDField,
	GDReview,
	GDSettingsGroup,
	GDSetting
} from './types'
import {
	getDefaultQueryList,
	getDefaultQuerySingle,
	getDeleteUri,
	postCreate,
} from './util'

// export interface UserRegistrationParams {
// 	email: string
// 	username: string
// 	password: string
// }

// export interface UserRegistrationResponse {
// 	success: boolean
// 	user_id: number
// 	token?: string
// }

export class WpApiClient {
	protected readonly authHeader?:
		| { Authorization: string }
		| { 'X-WP-Nonce': string }
	protected readonly headers?: Record<string, string>
	protected readonly http: FetchClient
	protected readonly baseUrl: URL

	// protected readonly geocodingApiKey?: string

	constructor(
		baseUrl: string,
		protected readonly options: WpApiOptions = {
			auth: { type: AUTH_TYPE.NONE },
			protected: END_POINT_PROTECTED,
		},
	) {
		if (options.auth?.type === AUTH_TYPE.BASIC) {
			const authString = `${options.auth.username}:${options.auth.password}`
			this.authHeader = {
				Authorization: `Basic ${Buffer.from(authString).toString(
					'base64',
				)}`,
			}
		}
		if (options.auth?.type === AUTH_TYPE.JWT)
			this.authHeader = {
				Authorization: `Bearer ${options.auth.token}`,
			}
		if (options.auth?.type === AUTH_TYPE.NONCE)
			this.authHeader = {
				'X-WP-Nonce': options.auth.nonce,
			}
		this.baseUrl = new URL(options.restBase ?? 'wp-json', baseUrl)
		this.headers = options.headers || {...this.authHeader}
		
		this.http = new FetchClient(
			this.baseUrl,
			options.onError,
			this.headers,
			this.authHeader,
			options.protected,
			options.public,
			<AUTH_TYPE | undefined>options.auth?.type,
		)
	}

	// PROTECTED

	protected createEndpointGet<P>(
		endpoint: string,
		defaultQuery = new URLSearchParams(),
	): EndpointFind<P> {
		return async (query?: URLSearchParams | number, ...ids: number[]) => {
			ids = typeof query === 'number' ? [query, ...ids] : ids
			query =
				typeof query === 'number'
					? defaultQuery
					: new URLSearchParams({
							...Object.fromEntries(defaultQuery),
							...Object.fromEntries(query ?? defaultQuery),
					  })
			if (!ids.length) {
				return (
					(await this.http.get<P[] | undefined>(
						`${endpoint}/${getDefaultQueryList(query)}`,
					)) ?? <P[]>[]
				)
			} else {
				return Promise.all(
					ids.map(async postId =>
						this.http.get<P>(
							`${endpoint}/${postId}/${getDefaultQuerySingle(
								<undefined | URLSearchParams>query,
							)}`,
						),
					),
				)
			}
		}
	}

	protected createEndpointGetAll<P>(
		endpoint: string,
		defaultQuery = new URLSearchParams({ page: '1' }),
	): EndpointFindAll<P> {
		return async (query?: URLSearchParams) => {
			query = new URLSearchParams({
				...Object.fromEntries(defaultQuery),
				...Object.fromEntries(query ?? defaultQuery),
			})
			return this.http.getAll<P>(
				`${endpoint}/${getDefaultQueryList(query)}`,
			)
		}
	}

	protected createEndpointPost<P>(
		endpoint: string,
	): (body: Partial<P>, id?: number) => Promise<P> {
		return async (body: Partial<P>, id = 0) => {
			if (id)
				return this.http.post<P>(
					`${endpoint}/${id}`,
					undefined,
					JSON.stringify(
						postCreate<Partial<P>>({
							...body,
						}),
					),
				)
			else
				return this.http.post<P>(
					`${endpoint}`,
					undefined,
					JSON.stringify(
						postCreate<Partial<P>>({
							...body,
						}),
					),
				)
		}
	}

	protected createEndpointDelete<P>(
		endpoint: string,
		params?: URLSearchParams,
	): EndpointDelete<P> {
		const trashable = this.options.trashable ?? TRASHABLE
		return async (...ids: number[]) => {
			if (!ids.length) throw new Error(ERROR_MESSAGE.ID_REQUIRED)
			return Promise.all(
				ids.map(id =>
					this.http.delete<P>(
						getDeleteUri(endpoint, id, params, trashable),
					),
				),
			)
		}
	}

	protected createEndpointCustomGet<T, R = null>(
		endPoint: string,
	): () => Promise<T | R> {
		return async (): Promise<T | R> => {
			return this.http.get<T>(endPoint)
		}
	}

	protected createEndpointCustomPost<T, R = null>(
		endPoint: string,
	): (body: T) => Promise<T | R> {
		return async (body: T): Promise<T | R> => {
			return this.http.post<T>(endPoint, undefined, JSON.stringify(body))
		}
	}

	protected createEndpointTotal(
		endpoint: string,
		defaultQuery = new URLSearchParams(),
	): EndpointTotal {
		return async () =>
			this.http.getTotal(`${endpoint}/?${defaultQuery.toString()}`)
	}

	protected defaultEndpoints<P = WPPost>(
		endpoint: string,
		defaultParams?: URLSearchParams,
	): DefaultEndpoint<P> {
		return {
			create: this.createEndpointPost<P>(endpoint),
			find: this.createEndpointGet<P>(endpoint, defaultParams),
			update: this.createEndpointPost<P>(endpoint),
			delete: this.createEndpointDelete<P>(endpoint),
			dangerouslyFindAll: this.createEndpointGetAll<P>(
				endpoint,
				defaultParams,
			),
			total: this.createEndpointTotal(endpoint, defaultParams),
		}
	}

	protected addPostType<P = WPPost>(
		endpoint: string,
		withRevisions: true,
		defaultParams?: URLSearchParams,
	): DefaultEndpointWithRevision<P>
	protected addPostType<P = WPPost>(
		endpoint: string,
		withRevisions?: false,
		defaultParams?: URLSearchParams,
	): DefaultEndpoint<P>
	protected addPostType<P = WPPost>(
		endpoint: string,
		withRevisions = false,
		defaultParams?: URLSearchParams,
	): {
		find: EndpointFind<P>
		create: EndpointCreate<P>
		delete: EndpointDelete<P>
		update: EndpointUpdate<P>
		revision?: (postId: number) => {
			find: EndpointFind<P>
			create: EndpointCreate<P>
			delete: EndpointDelete<P>
			update: EndpointUpdate<P>
		}
	} {
		return {
			...this.defaultEndpoints(endpoint, defaultParams),
			revision: !withRevisions
				? undefined
				: (postId: number) => ({
						...this.defaultEndpoints(
							`${endpoint}/${postId}/revisions`,
							defaultParams,
						),
				  }),
		}
	}

	// PUBLIC

	public async blockType<P = WP_REST_API_Block_Type>(): Promise<P[]>
	public async blockType<P = WP_REST_API_Block_Type>(
		blockType: WP_Post_Type_Name | string,
	): Promise<P>
	public async blockType<P = WP_REST_API_Block_Type>(
		blockType?: WP_Post_Type_Name | string,
	): Promise<P | P[]> {
		return blockType
			? this.http.get<P>(`${END_POINT.BLOCK_TYPES}/${blockType}`)
			: this.http.get<P[]>(END_POINT.BLOCK_TYPES)
	}

	public async blockDirectory<P = WP_REST_API_Block_Directory_Item>(
		term: string,
		page = 1,
		perPage = 10,
	): Promise<P[]> {
		return this.http.get<P[]>(
			`${END_POINT.BLOCK_DIRECTORY}?${new URLSearchParams({
				page: String(page),
				per_page: String(perPage),
				term,
			}).toString()}`,
		)
	}

	public comment<P = WPComment>(): DefaultEndpoint<P> {
		return this.addPostType<P>(END_POINT.COMMENTS, false)
	}

	public media<P extends WPMedia>(): {
		find: EndpointFind<P>
		create: (
			fileName: string,
			file: Buffer,
			mimeType?: string,
			data?: Partial<P>,
			caption?: string,
		) => Promise<P>
		delete: EndpointDeleteUntrashable<P>
		update: EndpointUpdateMedia<P>
	} {
		const find = this.createEndpointGet<P>(END_POINT.MEDIA)
		const update = <EndpointUpdateMedia<P>>(
			this.createEndpointPost<P>(END_POINT.MEDIA)
		)
		/**
		 * @param {string} fileName Must include the file extension
		 * @param {Buffer} file Takes a `Buffer` as input
		 * @param {string} mimeType E.g.: `image/jpeg`
		 * @param {WPMedia} data Optional, populates media library item with a second request
		 * */
		const create = async (
			fileName: string,
			file: Buffer,
			mimeType = 'image/jpeg',
			data?: Partial<P>,
		): Promise<P> => {
			if (!fileName.includes('.'))
				throw new Error(
					ERROR_MESSAGE.INVALID_FILENAME.replace(
						'%fileName%',
						fileName,
					),
				)
			const headers = {
				'Content-Disposition': `attachment; filename="${fileName}"`,
				'Content-Type': mimeType,
			}
			const result = await this.http.post<P>(
				END_POINT.MEDIA,
				headers,
				file,
			)
			if (data)
				return <Promise<P>>(
					update(
						<Omit<P, 'caption'> & { caption?: string }>data,
						result.id,
					)
				)
			return result
		}
		const deleteOne = <EndpointDeleteUntrashable<P>>(
			this.createEndpointDelete<P>(
				END_POINT.MEDIA,
				new URLSearchParams({}),
			)
		)
		return {
			find,
			create,
			delete: deleteOne,
			update,
		}
	}

	public page<P = WPPage>(): DefaultEndpointWithRevision<P> {
		return this.addPostType<P>(END_POINT.PAGES, true)
	}

	public plugin<P = WPPlugin>(): {
		create: (plugin: string, status?: 'active' | 'inactive') => Promise<P>
		find: (plugin?: string) => Promise<P[]>
		update: (
			plugin: string,
			status?: 'active' | 'inactive',
			context?: WpRestApiContext,
		) => Promise<P>
		delete: (plugin: string) => Promise<P>
	} {
		return {
			create: async (plugin: string, status = 'inactive') =>
				this.http.post<P>(
					END_POINT.PLUGINS,
					undefined,
					JSON.stringify({
						slug: plugin,
						status,
					}),
				),
			find: async (plugin = '') =>
				plugin
					? [await this.http.get<P>(`${END_POINT.PLUGINS}/${plugin}`)]
					: this.http.get<P[]>(`${END_POINT.PLUGINS}`),
			update: async (
				plugin: string,
				status: 'active' | 'inactive' = 'inactive',
				context: WpRestApiContext = 'view',
			) =>
				this.http.post<P>(
					`${END_POINT.PLUGINS}/${plugin}?status=${status}&context=${context}`,
				),
			delete: async (plugin: string) =>
				this.http.delete<P>(`${END_POINT.PLUGINS}/${plugin}`),
		}
	}

	public post<P = WPPost>(): DefaultEndpointWithRevision<P> {
		return this.addPostType<P>(END_POINT.POSTS, true)
	}

	public postCategory<P = WPCategory>(): DefaultEndpoint<P> {
		const deleteOne = this.createEndpointDelete<P>(
			END_POINT.CATEGORIES,
			new URLSearchParams({}),
		)
		return {
			...this.addPostType<P>(END_POINT.CATEGORIES, false),
			delete: deleteOne,
		}
	}

	public postTag<P = WPTag>(): DefaultEndpoint<P> {
		const deleteOne = this.createEndpointDelete<P>(
			END_POINT.TAGS,
			new URLSearchParams({}),
		)
		return {
			...this.addPostType<P>(END_POINT.TAGS, false),
			delete: deleteOne,
		}
	}

	public async postType<P = WP_REST_API_Type>(): Promise<P[]>
	public async postType<P = WP_REST_API_Type>(
		postType: WP_Post_Type_Name | string,
	): Promise<P>
	public async postType<P = WP_REST_API_Type>(
		postType?: WP_Post_Type_Name | string,
	): Promise<P | P[]> {
		return postType
			? this.http.get<P>(`${END_POINT.TYPES}/type/${postType}`)
			: this.http.get<P[]>(END_POINT.TYPES)
	}

	public async renderedBlock<P = WP_REST_API_Rendered_Block>(
		body: RenderedBlockDto,
	): Promise<P> {
		return this.http.post<P>(
			`${END_POINT.BLOCK_RENDERER}/${body.name}`,
			undefined,
			JSON.stringify({
				name: body.name,
				post_id: body.postId,
				attributes: body.attributes ?? [],
				context: body.context ?? 'view',
			}),
		)
	}

	public reusableBlock<P = WP_REST_API_Block>(): DefaultEndpoint<P> & {
		autosave: (blockId: number) => {
			create: EndpointCreate<P & { parent: number }>
			find: EndpointFind<P & { parent: number }>
		}
	} {
		return {
			...this.defaultEndpoints(END_POINT.EDITOR_BLOCKS),
			autosave: (blockId: number) => {
				const endpoint = `${END_POINT.EDITOR_BLOCKS}/${blockId}/autosaves`
				return {
					create: this.createEndpointPost(endpoint),
					find: this.createEndpointGet(endpoint),
				}
			},
		}
	}

	public async search<S = WP_REST_API_Search_Result>(
		search?: string,
		params?: Record<string, string> &
			Partial<{
				context: string
				page: string
				per_page: string
				type: string
				subtype: string
			}>,
	): Promise<S[]> {
		if (search) params = { ...(<Record<string, string>>params), search }
		const query = new URLSearchParams(params).toString()
		return this.http.get<S[]>(`${END_POINT.SEARCH}/?${query}`)
	}

	public siteSettings<P = WP_REST_API_Settings>(): {
		find: EndpointFindOnly<P>
		update: EndpointUpdatePartial<P>
	} {
		return {
			find: <EndpointFindOnly<P>>(
				this.createEndpointCustomGet<P, P>(END_POINT.SETTINGS)
			),
			update: <EndpointUpdatePartial<P>>(
				this.createEndpointCustomPost<Partial<P>, P>(END_POINT.SETTINGS)
			),
		}
	}

	public async status<P = WP_REST_API_Status>(): Promise<P[]>
	public async status<P = WP_REST_API_Status>(
		status: WP_Post_Type_Name | string,
	): Promise<P>
	public async status<P = WP_REST_API_Status>(
		status?: WP_Post_Type_Name | string,
	): Promise<P | P[]> {
		return status
			? this.http.get<P>(`${END_POINT.STATUSES}/${status}`)
			: this.http.get<P[]>(END_POINT.STATUSES)
	}

	public user<P = WPUser>(): {
		find: EndpointFind<P>
		findMe: EndpointFindOnly<P>
		create: (
			body: Partial<P> &
				Required<{ email: string; username: string; password: string }>,
		) => Promise<P | null>
		// register: (
		// 	body: Partial<P> &
		// 		Required<{ email: string; username: string; password: string }>,
		// ) => Promise<P | null>
		update: (
			body: Partial<P> & Required<{ password: string }>,
			userId: number,
		) => Promise<P | null>
		delete: (
			reassign: number,
			...userIds: number[]
		) => Promise<(P | null)[]>
		deleteMe: (reassign: number) => Promise<P>
	} {
		const findMe = async () => this.http.get<P>(END_POINT.USERS_ME)
		// const register = this.createEndpointPost<P>(`${END_POINT.USERS}/register`)
		const deleteUsers = async (reassign: number, ...userIds: number[]) => {
			if (!userIds.length)
				throw new Error(
					ERROR_MESSAGE.MISSING_REQUIRED_PARAM.replace(
						'%PARAM%',
						'"reassign"',
					),
				)
			return Promise.all(
				userIds.map(id =>
					this.http.delete<P>(
						`${END_POINT.USERS}/${String(id)}?${new URLSearchParams(
							{
								force: String(true),
								reassign: String(reassign),
							},
						).toString()}`,
					),
				),
			)
		}
		const deleteMe = async (reassign: number) =>
			this.http.delete<P>(
				`${END_POINT.USERS_ME}?${new URLSearchParams({
					force: String(true),
					reassign: String(reassign),
				}).toString()}`,
			)
		return {
			...this.addPostType<P>(END_POINT.USERS),
			findMe,
			// register,
			delete: deleteUsers,
			deleteMe,
		}
	}

	// public userRegister(): {
	// 	create: (body: UserRegistrationParams) => Promise<UserRegistrationResponse>
	// 	find: EndpointFind<UserRegistrationResponse>
	// 	update: EndpointUpdate<UserRegistrationResponse>
	// 	delete: EndpointDelete<UserRegistrationResponse>
	// } {
	// 	return this.addPostType<UserRegistrationResponse>('mac/user_register', false)
	// }

	public async taxonomy<P = WP_REST_API_Taxonomy>(
		query: { context?: 'edit' | 'embed' | 'view'; type?: string },
		...slugs: string[]
	): Promise<P[]>
	public async taxonomy<P = WP_REST_API_Taxonomy>(
		...slugs: string[]
	): Promise<P[]>
	public async taxonomy<P = WP_REST_API_Taxonomy>(
		query?: { context?: 'edit' | 'embed' | 'view'; type?: string } | string,
		...slugs: string[]
	): Promise<P[]> {
		slugs = isString(query) ? [query, ...slugs] : slugs
		query = isRecord(query) ? query : undefined
		if (!slugs.length) {
			return (
				(await this.http.get<P[] | undefined>(
					`${END_POINT.TAXONOMIES}/${getDefaultQueryList(
						new URLSearchParams(query),
					)}`,
				)) ?? <P[]>[]
			)
		} else {
			return Promise.all(
				slugs.map(slug =>
					this.http.get<P>(
						`${
							END_POINT.TAXONOMIES
						}/${slug}/${getDefaultQuerySingle(
							isRecord(query)
								? new URLSearchParams(query)
								: undefined,
						)}`,
					),
				),
			)
		}
	}

	public async theme<P = WPTheme>(): Promise<P[]> {
		return this.http.get<P[]>(END_POINT.THEMES)
	}

	public applicationPassword() {
		const find = async (
			userId: number,
			uuids: string[] = [],
		): Promise<WP_REST_API_Application_Password[]> => {
			const endpoint = `${END_POINT.USERS}/${String(userId)}/${
				END_POINT.USER_APPLICATION_PASSWORDS
			}`
			if (!uuids.length) {
				return this.http.get<WP_REST_API_Application_Password[]>(
					endpoint,
				)
			}
			return Promise.all(
				uuids.map(async uuid =>
					this.http.get<WP_REST_API_Application_Password>(
						`${endpoint}/${uuid}`,
					),
				),
			)
		}
		const create = async (
			userId: number,
			appId: string,
			name: string,
		): Promise<Required<WP_REST_API_Application_Password>> => {
			const endpoint = `${END_POINT.USERS}/${String(userId)}/${
				END_POINT.USER_APPLICATION_PASSWORDS
			}`
			return this.http.post<Required<WP_REST_API_Application_Password>>(
				`${endpoint}?${new URLSearchParams({
					app_id: appId,
					name,
				}).toString()}`,
			)
		}
		const update = async (
			userId: number,
			uuid: string,
			appId?: string,
			name?: string,
		): Promise<WP_REST_API_Application_Password> => {
			const endpoint = `${END_POINT.USERS}/${String(userId)}/${
				END_POINT.USER_APPLICATION_PASSWORDS
			}/${uuid}`
			const params = new Map()
			if (name) params.set('name', name)
			if (appId) params.set('app_id', appId)
			return this.http.post<WP_REST_API_Application_Password>(
				`${endpoint}?${new URLSearchParams(params).toString()}`,
			)
		}
		const deleteOne = async (userId: number, uuid: string) => {
			const endpoint = `${END_POINT.USERS}/${String(userId)}/${
				END_POINT.USER_APPLICATION_PASSWORDS
			}/${uuid}`
			return this.http.delete(endpoint)
		}
		return {
			create,
			delete: deleteOne,
			find,
			update,
		}
	}

	// GD ENDPOINTS

	public gdPostTypes<T = PostTypesResponse>(): Promise<T> {
		try {
			const endpoint = 'geodir/v2/types';
			return this.createEndpointCustomGet<T, T>(endpoint)();
		} catch (error) {
			throw new Error(`Failed to fetch GD post types: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	public gdCategories<C = GDCategory>(postType: string, params: {
		per_page?: number,
		page?: number
		categoryKey?: string,
	} = {}): Promise<C[]> {
		try {
			if (!postType?.trim()) {
				throw new Error('Post type is required for GD categories');
			}

			const query = new URLSearchParams({
				per_page: String(params.per_page || 100),
				page: String(params.page || 1),
			});

			const endpoint = `geodir/v2/${postType}/categories?${query.toString()}`;
			return this.createEndpointCustomGet<C[], C[]>(endpoint)();
		} catch (error) {
			throw new Error(`Failed to process GD categories request: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	public gdCountries<P = CountryResponse>(): DefaultEndpoint<P> {
		const endpoint = 'geodir/v2/countries';
		return this.defaultEndpoints<P>(endpoint);
	}

	public gdFields<F = GDField>() {
		const endpoint = 'geodir/v2/fields';
		return {
			find: async (query?: URLSearchParams | number, ...ids: number[]) => {
				try {
					if (typeof query === 'number') {
						ids = [query, ...ids];
						query = new URLSearchParams();
					}

					if (!ids.length) {
						const defaultQuery = new URLSearchParams({
							status: '1',
							default: 'all',
							access: 'all',
							location: 'none',
							order: 'asc',
							orderby: 'order',
							page: '1',
							per_page: '100'
						});

						const finalQuery = new URLSearchParams({
							...Object.fromEntries(defaultQuery),
							...Object.fromEntries(query ?? defaultQuery)
						});

						return this.createEndpointCustomGet<F[], F[]>(`${endpoint}?${finalQuery.toString()}`)();
					} else {
						return Promise.all(
							ids.map(id => this.createEndpointCustomGet<F>(`${endpoint}/${id}`)())
						);
					}
				} catch (error) {
					throw new Error(`Failed to fetch GD fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
				}
			}
		};
	}

	public gdReviews<P = GDReview>(): DefaultEndpoint<P> & { customUpdate: (id: number, body: Partial<P>) => Promise<P>; } {
		const endpoint = 'geodir/v2/reviews';
		const defaultEndpoints = this.defaultEndpoints<P>(endpoint);
		return {
			...defaultEndpoints,
			customUpdate: async (id: number, body: Partial<P>): Promise<P> => {
                return this.createEndpointCustomPost<P, P>(`${endpoint}/${id}`)(body as P);
			},
		};
	}

	public getGDSettingsGroups<S = GDSettingsGroup>(): {
		find: () => Promise<S[] | null>;
		findOne: (id: string) => Promise<S | null>;
	} {
		const endpoint = 'geodir/v2/settings';
		const find = this.createEndpointCustomGet<S[]>(endpoint);
		const findOne = (id: string) => this.createEndpointCustomGet<S>(`${endpoint}/${id}`)();
		return {
			find,
			findOne,
		};
	}

	public GDSettings<G = GDSetting>(group: string, id: string): {
		find: () => Promise<G[] | null>;
		customUpdate: (id: string, body: Partial<G>) => Promise<G>; 
	} {
		try {
			const endpoint = `geodir/v2/settings/${group}/${id}`;
			const find = this.createEndpointCustomGet<G[]>(endpoint);
			return {
				find,
				customUpdate: async (id: string, body: Partial<G>): Promise<G> => {
					return this.createEndpointCustomPost<G, G>(`${endpoint}`)(body as G);
				},
			};
		} catch (error) {
			throw new Error(`Failed to handle GD setting: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	public gdPosts<P = GDPost>(postType: string): DefaultEndpoint<P> & { customUpdate: (id: number, body: Partial<P>) => Promise<P>; customDelete: (id: number, force?: boolean) => Promise<P> } {
		if (!postType?.trim()) {
			throw new Error('Post type is required for GD posts');
		}
		const endpoint = `geodir/v2/${postType}`;
		const defaultParams = new URLSearchParams({ force: 'false' });
		const defaultEndpoints = this.defaultEndpoints<P>(endpoint, defaultParams);

		return {
			...defaultEndpoints,
			customUpdate: async (id: number, body: Partial<P>): Promise<P> => {
                return this.createEndpointCustomPost<P, P>(`${endpoint}/${id}`)(body as P);
			},
			customDelete: async (id: number, force = false) => {
				const params = new URLSearchParams();
				if (force) params.set('force', 'true');
				return this.http.delete<P>(
					`${endpoint}/${id}${params.toString() ? '?' + params.toString() : ''}`
				);
			},
		};
	}


	// async getGDPosts(postType: string, options: {
	// 	categoryValue?: string | number;
	// 	orderby?: string;
	// 	page?: number;
	// 	perPage?: number;
	// } = {}): Promise<GDSearchResult> {
	// 	const {
	// 		categoryValue = '',
	// 		orderby = 'post_date_desc',
	// 		page = 1,
	// 		perPage = 10
	// 	} = options;

	// 	const categoryField = `gd_${postType}category`;
	// 	const url = new URL(`${this.baseUrl}/geodir/v2/${postType}`);
	// 	url.searchParams.append(categoryField, categoryValue.toString());
	// 	url.searchParams.append('orderby', orderby);
	// 	url.searchParams.append('page', page.toString());
	// 	url.searchParams.append('per_page', perPage.toString());

	// 	const response = await this.http.get<GDPost[]>(`${url.toString()}`);
	// 	const totalPages = parseInt(response.headers?.get('X-WP-TotalPages') || '1', 10);
	// 	const total = parseInt(response.headers?.get('X-WP-Total') || '0', 10);

	// 	return {
	// 		posts: response.data || [],
	// 		total,
	// 		totalPages,
	// 		currentPage: page
	// 	};
	// }

	// async getGDCategories(postType: string, page: number = 1, perPage: number = 10): Promise<GDCategory[]> {
	// 	const url = new URL(`${this.baseUrl}/geodir/v2/${postType}/categories`);
	// 	url.searchParams.append('page', page.toString());
	// 	url.searchParams.append('per_page', perPage.toString());
	// 	return this.http.get<GDCategory[]>(url.toString());
	// }

	// async searchGDPosts(params: GDSearchParams): Promise<GDSearchResult> {
	// 	const {
	// 		postType,
	// 		categoryValue = '',
	// 		orderby = 'post_date_desc',
	// 		search = '',
	// 		page = 1,
	// 		perPage = 10
	// 	} = params;

	// 	if (!postType) {
	// 		throw new Error('Post type is required for GD search');
	// 	}

	// 	const categoryField = `gd_${postType}category`;
	// 	const url = new URL(`${this.baseUrl}/geodir/v2/${postType}`);
	// 	url.searchParams.append(categoryField, categoryValue?.toString() || '');
	// 	url.searchParams.append('orderby', orderby);
	// 	url.searchParams.append('search', search);
	// 	url.searchParams.append('page', page.toString());
	// 	url.searchParams.append('per_page', perPage.toString());

	// 	const response = await this.http.get<GDPost[]>(url.toString());
	// 	const totalPages = parseInt(response.headers?.get('X-WP-TotalPages') || '1', 10);
	// 	const total = parseInt(response.headers?.get('X-WP-Total') || '0', 10);

	// 	return {
	// 		posts: response.data || [],
	// 		total,
	// 		totalPages,
	// 		currentPage: page
	// 	};
	// }

	// async getMacGeneral(): Promise<IMacGeneral> {
	// 	const response = await this.http.get(`${this.baseUrl}/mac/general`);
	// 	return response as Promise<IMacGeneral>;
	// }

	// async getLicenseStatus(): Promise<{ license: boolean }> {
	// 	const response = await this.http.get(`${this.baseUrl}/mac/license`);
	// 	return response as Promise<{ license: boolean }>;
	// }

	// async forgotPassword(email: string): Promise<{ message: string; success: boolean }> {
	// 	const response = await this.http.post(
	// 		`${this.baseUrl}/mac/forgot_password`,
	// 		{ 'Content-Type': 'application/json' },
	// 		JSON.stringify({ email })
	// 	);
	// 	return response as Promise<{ message: string; success: boolean }>;
	// }

	// async resetPassword(email: string, password: string, otp: string): Promise<{ message: string; success: boolean }> {
	// 	const response = await this.http.post(
	// 		`${this.baseUrl}/mac/reset_password`,
	// 		{ 'Content-Type': 'application/json' },
	// 		JSON.stringify({ email, password, otp })
	// 	);
	// 	return response as Promise<{ message: string; success: boolean }>;
	// }

	// async userRegister({ email, password, otp, retry }: { email: string; password: string; otp?: string; retry?: boolean }): Promise<{ message: string; status: 'Pending' | 'Active'; success: boolean }> {
	// 	const response = await this.http.post(
	// 		`${this.baseUrl}/mac/user_register`,
	// 		{ 'Content-Type': 'application/json' },
	// 		JSON.stringify({ email, password, otp, retry })
	// 	);
	// 	return response as Promise<{ message: string; status: 'Pending' | 'Active'; success: boolean }>;
	// }

	// async getTermsLink(): Promise<{ title: string; link: string }> {
	// 	const response = await this.http.get(`${this.baseUrl}/mac/get_terms_link`);
	// 	return response as Promise<{ title: string; link: string }>;
	// }

	// async getProfilePicture(userId: string): Promise<{ avatar_link: string }> {
	// 	const response = await this.http.get(`${this.baseUrl}/mac/get_profile_picture?user_id=${userId}`);
	// 	return response as Promise<{ avatar_link: string }>;
	// }

	// async updateProfilePicture({ userId, file }: { userId: string; file: File }): Promise<{ avatar_link: string }> {
	// 	const formData = new FormData();
	// 	formData.append('user_id', userId);
	// 	formData.append('file', file);

	// 	const response = await this.http.post(
	// 		`${this.baseUrl}/mac/update_profile_picture`,
	// 		{},
	// 		formData
	// 	);
	// 	return response as Promise<{ avatar_link: string }>;
	// }

	// async deactivateUser(userId: string): Promise<{ message: string }> {
	// 	const response = await this.http.get(`${this.baseUrl}/mac/deactivate_user?user_id=${userId}`);
	// 	return response as Promise<{ message: string }>;
	// }
}
