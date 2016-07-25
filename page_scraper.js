"use strict";
var fs 			= require("fs");
var FB_factory 	= require('./facebook_api.js'),
    FB 			= FB_factory();
var util 		= require("util");
var extend  	= require("extend");
var EventEmitter = require('events');


var stats = {
  posts : 0,
  likes : 0,
  comments : 0,
  shares : 0,
  timing : {
    start: new Date(),
    end: null
  },
  inc_interactions : function(interaction_counts) {
    this.likes += interaction_counts.likes;
    this.comments += interaction_counts.comments;
    this.shares += interaction_counts.shares;
  }
};


function PageScraperFactory(options) {
	var merged_options = {};
	extend(
		true,
		merged_options,
		{
			 access_token: "",
			 page_id: "me",
			 api_version: "v2.7"
		},
		options
	);

	return new PageScraper(merged_options);
}

class PageScraper extends EventEmitter {

	constructor (options) {
		if (!options.access_token) {
			throw new TypeError("Access token must be provided");
		}
 		this._options = options;
		//TODO check if the access token is valid

		FB.setVersion(this._options.api_version)
		  .setAccessToken(this._options.access_token);

		this.parseStream(
			util.format("/%s/feed", this._options.page_id),
			{
			  fields: "message,story,description,created_time,from,likes.summary(true).limit(0),comments.summary(true).limit(0),shares",
			  limit: 100
			}
		);
	}


}





// message,story,description,created_time,from,likes.summary(true).limit(0)
// , comments.summary(true).order(reverse_chronological).limit(0) { from,message, likes.summary(true).limit(100) .filter(stream).order(reverse_chronological){name}, comments.summary(true).order(reverse_chronological).limit(100) { from,message, likes.summary(true).limit(100) .filter(stream).order(reverse_chronological){name} } }, shares

PageScraper.prototype.parseStream = function(base_graph, params) {
  var self = this;
  FB.api(base_graph, params,
    function(err, result) {
      // console.log(result.data.length);
      self.processResult(result, function() {
        // console.log(result, result.paging);
        if (result && result.paging && result.paging.next && result.paging.next.query_params) {
          self.parseStream(base_graph, result.paging.next.query_params)
        } else {
          stats.timing.end = new Date;
          console.log(stats);
        }          
      });
    });
}


PageScraper.prototype.processResult = function(result, cb) {
  if (!result || !result.data) {
  	cb();
  	return;
  }
  for (var i=0;i<result.data.length;i++) {
    var e = result.data[i];
    unify_entry(e);

    if (e.interaction_counts.comments) {
    	this.parseStream(
    		util.format("/%s/comments", e.id),
			{
			  fields: "message,story,description,created_time,from,likes.summary(true).limit(0),comments.summary(true).limit(0),shares",
			  limit: 100
			}
    	);
    }
    // console.log(e);
  }
  cb();
}

/**
{ message: 'sorry for the last time :)',
  created_time: '2016-06-27T12:10:29+0000',
  from: { name: 'Петя Радева', id: '10206083421555746' },
  id: '93961945054_10157132867735055',
  shares: { count: 9 },
  likes:
   { data: [],
     summary: { total_count: 0, can_like: true, has_liked: false } },
  comments:
   { data: [],
     summary: { order: 'chronological', total_count: 0, can_comment: true } } }
*/
function unify_entry(entry) {
  entry.interaction_counts = {
    likes : (entry.likes && entry.likes.summary && entry.likes.summary.total_count) ? entry.likes.summary.total_count : 0,
    comments : (entry.comments && entry.comments.summary && entry.comments.summary.total_count) ? entry.comments.summary.total_count : 0,
    shares : (entry.shares && entry.shares.count) ? entry.shares.count : 0
  }
}


var p = new PageScraperFactory({
	access_token : fs.readFileSync("./ACCESS_TOKEN",{encoding:"utf8"})
});