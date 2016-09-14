/**
 * Module to work with the Facebook Graph API.
 *
 * @module Facebook API
 */
var request 		= require("request-json");
var extend  		= require("extend");
const querystring 	= require('querystring');
const URL 			= require('url');
var LOG          	= require("../log/log.js")

/**
  * Factory for the FacebookApi class.
  *
  * Puts in default values for options.api_root and 
  * options.api_version.
  * 
  * @class FacebookApiFactory
  * @constructor
  * @param options {Object} The options for the newly
  *  instantiated {{#crossLink "FacebookApi"}}{{/crossLink}} object.
  */
function FacebookApiFactory(options) {
	var merged_options = {};
	extend(
		true,
		merged_options,
		{
			 api_root: "https://graph.facebook.com/",
			 api_version: "v2.7"
		},
		options
	);

	return new FacebookApi(merged_options);
}

/**
  * Class that handles the communiction with the FB Graph API.
  *
  * 
  * @class FacebookApi
  * @constructor
  * @param options {Object} The options..
  */
function FacebookApi(options) {
	/**
	  Options for the ..

	  @property _options
		@type Object
	  */
	this._options = options;

	/**
	  Object to make HTTP requsts.
	  
	  @property _request_client
		@type Object
	  */
	this._request_client = request.createClient(options.api_root+options.api_version);
}

/**
  * Changes the access token
  *
  * @method setAccessToken
  * @param access_token {string} The new access token to set
  * @return Returns `this` so that methods could be chained.
  */
FacebookApi.prototype.setAccessToken = function(access_token) {
	this._options.access_token = access_token;
	return this;
}

/**
  * Changes the api version string. Default is v2.7.
  *
  * @method setVersion
  * @param api_version {string} The new version to set. 
  * @return Returns `this` so that methods could be chained.
  */
FacebookApi.prototype.setVersion = function(api_version) {
	this._options.api_version = api_version;
	return this;
}

/**
  * Invokes the Graph API methods.
  *
  * @method api
  * @param url {string} The Graph API endpoint. I.e. "me/posts" or "12345_2342341" 
  * @param params {Object} Aditional GET parameters for the Graph API calls. 
  * @param cb {Function} The callback when the method has completed 
  * @return Returns `this` so that methods could be chained.
  */
FacebookApi.prototype.api = function(url,params,cb) {
	this._request_client.headers['Authorization'] = 'OAuth ' + this._options.access_token;
	var API_URL = this.formURL(url,params);
	LOG(LOG.FB_API, API_URL);
	var self = this;
	this._request_client.get(API_URL, function(err, result, body) {
		// LOG(LOG.FB_API, result.statusCode, body);
		if (err || result.statusCode!=200) {
			LOG({module:LOG.FB_API, level:LOG.ERROR}, "Graph API call failed", err, url, params, JSON.stringify(result), body);
			cb(err,{result: result, body: body});
		} else {
			if (body.paging) {
				self.parsePaging(body)
			}
			cb(null,body);
		}
	});

	return this;
}

FacebookApi.prototype.formURL = function(url,params) {
	var URL= this._options.api_version;
	if (url.substring(0,1)!="/") {
		URL+= "/";
	}
	URL+= url;
	if (params) {
		if(URL.indexOf("?")==-1) {
			URL+= "?";
		}
		URL += querystring.stringify(params, null, null, {encodeURIComponent: str=>str});
	}
	return URL;
}

FacebookApi.prototype.parsePaging = function(body) {
	// LOG(LOG.FB_API, body.paging);

	if(body.paging && body.paging.previous) {
		body.paging.previous = {
			url: body.paging.previous,
			query_params: 		querystring.parse(
													URL.parse(body.paging.previous).query
												)	
		};
	}

	if(body.paging && body.paging.next) {
		body.paging.next = {
			url: body.paging.next,
			query_params: 		querystring.parse(
													URL.parse(body.paging.next).query
												)	
		}
	}
}


module.exports = FacebookApiFactory;
