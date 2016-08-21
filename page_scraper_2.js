"use strict";
var fs 			     = require("fs");
var FB_factory 	 = require('./facebook_api.js'),
    FB 			     = FB_factory();
var util 		     = require("util");
var extend  	   = require("extend");
var EventEmitter = require('events');
var async        = require('async');
var LOG          = require("./log.js")




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

	LOG(LOG.PAGE_SCRAPER, merged_options);
	return new PageScraper(merged_options);
}

function PageScraper (options) {
  EventEmitter.call(this);
	LOG(LOG.PAGE_SCRAPER, "Now in the Event Emitter");
	if (!options.access_token) {
		throw new TypeError("Access token must be provided");
	}
	this._options = options;
	//TODO check if the access token is valid

	FB.setVersion(this._options.api_version)
	  .setAccessToken(this._options.access_token);

  var self = this;
  this._schedule_queue = async.queue(
    function(task,cb) {
      LOG(LOG.PAGE_SCRAPER, "async:queue -> task processing")
      self.parseStream(
        task.base_graph,
        task.params,
        cb
      );
    },
    10
  );

  this.scheduleStream(
      util.format("/%s/feed", this._options.page_id),
      {
        fields: "message,story,description,created_time,from,likes.summary(true).limit(0),comments.summary(true).limit(0),shares",
        limit: 50
      }
    );

  this._schedule_queue.drain = function() {
    LOG(LOG.PAGE_SCRAPER, "Queue drained");
    stats.timing.end = new Date();
    LOG(LOG.PAGE_SCRAPER, stats);
    self.emit("end", stats);
  }
}
PageScraper.prototype = Object.create(EventEmitter.prototype);
PageScraper.prototype.constructor = PageScraper;

PageScraper.prototype.scheduleStream = function(base_graph, params) {
  this._schedule_queue.push(
      {
        base_graph: base_graph,
        params: params
      },
      function (err) {
      }      
    );  
}


// message,story,description,created_time,from,likes.summary(true).limit(0)
// , comments.summary(true).order(reverse_chronological).limit(0) { from,message, likes.summary(true).limit(100) .filter(stream).order(reverse_chronological){name}, comments.summary(true).order(reverse_chronological).limit(100) { from,message, likes.summary(true).limit(100) .filter(stream).order(reverse_chronological){name} } }, shares

PageScraper.prototype.parseStream = function(base_graph, params, cb) {
  var self = this;
  FB.api(
    base_graph, 
    params,
    function(err, result) {
      // LOG(LOG.PAGE_SCRAPER, result.data.length);
      var err = self.processResult(result, base_graph, params);
      cb(err);
    }
  );
}


PageScraper.prototype.processResult = function(result, base_graph, params) {
  if (!result || !result.data) {
    console.error("There is no more data to process");
  	return "There is no more data to process";
  }
  // if there is more in the paging - shcedule them
  if (result && result.paging && result.paging.next && result.paging.next.query_params) {
    var next_params = Object.assign({}, result.paging.next.query_params);
    if (params.system) next_params.system = params.system;
    this.scheduleStream(base_graph, next_params)
  }

  // process the result
  for (var i=0;i<result.data.length;i++) {
    var e = result.data[i];
    this.unify_entry(e,params);
    LOG(LOG.PAGE_SCRAPER, params.system, e.created_time, e.id, e.interaction_counts);
    stats.inc_interactions(e.interaction_counts);
    if (!params.system) {
      stats.posts++;
    }

    // send this object as event
    this.emit_item(e,params);

    if (e.interaction_counts.comments) {
      var comment_params = {
          fields: "message,story,description,created_time,from,likes.summary(true).limit(0),comments.summary(true).limit(0),shares",
          limit: 100
      };
      Object.defineProperty(comment_params, "system", 
        {
          enumerable: false,
          configurable: true,
          writable: true,
          value: {
            parent : e.id,
            item_type : "comment"
          }
        }
      );
    	this.scheduleStream(
    		util.format("/%s/comments", e.id),
        comment_params
    	);
    }

    if (e.interaction_counts.likes) {
      var like_params = {
          fields: "name,id",
          limit: 100
      };
      Object.defineProperty(like_params, "system", 
        {
          enumerable: false,
          configurable: true,
          writable: true,
          value: {
            parent : e.id,
            item_type : "like"
          }
        }
      );
      this.scheduleStream(
        util.format("/%s/likes", e.id),
        like_params
      );
    }
  }
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
PageScraper.prototype.unify_entry = function(entry,params) {
  if (!params.system) {
    entry.item_type = "post";
  } else {
    entry.item_type = params.system.item_type;
  }

  entry.interaction_counts = {
    likes : (entry.likes && entry.likes.summary && entry.likes.summary.total_count) ? entry.likes.summary.total_count : 0,
    comments : (entry.comments && entry.comments.summary && entry.comments.summary.total_count) ? entry.comments.summary.total_count : 0,
    shares : (entry.shares && entry.shares.count) ? entry.shares.count : 0
  }
}

PageScraper.prototype.emit_item = function(item,params) {
  item = Object.assign({}, item);

  delete item.likes;
  delete item.comments;
  delete item.shares;

  if (params.system) {
    item.parent_id = params.system.parent;
  }

  if (item.item_type=="like") {
    delete item.interaction_counts;
    //reformat it to look like from: { name: 'Komfo', id: '194885970934' },
    item.from = {
      id: item.id,
      name: item.name
    }
    delete item.id;
    delete item.name;
  }

  this.emit("item", item);
}

module.exports = PageScraperFactory;


