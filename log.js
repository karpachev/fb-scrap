
module.exports = function (options, message) {
  var allowed_modules = [
    module.exports.FB_API,
		module.exports.PAGE_SCRAPER,
		module.exports.MAIN
  ];

  var src_module = options;
  var log_level = module.exports.INFO; // default level
  if (  typeof options === "object" ) {
    src_module = options.module;
    if (options.level) {
      log_level = options.level;
    }
  }

  if (allowed_modules.indexOf(src_module)==-1) 
  {
    return false;
  }
  if (log_level<module.exports.CURRENT_LEVEL) {
    return false;
  }


  var args = Array.prototype.slice.call(arguments);
  args.shift();
  console.log.apply(null,args);  
}

module.exports.PAGE_SCRAPER = 1;
module.exports.FB_API 		= 2;
module.exports.DATASTORE	= 3;
module.exports.MAIN     = 4;


module.exports.DEBUG     = 0;
module.exports.INFO     = 1;
module.exports.WARN     = 2;
module.exports.ERROR      = 3;
module.exports.FATAL			= 4;


module.exports.CURRENT_LEVEL = module.exports.WARN;
