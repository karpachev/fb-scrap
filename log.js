
module.exports = function (options, message) {
  var allowed_modules = [
		module.exports.FB_API,
		module.exports.MAIN
  ];

  // console.log(options, typeof options, allowed_modules);
  if (	typeof options === "number" &&
  		allowed_modules.indexOf(options)==-1) 
  {
    return false;
  }
  var args = Array.prototype.slice.call(arguments);
  args.shift();
  console.log.apply(null,args);  
}

module.exports.PAGE_SCRAPER = 1;
module.exports.FB_API 		= 2;
module.exports.DATASTORE	= 3;
module.exports.MAIN			= 4;