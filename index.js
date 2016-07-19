var fs = require("fs");
var FB_factory = require('./facebook_api.js'),
    FB= FB_factory();

var gcloud = require('gcloud');
var datastore = gcloud.datastore({projectId: 'node-test-3',});


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

process.on('uncaughtException', function (exception) {
  console.log(exception); // to see your exception details in the console
  // if you are on production, maybe you can send the exception details to your
  // email as well ?
});

// message,story,description,created_time,from,likes.summary(true).limit(0)
// , comments.summary(true).order(reverse_chronological).limit(0) { from,message, likes.summary(true).limit(100) .filter(stream).order(reverse_chronological){name}, comments.summary(true).order(reverse_chronological).limit(100) { from,message, likes.summary(true).limit(100) .filter(stream).order(reverse_chronological){name} } }, shares

function parse_stream(params) {

  FB.api("/me/feed", params)
    .then(
      function(result){
        // console.log(result.data.length);
        process_result(result, function(){
          // console.log(result, result.paging);
          if (result.paging && result.paging.next && result.paging.next.query_params) {
            parse_stream(result.paging.next.query_params)
          } else {
            stats.timing.end = new Date;
            console.log(stats);
          }          
        })


      },
      function(err) {
        console.log("!!!");
        console.log(err.body.error.message);
        console.log(stats);
      }
    ).fail(function(err){
      console.log("!!!!");
      console.log(err.body.error.message);
      console.log(stats);
    });
}

function process_result(result, cb) {

  var keys = [];
  var records = [];
  for (var i=0;i<result.data.length;i++) {
    process_entry(result.data[i]);
    var entry = result.data[i];
    if (!entry.from || !entry.from.id) {
      continue;
    }
    var key = datastore.key(['User', entry.from.id]);
    keys.push( key );
    records.push({
      key: key,
      data: {
        influence: entry.interaction_counts.likes + 
                    entry.interaction_counts.shares + 
                    entry.interaction_counts.comments,
        interaction_counts: entry.interaction_counts
      }
    });
  }

  // console.log(keys);
  // console.log(records);
  // return;
  
  datastore.get(
    keys,
    function(err,results) {
      if (err) console.err(err);

      for (var i=0;i<records.length;i++) {
        var record = records[i];

        // see if there is a match from GET
        for (var j=0;j<results.length;j++) {
          var result = results[j];
          if (record.key.name == results.key.name) {
            record.data.influence += results.influence;
            record.data.interaction_counts.likes += results.interaction_counts.likes;
            record.data.interaction_counts.comments += results.interaction_counts.comments;
            record.data.interaction_counts.shares += results.interaction_counts.shares;
            break;
          }
        }
      }

      // make unique
      for (var i=0;i<records.length;i++) {
        for (var j=i+1;j<records.length;j++) {
          if (records[i].key.name==records[j].key.name) {
            records[i].data.influence += records[j].data.influence;
            records[i].data.interaction_counts.likes += records[j].data.interaction_counts.likes;
            records[i].data.interaction_counts.comments += records[j].data.interaction_counts.comments;
            records[i].data.interaction_counts.shares += records[j].data.interaction_counts.shares;
            records.splice(j,1);
            j--;
          }
        }
      }
      // console.log(records);
      // throw new Error("Hello");

      datastore.upsert(
        records,
        function(err, apiResponse) {
          console.log("All records updated", err, apiResponse);
          cb();
        }
      )
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


function process_entry(entry) {
  unify_entry(entry);
  print_entry(entry);
  stats.posts++;
  stats.inc_interactions(entry.interaction_counts);  
}

