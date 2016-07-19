var fs = require("fs");
var FB_factory = require('./facebook_api.js'),
    FB= FB_factory();


FB.setVersion("v2.6")
  .setAccessToken(fs.readFileSync("./ACCESS_TOKEN",{encoding:"utf8"}));


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

// message,story,description,created_time,from,likes.summary(true).limit(0)
// , comments.summary(true).order(reverse_chronological).limit(0) { from,message, likes.summary(true).limit(100) .filter(stream).order(reverse_chronological){name}, comments.summary(true).order(reverse_chronological).limit(100) { from,message, likes.summary(true).limit(100) .filter(stream).order(reverse_chronological){name} } }, shares

function parse_stream(params) {
  "use strict";

  FB.api("/me/feed", params)
    .then(
      function(result){
        console.log(result.data.length);
        for (let i=0;i<result.data.length;i++) {
          unify_entry(result.data[i]);
          print_entry(result.data[i]);
          stats.posts++;
          stats.inc_interactions(result.data[i].interaction_counts);
        }
        //console.log(result, result.paging);
        if (result.paging && result.paging.next && result.paging.next.query_params) {
          parse_stream(result.paging.next.query_params)
        } else {
          stats.timing.end = new Date;
          console.log(stats);
        }
      },
      function(err) {
        console.log(err.body.error.message);
        console.log(stats);
      }
    );
}

parse_stream({
  fields: "message,story,description,created_time,from,likes.summary(true).limit(0),comments.summary(true).limit(0),shares",
  limit: 100
});


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

function print_entry(entry) {
  var util = require("util");
  if (!entry) {
    console.log("Empty result !!");
    return;
  }

  // console.log(entry);
  console.log( util.format(
          "%s, %s: L:%d C:%d S:%d",
          entry.created_time,
          (entry.from && entry.from.name) ? entry.from.name : "Unknown",
          entry.interaction_counts.likes,
          entry.interaction_counts.comments,
          entry.interaction_counts.shares
  ));
}
