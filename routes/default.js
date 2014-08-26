var _ = require('underscore');
_.str = require('underscore.string');
var controllers = {};

controllers.pageRouteController = require('../controllers/pageRouteController');
controllers.apiRouteController = require('../controllers/apiRouteController');

module.exports = function(app, options){
  var defaultHttpMethod = "get";
  _.each(appRoutes, function(route){
    app[route.method || defaultHttpMethod](route.path, controllers[route.controller][route.action]);
  });
};