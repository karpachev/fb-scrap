var request = require("request-json");
var extend  = require("extend");
const querystring = require('querystring');
const URL = require('url');

function FacebookApiFactory(options) {
	var merged_options = {};
	extend(
		true,
		merged_options,
		{
			 api_root: "https://graph.facebook.com/",
			 api_version: "v2.6"
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
	// deferred.reject(err) 
	// deferred.resolve(err) 
	this._request_client.headers['Authorization'] = 'OAuth ' + this._options.access_token;
	var API_URL = this.form_url(url,params);
	console.log(API_URL);
	this._request_client.get(API_URL, function(err, result, body) {
		// console.log(result.statusCode, body);
		if (err || result.statusCode!=200) {
			deferred.reject({err: err,result: result, body: body});
			cb(err,{result: result, body: body});
		} else {
			if (body.paging) {
				parse_paging(body)
			}
			cb(null,body);
		}
	});
}

FacebookApi.prototype.form_url = function(url,params) {
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

function parse_paging(body) {
	body.paging = {
		previous: {
			url: body.paging.previous,
			query_params: 		querystring.parse(
													URL.parse(body.paging.previous).query
												)	
		},
		next: {
			url: body.paging.next,
			query_params: 		querystring.parse(
													URL.parse(body.paging.next).query
												)	
		}
	};
}


module.exports = FacebookApiFactory;
