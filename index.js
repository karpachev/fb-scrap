var fs = require("fs");
var util = require("util");
var LOG  = require("./log.js");
var PageScraperFactory = require('./page_scraper_2.js');
var DatastoreFactory = require('./datastore.js');

var page_scraper = new PageScraperFactory({
  access_token : fs.readFileSync("./ACCESS_TOKEN",{encoding:"utf8"})
});

var datastore = new DatastoreFactory({
	 projectId: 'node-test-3'
});

most_active = new MostActive();
page_scraper.on("item",function(item){
  //console.log("item", item);
  LOG(LOG.MAIN, item.created_time, item.item_type);
  most_active.score(item);

  if (item.item_type=="post"){
    // datastore.save_post(item);
  }
});

page_scraper.on("end", function(stats) {
	LOG(LOG.MAIN, "Finished processing", stats);
	most_active.show_scoreboard();
});

function MostActive() {
	this._user_scoreboard = {};
}

MostActive.prototype.score = function(item) {
	if (!item.from || !item.from.id) {
		LOG(LOG.MAIN, "The item does not have item.from");
		return;
	}

	var user = this._user_scoreboard[item.from.id];
	if ( !user ) {
		user = this._user_scoreboard[item.from.id]  = {
			posts : 0,
			comments : 0,
			likes : 0,
			total_score : 0,
			name : item.from.name,
			id : item.from.id
		}
	}

	switch(item.item_type) {
		case "post" : user.posts++; break;
		case "comment" : user.comments++; break;
		case "like" : user.likes++; break;
	}

	user.total_score = user.posts*1.3 + user.comments*1.2 + user.likes;
}

MostActive.prototype.show_scoreboard = function() {
	// fs.writeFileSync("logs/users.json", JSON.stringify(this._user_scoreboard,null,2));
	var sorted_result = [];
	var self = this;
;
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
	LOG(LOG.MAIN, sorted_result)
}
