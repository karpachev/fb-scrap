var fs 			     = require("fs");
var util 		     = require("util");
var EventEmitter = require('events');
var async        = require('async');
var extend       = require('extend');
var LOG          = require("./log.js")
var gcloud       = require('google-cloud');




function DatastoreFactory(options) {
	var merged_options = {};
	extend(
		true,
		merged_options,
		{
			 projectId: 'node-test-3'
		},
		options
	);

	return new Datastore(merged_options);
}

function Datastore(options) {
  // EventEmitter.call(this);
  LOG(LOG.DATASTORE, "Now in the Datastore", options);

  this._datastore = gcloud.datastore(options);

  this._post_queue = async.queue(
      this.save_post_to_datastore.bind(this),
      5      
    );
}
/*
{ message: 'Весели празници от #teamkomfo!',
  story: 'Komfo (BG) with Петя Радева and 46 others.',
  created_time: '2015-12-26T13:01:06+0000',
  from: { name: 'Komfo', id: '194885970934' },
  id: '194885970934_10153650967245935',
  item_type: 'post',
  interaction_counts: { likes: 92, comments: 0, shares: 0 } 
}
*/
Datastore.prototype.save_post_to_datastore = function(item,cb) {
  LOG(LOG.DATASTORE, "post:: async:queue -> task processing");
  //make a copy
  item = Object.assign({},item);

  var key = this._datastore.key(["Post",item.id])

  delete item.id;
  item.from_name = item.from.name;
  item.from_id = item.from.id;
  delete item.from;
  item.likes = item.interaction_counts.likes;
  item.comments = item.interaction_counts.comments;
  item.shares = item.interaction_counts.shares;
  delete item.interaction_counts;

  var entity = {
    key: key,
    data: toDatastore(item, ['message', 'story', 'from_name', 'likes', 'comments', 'shares'])
  };

  this._datastore.save(
    entity,
    function (err) {
      cb(err, err ? null : item);
    }
  );
}

Datastore.prototype.save_post = function(item) {
  this._post_queue.push(item);
}



// Translates from Datastore's entity format to
// the format expected by the application.
//
// Datastore format:
//   {
//     key: [kind, id],
//     data: {
//       property: value
//     }
//   }
//
// Application format:
//   {
//     id: id,
//     property: value
//   }
function fromDatastore (obj) {
  obj.data.id = obj.key.id;
  return obj.data;
}

// Translates from the application's format to the datastore's
// extended entity property format. It also handles marking any
// specified properties as non-indexed. Does not translate the key.
//
// Application format:
//   {
//     id: id,
//     property: value,
//     unindexedProperty: value
//   }
//
// Datastore extended format:
//   [
//     {
//       name: property,
//       value: value
//     },
//     {
//       name: unindexedProperty,
//       value: value,
//       excludeFromIndexes: true
//     }
//   ]
function toDatastore (obj, nonIndexed) {
  nonIndexed = nonIndexed || [];
  var results = [];
  Object.keys(obj).forEach(function (k) {
    if (obj[k] === undefined) {
      return;
    }
    results.push({
      name: k,
      value: obj[k],
      excludeFromIndexes: nonIndexed.indexOf(k) !== -1
    });
  });
  return results;
}


module.exports = DatastoreFactory;



