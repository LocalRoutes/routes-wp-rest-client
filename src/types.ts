import { URLSearchParams } from 'url'
import {
	WP_REST_API_Attachment,
	WP_REST_API_Category,
	WP_REST_API_Comment,
	WP_REST_API_Post,
	WP_REST_API_Tag,
	WP_REST_API_Taxonomy,
	WP_REST_API_User,
} from 'wp-types'

export type EndpointFind<P> = (
	query?: URLSearchParams | number,
	...ids: number[]
) => Promise<(P | null)[]>

export type EndpointFindAll<P> = (query?: URLSearchParams) => Promise<P[]>

export type EndpointFindOnly<P> = () => Promise<P>

export type EndpointCreate<P> = (body: Partial<P>) => Promise<P | null>

export type EndpointDelete<P> = (...ids: number[]) => Promise<(P | null)[]>

export type EndpointDeleteUntrashable<P> = (
	...ids: number[]
) => Promise<({ deleted: boolean; previous: P } | null)[]>

export type EndpointUpdate<P> = (
	body: Partial<P>,
	id: number,
) => Promise<P | null>

export type EndpointUpdateMedia<P> = (
	body: Partial<Omit<P, 'caption'> & { caption?: string }>,
	id: number,
) => Promise<P | null>
export type EndpointTotal = () => Promise<number>

export type EndpointUpdatePartial<P> = (body: Partial<P>) => Promise<P>

export interface DefaultEndpoint<P = WPPost> {
	create: EndpointCreate<P>
	find: EndpointFind<P>
	update: EndpointUpdate<P>
	delete: EndpointDelete<P>
	dangerouslyFindAll: EndpointFindAll<P>
	total: EndpointTotal
}

export interface DefaultEndpointWithRevision<P = WPPost> {
	create: EndpointCreate<P>
	find: EndpointFind<P>
	update: EndpointUpdate<P>
	delete: EndpointDelete<P>
	dangerouslyFindAll: EndpointFindAll<P>
	total: EndpointTotal
	revision: (postId: number) => {
		// WP_REST_API_Revision
		create: EndpointCreate<P>
		find: EndpointFind<P>
		update: EndpointUpdate<P>
		delete: EndpointDelete<P>
	}
}

export interface ACFBase<A = unknown> {
	acf: A
}

export interface YoastBase {
	yoast_head_json?: YoastHead
}

// ToDo: Omit<WP_REST_API_Post, 'menu_order'>
export type WPPost<A = unknown> = WP_REST_API_Post & ACFBase<A> & YoastBase

export type WPMedia<A = unknown> = WP_REST_API_Attachment &
	ACFBase<A> &
	YoastBase

// ToDo: Fix Omit<> type hinting
export type WPPage<A = unknown> /* Omit< */ = WPPost<A> /* ,
	'categories' | 'sticky' | 'tags'
> */ & { menu_order: number; parent: number }

export type WPTaxonomy<A = unknown> = WP_REST_API_Taxonomy &
	ACFBase<A> &
	YoastBase

export type WPCategory<A = unknown> = WP_REST_API_Category &
	ACFBase<A> &
	YoastBase

export type WPComment<A = unknown> = WP_REST_API_Comment &
	ACFBase<A> &
	YoastBase

export type WPTag<A = unknown> = WP_REST_API_Tag & ACFBase<A> & YoastBase

export type WPUser<A = unknown> = WP_REST_API_User & ACFBase<A>

export interface WPPlugin {
	plugin: string
	status: string
	name: string
	plugin_uri: string
	author: string
	author_uri: string
	description: {
		raw: string
		rendered: string
	}
	version: string
	network_only: boolean
	requires_wp: string
	requires_php: string
	textdomain: string
	_links: {
		self?:
			| {
					href: string
			  }[]
			| null
	}
}

export interface WPThemeEditorColor {
	name: string
	slug: string
	color: string
}
export interface WPThemeEditorFontSize {
	name: string
	size: number
	slug: string
}
export interface WPThemeEditorGradientPreset {
	name: string
	gradient: string
	slug: string
}

export interface WPThemeSupports {
	'align-wide': boolean
	'automatic-feed-links': boolean
	'custom-background': {
		'default-image': string
		'default-preset': string
		'default-position-x': string
		'default-position-y': string
		'default-size': string
		'default-repeat': string
		'default-attachment': string
		'default-color': string
	}
	'custom-header': boolean
	'custom-logo': {
		'width': number
		'height': number
		'flex-width': boolean
		'flex-height': boolean
		'header-text'?: (string | null)[]
		'unlink-homepage-logo': boolean
	}
	'customize-selective-refresh-widgets': boolean
	'dark-editor-style': boolean
	'disable-custom-colors': boolean
	'disable-custom-font-sizes': boolean
	'disable-custom-gradients': boolean
	'editor-color-palette'?: WPThemeEditorColor[]
	'editor-font-sizes'?: WPThemeEditorFontSize[]
	'editor-gradient-presets'?: WPThemeEditorGradientPreset[]
	'editor-styles': boolean
	'html5'?: string[]
	'formats'?: string[]
	'post-thumbnails': boolean
	'responsive-embeds': boolean
	'title-tag': boolean
	'wp-block-styles': boolean
}

export interface PostTypesResponse {
  [key: string]: {
    description: string;
    hierarchical: boolean;
    name: string;
    slug: string;
    taxonomies: string[];
    rest_base: string;
    _links: {
      collection: { href: string }[];
      fields: { href: string }[];
      "wp:items": { href: string }[];
      curies: { name: string; href: string; templated: boolean }[];
    };
  };
}

export interface GDSetting {
  id: string
  label: string
  description: string
  type: string
  tip: string
  value: string
  _links: {
    self: Array<{
      href: string
    }>
    collection: Array<{
      href: string
    }>
  }
}

export interface GDReview {
  id: number
  post: number
  parent: number
  author: number
  author_name: string
  author_url: string
  date: string
  date_gmt: string
  content: {
    rendered: string
  }
  link: string
  status: string
  type: string
  post_type: string
  rating: number
  country: string
  region: string
  city: string
  latitude: string
  longitude: string
  author_avatar_urls: {
    "24": string
    "48": string
    "96": string
  }
  meta: Array<any>
  _links: {
    self: Array<{
      href: string
    }>
    collection: Array<{
      href: string
    }>
    author: Array<{
      embeddable: boolean
      href: string
    }>
    up: Array<{
      embeddable: boolean
      post_type: string
      href: string
    }>
  }
}

export interface CountryResponse {
  id: any;
  name: string;
  title: string;
  iso2: any;
  iso3: any;
  _links: {
    self: Array<{
      href: string;
    }>;
    collection: Array<{
      href: string;
    }>;
  };
}

export interface GDPost extends WPPost {
  postType: string;
  gdCategories?: number[];
  gdTags?: number[];
  gdCustomFields?: Record<string, any>;
  package_id?: string;
  slogan?: string;
  subheading?: string;
  street?: string;
  mapview?: string;
  mapzoom?: string;
  logo?: string;
  phone?: string;
  whatsapp?: string;
  facebook?: string;
  email?: string;
  website?: string;
  twitter?: string;
  instagram?: string;
  business_hours?: any;
  timing?: string;
  price?: any;
  price_range?: {
    raw: string;
    rendered: string;
  };
  gd_tourpoint?: string;
  gd_place?: string;
  link_wikipedia?: string;
  special_offers?: string;
  video?: string;
  featured_image?: {
    id: string;
    title: string;
    src: string;
    thumbnail: string;
    width: number;
    height: number;
  };
  images?: Array<{
    id: string;
    title: string;
    src: string;
    thumbnail: string;
    featured: boolean;
    position: string;
  }>;
  linked_posts?: {
    linked_to: {
      gd_tourpoint: Array<any>;
      gd_place: Array<any>;
    };
    linked_from: {
      gd_tourpoint: Array<any>;
      gd_place: Array<any>;
    };
  };
}

export interface GDCategory {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
  count: number;
  description: string;
  parent: number;
  link: string;
  image: any[];
  icon: any[];
  fa_icon: string;
  fa_icon_color: string;
  schema: string;
  meta: any[];
  _links: {
    self?: { href: string }[];
    collection?: { href: string }[];
    about?: { href: string }[];
    up?: { embeddable: boolean; href: string }[];
    'wp:post_type'?: { href: string }[];
    curies?: { name: string; href: string; templated: boolean }[];
  };
}

export interface GDTaxonomy {
  name: string;
  slug: string;
  description: string;
  types: Array<string>;
  hierarchical: boolean;
  rest_base: string;
  _links: {
    collection: Array<{
      href: string;
    }>;
    "wp:items": Array<{
      href: string;
    }>;
    curies: Array<{
      name: string;
      href: string;
      templated: boolean;
    }>;
  };
}

export interface GDSearchParams {
  postType: string;
  categoryValue?: string | number;
  orderby?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

export interface GDSearchResult {
  posts: GDPost[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface GDMapIcon {
  i: string;
  w: number;
  h: number;
}

export interface GDMapMarkerItem {
  m: string;
  lt: string;
  ln: string;
  t: string;
  i: string;
}

export interface GDMapMarkersResponse {
  total: number;
  baseurl: string;
  content_url: string;
  icons: Record<string, GDMapIcon>;
  items: GDMapMarkerItem[];
}

export interface GDSingleMarkerResponse {
  html: string;
}

export interface GDSettingsGroup {
  id: string;
  label: string;
  description: string;
  parent_id: string;
  sub_groups: Array<any>;
  _links: {
    options: Array<{
      href: string;
    }>;
  };
}

export interface IMacGeneral {
  'gd_event'?: IMacGeneralData;
  'gd_offer'?: IMacGeneralData;
  'gd_place'?: IMacGeneralData;
  'gd_tourpoint'?: IMacGeneralData;
  'gd_rvjobs'?: IMacGeneralData;
  'gd_rvsforsale'?: IMacGeneralData;
  'gd_request_sample'?: IMacGeneralData;
  'general': IGeneral;
}

export interface IMacGeneralData {
  'archive-item': IArchiveItems;
  'detail-info': string[];
  'details': IMacGeneralDetails;
  'icon': string;
  'more-info': string[];
  'plural-name': string;
  'singular-name': string;
  'slug': string;
}

export interface IArchiveItems {
  'bottom'?: string | boolean;
  'bottom-location-setting'?: string | boolean;
  'middle-location-setting'?: string | boolean;
  'subtitle-location-setting'?: string | boolean;
  'top-location-setting'?: string | boolean;
  'display_view'?: string | boolean;
  'middle'?: string | boolean;
  'post_images'?: string | boolean;
  'subtitle'?: string | boolean;
  'title'?: boolean;
}

export interface IMacGeneralDetails {
  'author-display-name'?: string | boolean;
  'author-image'?: string | boolean;
  'date-for-listing'?: string | boolean;
  'event-date'?: string | boolean;
  'slogan'?: string | boolean;
}

export interface IGeneral {
  'default_location'?: string;
  'default_region'?: string;
  'default_city'?: string;
  'default_country'?: string;
  'search_radius'?: string;
  'search_distance_long'?: string;
  'search_distance_short'?: string;
  'search_distance_unit'?: string;
}

export interface WPTheme {
	stylesheet: string
	template: string
	requires_php: string
	requires_wp: string
	textdomain: string
	version: string
	screenshot: string
	author: {
		raw: string
		rendered: string
	}
	author_uri: {
		raw: string
		rendered: string
	}
	description: {
		raw: string
		rendered: string
	}
	name: {
		raw: string
		rendered: string
	}
	tags: {
		raw?: (string | null)[]
		rendered: string
	}
	theme_uri: {
		raw: string
		rendered: string
	}
	status: string
	theme_supports?: WPThemeSupports
	_links: {
		self?: {
			href: string
		}[]
		collection?: {
			href: string
		}[]
	}
}

export type WpRestApiContext = 'view' | 'embed' | 'edit'

export interface PluginCreateDto {
	plugin: string
	status?: 'active' | 'inactive'
}

export interface PluginUpdateDto {
	status?: 'active' | 'inactive'
	context?: WpRestApiContext
}

export interface RenderedBlockDto {
	name: string
	postId: number
	context?: 'edit' | 'view'
	attributes?: string[]
}

export enum AUTH_TYPE {
	BASIC = 'basic',
	JWT = 'jwt',
	NONCE = 'nonce',
	NONE = 'none',
}

interface AuthOptionBasic {
	type: AUTH_TYPE.BASIC | 'basic'
	username: string
	password: string
}
interface AuthOptionJwt {
	type: AUTH_TYPE.JWT | 'jwt'
	token: string
}
interface AuthOptionNonce {
	type: AUTH_TYPE.NONCE | 'nonce'
	nonce: string
}
interface AuthOptionNone {
	type: AUTH_TYPE.NONE | 'none'
}

type AuthOptions =
	| AuthOptionBasic
	| AuthOptionJwt
	| AuthOptionNonce
	| AuthOptionNone

export interface WpApiOptions {
	auth?: AuthOptions
	headers?: Record<string, string>
	onError?: (message: string) => Promise<void>
	protected?: BlackWhiteList
	public?: BlackWhiteList
	restBase?: string
	trashable?: string[]
}

export interface BlackWhiteList {
	GET: string[]
	POST: string[]
	DELETE: string[]
}

export interface YoastHead {
	title: string
	robots: YoastRobots
	og_locale: string
	og_type: string
	og_title: string
	og_description: string
	og_url: string
	og_site_name: string
	article_modified_time?: Date
	article_published_time: Date
	og_image?: {
		width: number
		height: number
		url: string
		type: string
	}[]
	twitter_card: string
	twitter_misc: YoastTwitterMisc
	schema: YoastSchema
}

export interface YoastRobots {
	'index': string
	'follow': string
	'max-snippet': string
	'max-image-preview': string
	'max-video-preview': string
}

export interface YoastSchema {
	'@context': string
	'@graph': YoastGraph[]
}

export interface YoastGraph {
	'@type': string
	'@id': string
	'url'?: string
	'name'?: string
	'description'?: string
	'potentialAction'?: YoastPotentialAction[]
	'inLanguage'?: string
	'isPartOf'?: YoastAuthor
	'datePublished'?: Date
	'dateModified'?: Date
	'author'?: YoastAuthor
	'breadcrumb'?: YoastAuthor
	'itemListElement'?: YoastItemListElement[]
	'image'?: YoastImage
	'sameAs'?: string[]
}

export interface YoastAuthor {
	'@id': string
}

export interface YoastImage {
	'@type': string
	'@id': string
	'inLanguage': string
	'url': string
	'contentUrl': string
	'caption': string
}

export interface YoastItemListElement {
	'@type': string
	'position': number
	'name': string
	'item'?: string
}

export interface YoastPotentialAction {
	'@type': string
	'target': string[] | YoastTargetClass
	'query-input'?: string
}

export interface YoastTargetClass {
	'@type': string
	'urlTemplate': string
}

export interface YoastTwitterMisc {
	'Written by': string
}

export interface AuthPayload {
	url: string
	username: string
	password: string
}

export interface AuthResponse {
	success: boolean
	statusCode: number
	code: string
	message: string
	data: AuthData
}

export interface AuthData {
	token: string
	id: number
	email: string
	nicename: string
	firstName: string
	lastName: string
	displayName: string
}

export interface GDField {
	id: string
	type: string
	name: string
	title: string
	admin_title: string
	description: string
	data_type: string
	field_type: string
	field_type_key: string
	decimal_point: string
	default_value: string
	placeholder: string
	required: boolean
	required_msg: string
	validation_pattern: string
	validation_msg: string
	option_values: string
	location: string
	order: number
	icon: string
}

export interface GDSystemStatus {
	environment: {
	  home_url: string
	  site_url: string
	  version: string
	  wp_version: string
	  wp_multisite: boolean
	  wp_memory_limit: number
	  wp_debug_mode: boolean
	  wp_cron: boolean
	  language: string
	  server_info: string
	  php_version: string
	  php_post_max_size: number
	  php_max_execution_time: number
	  php_max_input_vars: number
	  curl_version: string
	  suhosin_installed: boolean
	  max_upload_size: number
	  mysql_version: string
	  default_timezone: string
	  fsockopen_or_curl_enabled: boolean
	  soapclient_enabled: boolean
	  domdocument_enabled: boolean
	  gzip_enabled: boolean
	  mbstring_enabled: boolean
	  remote_post_successful: boolean
	  remote_post_response: string
	  remote_get_successful: boolean
	  remote_get_response: string
	  platform: string
	  browser_name: string
	  browser_version: string
	  user_agent: string
	}
	database: {
	  geodirectory_db_version: string
	  database_prefix: string
	  database_tables: {
		geodirectory: {
		  wp_geodir_api_keys: {
			data: string
			index: string
		  }
		  wp_geodir_attachments: {
			data: string
			index: string
		  }
		  wp_geodir_business_hours: {
			data: string
			index: string
		  }
		  wp_geodir_custom_fields: {
			data: string
			index: string
		  }
		  wp_geodir_custom_sort_fields: {
			data: string
			index: string
		  }
		  wp_geodir_post_review: {
			data: string
			index: string
		  }
		  wp_geodir_gd_place_detail: {
			data: string
			index: string
		  }
		  wp_countries: {
			data: string
			index: string
		  }
		}
		other: {
		  pmd_categories: {
			data: string
			index: string
		  }
		  pmd_invoices: {
			data: string
			index: string
		  }
		  pmd_listings: {
			data: string
			index: string
		  }
		  pmd_listings_categories: {
			data: string
			index: string
		  }
		  pmd_users: {
			data: string
			index: string
		  }
		  wp_alm: {
			data: string
			index: string
		  }
		  wp_bp_activity: {
			data: string
			index: string
		  }
		  wp_bp_activity_meta: {
			data: string
			index: string
		  }
		  wp_bp_friends: {
			data: string
			index: string
		  }
		  wp_bp_groups: {
			data: string
			index: string
		  }
		  wp_bp_groups_groupmeta: {
			data: string
			index: string
		  }
		  wp_bp_groups_members: {
			data: string
			index: string
		  }
		  wp_bp_messages_messages: {
			data: string
			index: string
		  }
		  wp_bp_messages_meta: {
			data: string
			index: string
		  }
		  wp_bp_messages_notices: {
			data: string
			index: string
		  }
		  wp_bp_messages_recipients: {
			data: string
			index: string
		  }
		  wp_bp_notifications: {
			data: string
			index: string
		  }
		  wp_bp_notifications_meta: {
			data: string
			index: string
		  }
		  wp_bp_user_blogs: {
			data: string
			index: string
		  }
		  wp_bp_user_blogs_blogmeta: {
			data: string
			index: string
		  }
		  wp_bp_xprofile_data: {
			data: string
			index: string
		  }
		  wp_bp_xprofile_fields: {
			data: string
			index: string
		  }
		  wp_bp_xprofile_groups: {
			data: string
			index: string
		  }
		  wp_bp_xprofile_meta: {
			data: string
			index: string
		  }
		  wp_commentmeta: {
			data: string
			index: string
		  }
		  wp_comments: {
			data: string
			index: string
		  }
		  wp_crm_campaign: {
			data: string
			index: string
		  }
		  wp_crm_company: {
			data: string
			index: string
		  }
		  wp_crm_customer: {
			data: string
			index: string
		  }
		  wp_crm_project: {
			data: string
			index: string
		  }
		  wp_crm_roadmap: {
			data: string
			index: string
		  }
		  wp_email_log: {
			data: string
			index: string
		  }
		  wp_failed_jobs: {
			data: string
			index: string
		  }
		  wp_gdt_users: {
			data: string
			index: string
		  }
		  wp_geodir_claim: {
			data: string
			index: string
		  }
		  wp_geodir_countries: {
			data: string
			index: string
		  }
		  wp_geodir_post_icon: {
			data: string
			index: string
		  }
		  wp_geodir_tabs_layout: {
			data: string
			index: string
		  }
		  wp_links: {
			data: string
			index: string
		  }
		  wp_loginizer_logs: {
			data: string
			index: string
		  }
		  wp_mailchimp_carts: {
			data: string
			index: string
		  }
		  wp_nf3_actions: {
			data: string
			index: string
		  }
		  wp_nf3_action_meta: {
			data: string
			index: string
		  }
		  wp_nf3_chunks: {
			data: string
			index: string
		  }
		  wp_nf3_fields: {
			data: string
			index: string
		  }
		  wp_nf3_field_meta: {
			data: string
			index: string
		  }
		  wp_nf3_forms: {
			data: string
			index: string
		  }
		  wp_nf3_form_meta: {
			data: string
			index: string
		  }
		  wp_nf3_objects: {
			data: string
			index: string
		  }
		  wp_nf3_object_meta: {
			data: string
			index: string
		  }
		  wp_nf3_relationships: {
			data: string
			index: string
		  }
		  wp_nf3_upgrades: {
			data: string
			index: string
		  }
		  wp_options: {
			data: string
			index: string
		  }
		  wp_pattern_lock: {
			data: string
			index: string
		  }
		  wp_pmxe_exports: {
			data: string
			index: string
		  }
		  wp_pmxe_google_cats: {
			data: string
			index: string
		  }
		  wp_pmxe_posts: {
			data: string
			index: string
		  }
		  wp_pmxe_templates: {
			data: string
			index: string
		  }
		  wp_pmxi_files: {
			data: string
			index: string
		  }
		  wp_pmxi_history: {
			data: string
			index: string
		  }
		  wp_pmxi_images: {
			data: string
			index: string
		  }
		  wp_pmxi_imports: {
			data: string
			index: string
		  }
		  wp_pmxi_posts: {
			data: string
			index: string
		  }
		  wp_pmxi_templates: {
			data: string
			index: string
		  }
		  wp_postmeta: {
			data: string
			index: string
		  }
		  wp_posts: {
			data: string
			index: string
		  }
		  wp_queue: {
			data: string
			index: string
		  }
		  wp_revslider_css: {
			data: string
			index: string
		  }
		  wp_revslider_layer_animations: {
			data: string
			index: string
		  }
		  wp_revslider_navigations: {
			data: string
			index: string
		  }
		  wp_revslider_sliders: {
			data: string
			index: string
		  }
		  wp_revslider_slides: {
			data: string
			index: string
		  }
		  wp_revslider_static_slides: {
			data: string
			index: string
		  }
		  wp_signups: {
			data: string
			index: string
		  }
		  wp_slp_extendo_meta: {
			data: string
			index: string
		  }
		  wp_sm_sessions: {
			data: string
			index: string
		  }
		  wp_store_locator: {
			data: string
			index: string
		  }
		  wp_strong_views: {
			data: string
			index: string
		  }
		  wp_termmeta: {
			data: string
			index: string
		  }
		  wp_terms: {
			data: string
			index: string
		  }
		  wp_term_relationships: {
			data: string
			index: string
		  }
		  wp_term_taxonomy: {
			data: string
			index: string
		  }
		  wp_usermeta: {
			data: string
			index: string
		  }
		  wp_users: {
			data: string
			index: string
		  }
		  wp_uwp_form_extras: {
			data: string
			index: string
		  }
		  wp_uwp_form_fields: {
			data: string
			index: string
		  }
		  wp_uwp_usermeta: {
			data: string
			index: string
		  }
		  wp_wc_download_log: {
			data: string
			index: string
		  }
		  wp_wc_webhooks: {
			data: string
			index: string
		  }
		  wp_woocommerce_api_keys: {
			data: string
			index: string
		  }
		  wp_woocommerce_attribute_taxonomies: {
			data: string
			index: string
		  }
		  wp_woocommerce_downloadable_product_permissions: {
			data: string
			index: string
		  }
		  wp_woocommerce_log: {
			data: string
			index: string
		  }
		  wp_woocommerce_order_itemmeta: {
			data: string
			index: string
		  }
		  wp_woocommerce_order_items: {
			data: string
			index: string
		  }
		  wp_woocommerce_payment_tokenmeta: {
			data: string
			index: string
		  }
		  wp_woocommerce_payment_tokens: {
			data: string
			index: string
		  }
		  wp_woocommerce_sessions: {
			data: string
			index: string
		  }
		  wp_woocommerce_shipping_zones: {
			data: string
			index: string
		  }
		  wp_woocommerce_shipping_zone_locations: {
			data: string
			index: string
		  }
		  wp_woocommerce_shipping_zone_methods: {
			data: string
			index: string
		  }
		  wp_woocommerce_tax_rates: {
			data: string
			index: string
		  }
		  wp_woocommerce_tax_rate_locations: {
			data: string
			index: string
		  }
		  wp_wpinv_subscriptions: {
			data: string
			index: string
		  }
		}
	  }
	  database_size: {
		data: number
		index: number
	  }
	}
	active_plugins: Array<{
	  plugin: string
	  name: string
	  version: string
	  url: string
	  author_name: string
	  author_url: string
	  network_activated: boolean
	  latest_verison: string
	}>
	theme: {
	  name: string
	  version: string
	  latest_verison: string
	  author_url: string
	  is_child_theme: boolean
	  has_geodirectory_support: boolean
	  has_outdated_templates: boolean
	  overrides: Array<any>
	  parent_name: string
	  parent_version: string
	  parent_latest_verison: string
	  parent_author_url: string
	}
	settings: {
	  api_enabled: boolean
	  upload_max_filesize: string
	  default_status: string
	  maps_api_key: boolean
	  default_location: boolean
	}
	security: {
	  secure_connection: boolean
	  hide_errors: boolean
	}
	pages: Array<{
	  page_name: string
	  page_id: number
	  page_set: boolean
	  page_exists: boolean
	  page_visible: boolean
	  shortcode: string
	  shortcode_required: boolean
	  shortcode_present: boolean
	}>
  }

export interface GDSystemStatusTool {
  id: string
  name: string
  action: string
  description: string
  _links: {
    item: Array<{
      embeddable: boolean
      href: string
    }>
  }
}

export interface GDTaxonomyTerm {
	id: number
	name: string
	slug: string
	taxonomy: string
	count: number
	description: string
	parent: number
	link: string
	image: Array<any>
	icon: Array<any>
	fa_icon: string
	fa_icon_color: string
	schema: string
	meta: Array<any>
	_links: {
	  self: Array<{
		href: string
	  }>
	  collection: Array<{
		href: string
	  }>
	  about: Array<{
		href: string
	  }>
	  "wp:post_type": Array<{
		href: string
	  }>
	  curies: Array<{
		name: string
		href: string
		templated: boolean
	  }>
	}
  }