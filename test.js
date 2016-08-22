var express = require('express'),
    cluster = require('cluster'),
    os = require('os');


// This is a worker, because cluster.isMaster is false,
// and so the conditional above will never run.
// Let's just initialize Express and create a basic route.
var app = express();
app.listen(8000);
console.log("Now in Worker")

app.get('/', function (req, res) {
	res.send('Running on worker with id #');
	// console.log('Running on worker with id #' + cluster.worker.id);
});