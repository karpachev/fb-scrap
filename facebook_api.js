var request 		= require("request-json");
var extend  		= require("extend");
const querystring 	= require('querystring');
const URL 			= require('url');
var LOG          	= require("./log.js")


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


function FacebookApi(options) { 
	this._options = options;
	this._request_client = request.createClient(options.api_root+options.api_version);
}

FacebookApi.prototype.setAccessToken = function(access_token) {
	this._options.access_token = access_token;
	return this;
}

FacebookApi.prototype.setVersion = function(api_version) {
	this._options.api_version = api_version;
	return this;
}


FacebookApi.prototype.api = function(url,params,cb) {
	this._request_client.headers['Authorization'] = 'OAuth ' + this._options.access_token;
	var API_URL = this.formURL(url,params);
	LOG(LOG.FB_API, API_URL);
	var self = this;
	this._request_client.get(API_URL, function(err, result, body) {
		// LOG(LOG.FB_API, result.statusCode, body);
		if (err || result.statusCode!=200) {
			LOG({module:LOG.FB_API, level:LOG.ERROR}, err, JSON.stringify(result));
			cb(err,{result: result, body: body});
		} else {
			if (body.paging) {
				self.parsePaging(body)
			}
			cb(null,body);
		}
	});
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
