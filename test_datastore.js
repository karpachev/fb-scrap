var fs = require("fs");
var FB_factory = require('./facebook_api.js'),
    FB= FB_factory();

var gcloud = require('gcloud');
var datastore = gcloud.datastore({
	projectId: 'node-test-3',
	 apiEndpoint: "localhost:8080"
});



var key1 = datastore.key(['Company', 1]);
var key2 = datastore.key(['Company', 2]);

/**
[ { key: Key { namespace: undefined, id: 1, kind: 'Company', path: [Getter] },
    data: { name: 'Vasil' } },
  { key: Key { namespace: undefined, id: 2, kind: 'Company', path: [Getter] },
    data: { name: 'Vasil' } } ]
*/
datastore.get(
	[key1,key2],
	function(err,results) {
		console.log(err,results);
	}
)

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