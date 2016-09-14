"use strict";
var fs 			     = require("fs");
var FB_factory 	 = require('./facebook_api.js');
var util 		     = require("util");
var extend  	   = require("extend");
var EventEmitter = require('events');
var async        = require('async');
var LOG          = require("./log.js")



/**
  * Global static object to track stats about scraping
  */ 
var stats = {
  posts : 0,
  likes : 0,
  comments : 0,
  shares : 0,
  api_calls : 0,
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
			 api_version: "v2.7",
       concurency: {
          api_calls : 20
       }
		},
		options
	);

	LOG(LOG.PAGE_SCRAPER, merged_options);
	return new PageScraper(merged_options);
}

/// Constructor of the main scraper class
function PageScraper (options) {
  EventEmitter.call(this);
	LOG(LOG.PAGE_SCRAPER, "Now in the Event Emitter");
	if (!options.access_token) {
		throw new TypeError("Access token must be provided");
	}
	this._options = options;
	//TODO check if the access token is valid

  // Initialize the Facebook API object
  this.FB = FB_factory();
	this.FB.setVersion(this._options.api_version)
	  .setAccessToken(this._options.access_token);

  // Create a queue that will manage how many 
  // requests are send to Facebook 
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
    self._options.concurency.api_calls
  );

  // Start the gathering in the page root
  this.scheduleStream(
      util.format("/%s/feed", this._options.page_id),
      {
        fields: "message,story,description,created_time,from,likes.summary(true).limit(0),comments.summary(true).limit(0),shares",
        limit: 50
      }
    );

  // When finished with the gathering - execute this function
  this._schedule_queue.drain = function() {
    LOG(LOG.PAGE_SCRAPER, "Queue drained");
    stats.timing.end = new Date();
    LOG(LOG.PAGE_SCRAPER, stats);
    self.emit("end", stats);
  }
}
// inherit from EventEmitter
PageScraper.prototype = Object.create(EventEmitter.prototype);
PageScraper.prototype.constructor = PageScraper;

/// Schedule and API call to gather posts, comments and likes.
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


/// Make an FB api call to get the  posts, comments or likes.
/// Upon arrival of the result - process it
PageScraper.prototype.parseStream = function(base_graph, params, cb) {
  var self = this;
  // one more API call
  stats.api_calls++;

  this.FB.api(
    base_graph, 
    params,
    function(err, result) {
      //TODO - Apropriate error handling
      if (err) {
        if (!params.system) {
          Object.defineProperty(like_params, "system", 
            {
              enumerable: false,
              configurable: true,
              writable: true,
              value: {
                api_retries : 0
              }
            }
          );
        }

        if (params.system.api_retries++<3) {
          // one more retry
          LOG({module:LOG.PAGE_SCRAPER, level:LOG.ERROR}, "Retrying the request one more time");
          this.scheduleStream(base_graph, next_params);
        }
        cb(err);
        return;
      }

      // normal processing
      var err = self.processResult(result, base_graph, params);
      cb(err);
    }
  );
}

/// Reformat the stream of posts, comments or likes and emit them (so
/// Anyone interected could get them). Spawn aditional FB API calls
/// if paging or comments or likes needs to be gathered
PageScraper.prototype.processResult = function(result, base_graph, params) {
  if (!result || !result.data) {
    console.error("There is no more data to process");
  	return "There is no more data to process";
  }
  // if there is more results in the paging - shcedule them
  if (result && result.paging && result.paging.next && result.paging.next.query_params) {
    var next_params = Object.assign({}, result.paging.next.query_params);
    if (params.system) next_params.system = params.system;

    // schedule the next page
    this.scheduleStream(base_graph, next_params)
  }

  // process the result
  for (var i=0;i<result.data.length;i++) {
    // make posts,comments and likes look nearly the same
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
          fields: "message,story,description,created_time,from,likes.summary(true).limit(0),comments.summary(true).limit(0)",
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
            parent_create_time : e.created_time,
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
a post object from FB looks like:
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
     summary: { order: 'chronological', total_count: 0, can_comment: true } } 
}

ALl items should have the following fields:
    {
      id : "...",
      parent_id : "...", // only for comments and likes
      item_type : "..", // post, comment or like
      create_time : "..",  
      from : {
        id : "...",
        name : "..."
      },
      interaction_counts : {
        "likes" : ...,
        "comments" : ...,
        "shares" : ...
      }
    }
*/
PageScraper.prototype.unify_entry = function(entry,params) {

  // add the item_type
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

  delete entry.likes;
  delete entry.comments;
  delete entry.shares;
}

PageScraper.prototype.emit_item = function(item,params) {
  item = Object.assign({}, item);

  if (params.system) {
    item.parent_id = params.system.parent;
    if (!item.created_time) {
      item.created_time = params.system.parent_create_time;
    }
  }

  if (item.item_type=="like") {
    delete item.interaction_counts;
    //reformat it to look like from: { name: 'Komfo', id: '194885970934' },
    item.from = {
      id: item.id,
      name: item.name
    }
    delete item.name;
  }

  this.emit("item", item);
}

module.exports = PageScraperFactory;


