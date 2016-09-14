var fs = require("fs");
var FB_factory = require('./facebook_api.js'),
    FB= FB_factory();
var util = require("util");

var gcloud = require('gcloud');
var datastore = gcloud.datastore({
	projectId: 'node-test-3',
	 apiEndpoint: "localhost:8341"
});




var key1 = datastore.key(['User', "10152920030679442"]);
var key2 = datastore.key(['Company', 2]);

/**
[ { key: Key { namespace: undefined, id: 1, kind: 'Company', path: [Getter] },
    data: { name: 'Vasil' } },
  { key: Key { namespace: undefined, id: 2, kind: 'Company', path: [Getter] },
    data: { name: 'Vasil' } } ]
*/
datastore.get(
	key1,
	function(err,results) {
		console.log(err);
    console.log(util.inspect(results,5));
	}
)

var query = datastore.createQuery('User');
query.filter("influence", "NaN");
query.order("influence", {descending:true});
query.limit(20);

datastore.runQuery(query, function(err, entities) {
	entities.forEach(function(e){
		console.log(util.format(
				"%s: %s L:%d C:%d S:%d",
				e.key.name,
				e.data.influence,
				e.data.interaction_counts.likes,
				e.data.interaction_counts.comments,
				e.data.interaction_counts.shares
			));
	})
    // console.log( util.inspect(entities,{depth:7}) );
});


// datastore.save(
// 	{
// 		key: key2,
// 		data: {
// 			name : "Vasil"
// 		}
// 	},
// 	function(err,result) {
// 		console.log("saved", err, result);
// 	}
// );