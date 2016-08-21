var fs = require("fs");
var LOG = require("./log.js");

var users = fs.readFileSync("logs/users.json", {encoding:"utf8"});
users = JSON.parse(users);

show_scoreboard(users);


function show_scoreboard(users) {
	this._user_scoreboard = users;

	var sorted_result = [];
	var self = this;
	Object.keys(this._user_scoreboard).forEach(function(user_id, ind) {
		var user = self._user_scoreboard[user_id];
		//console.log(user);
		// debugger;


		for (var i=0;i<sorted_result.length;i++) {
			if (user.total_score>sorted_result[i].total_score) {
				//insert it before the *ind*
				sorted_result.splice(i,0,user);
				break;
			}
		}

		if (sorted_result.length==i) {
			sorted_result.push(user);
		}		
	})
	LOG(LOG.MAIN, sorted_result);
}
