var request = require('request').defaults({jar:true}); //Create a new cookie jar for maintaining auth
var _ = require('underscore'),
  cheerio = require('cheerio'),
  async = require('async'),
  colors = require('colors'),
  moment = require('moment-timezone'),
  url = require('url'),
  fs = require('fs');

var lastAuthDate = moment().add('week', -1); //Default to past

var apiRouteController = function(){};

apiRouteController.PlayerSearch = function (req, res) {
  var criteria = {};

  var searchValues = [
    'firstName',
    'lastName',
    'position',
    'positionCategory',
    'college',
    'team',
    'age',
    'number',
    'experience',
    'weight',
    'id',

    'limit',
    'sortDirection',
    'sortBy'
  ];

  for (var i = 0; i < searchValues.length; i++) {
    var val = typeof req.query[searchValues[i].toLowerCase()] !== 'undefined' ? req.query[searchValues[i].toLowerCase()] : '';
    if(val){
      criteria[searchValues[i]] = req.query[searchValues[i].toLowerCase()];
    }
  };

  if(req.query.height){
    criteria.heightInInches = req.query.height;
  }

  if(req.query.sortby){
    criteria.sortByArray = req.query.sortby.split(',');
  }

  async.series(
    {
      espnAuth: authenticateEspnCredentials,
      playerSearch: function(cb){ return playerSearch(criteria, cb); }
    },
    // On Complete
    function(err, results){
      if(err){
        loggger.error(err);
        return res.status(500).json({ 'message' : 'Failed to retrieve player by the given info.' });
      }

      if(!results.playerSearch){
        return res.status(404).json({ 'message' : 'Failed to retrieve player by the given info.' });
      }

      return sendBackValidResponse(res, results.playerSearch);
    }
  );

  return;
};

var authenticateEspnCredentials = function(callback){
  // var staleAuthTimeInMs = 1 * 60 * 60 * 1000;
  // if(moment().diff(lastAuthDate) <= staleAuthTimeInMs){
    return callback(null, {login:true});
  // }

  // console.log('Authentication expired. Need to re-authenticate.'.yellow);

  // // language=en&affiliateName=espn&appRedirect=http%3A%2F%2Fespn.go.com%2F&parentLocation=http%3A%2F%2Fespn.go.com%2F&registrationFormId=espn
  // var authOptions = {
  //   username: options.access.username,
  //   password: options.access.password,
  //   language:'en',
  //   affiliateName:'espn',
  //   appRedirect:'http://espn.go.com',
  //   parentLocation:'http://espn.go.com',
  //   registrationFormId:'espn'
  // };
  // var reqOptions = {
  //   url:'https://r.espn.go.com/members/util/loginUser',
  //   form: authOptions
  // };
  // console.log('Attempting to authenticate ESPN credentials...'.grey);
  // request.post(reqOptions, function(err, result, body){
  //   var loginResult = JSON.parse(body);
  //   if(err){
  //     console.log('Failed to authenticate.'.red);
  //     callback(err, null);
  //     return;
  //   }
  //   else if(loginResult.login === 'false'){
  //     console.log('Failed authentication with given credentials.'.red);
  //     console.log(body.red);
  //     callback(body, null);
  //     return;
  //   }
  //   console.log('Passed authentication.'.green);
  //   lastAuthDate = moment();
  //   callback(null, body);
  //   return;
  // });
};

var playerSearch = function(criteria, callback){
  var c = criteria;

  var sortableProps = [
    'firstName',
    'lastName',
    'position',
    'fantasyPosition',
    'fantasyPositionCategory',
    'college',
    'team',
    'age',
    'number',
    'experience',
    'weight',
    'id'
  ];

  var tSortByArray = [];
  if(c.sortByArray && c.sortByArray.length){
    for (var i = 0; i < c.sortByArray.length; i++) {
      var foundSortableProp = _(sortableProps).find(function(prop){
        return prop.toLowerCase() === c.sortByArray[i].toLowerCase();
      });
      if(foundSortableProp){
        if(tSortByArray.indexOf(foundSortableProp) === -1){
          tSortByArray.push(foundSortableProp)
        }
      }
    };
  }

  c.sortByArray = _.clone(tSortByArray);

  c.sortDirection = c.sortDirection && c.sortDirection === 'desc' ? 'desc' : 'asc';

  c.limit = c.limit && !isNaN(c.limit) ? parseInt(c.limit, 0) : 10;

  // console.log(c);
  var data = _.chain(dataCache.players).filter(function(p){
    var found = true;

    if(typeof c.id !== 'undefined' && !isNaN(c.id) && c.id.indexOf(',') === -1){
      found = p.id === parseInt(c.id,0);
      if(found) return true; // Exit immediately
    }
    else if(typeof c.id !== 'undefined' && c.id.split(',').length > 0){
      var found = _(c.id.split(',')).find(function(pid){
        return p.id === parseInt(pid, 0);
      });
      if(found) return true; // Exit immediately
      else return false;
    }

    found = stringSearch(c, 'firstName', p);
    if(!found) return false;

    found = stringSearch(c, 'lastName', p);
    if(!found) return false;

    found = stringSearch(c, 'college', p);
    if(!found) return false;

    found = stringSearch(c, 'team', p);
    if(!found) return false;

    found = stringSearch(c, 'position', p);
    if(!found) return false;

    found = stringSearch(c, 'fantasyPosition', p);
    if(!found) return false;

    found = stringSearch(c, 'fantasyPositionCategory', p);
    if(!found) return false;

    // if(typeof c.firstName !== 'undefined'){
    //   found = p.firstName.toLowerCase() === c.firstName.toLowerCase();

    //   if(!found && _.str.startsWith(c.firstName,'*') && c.firstName.length > 1 && _.str.trim(c.firstName,'*').length){
    //     found = _.str.endsWith((p.firstName||'').toLowerCase(), _(c.firstName).rest(1).join('').toLowerCase());
    //   }

    //   if(!found) return false;
    // }

    // if(typeof c.lastName !== 'undefined'){
    //   found = p.lastName.toLowerCase() === c.lastName.toLowerCase();
    //   if(!found) return false;
    // }

    // if(typeof c.college !== 'undefined'){
    //   found = p.college.toLowerCase() === c.college.toLowerCase();
    //   if(!found) return false;
    // }

    // if(typeof c.team !== 'undefined'){
    //   found = p.team.toLowerCase() === c.team.toLowerCase();
    //   if(!found) return false;
    // }

    // if(typeof c.position !== 'undefined'){
    //   found = p.position.toLowerCase() === c.position.toLowerCase();
    //   if(!found) return false;
    // }

    // if(typeof c.fantasyPosition !== 'undefined'){
    //   found = p.fantasyPosition.toLowerCase() === c.fantasyPosition.toLowerCase();
    //   if(!found) return false;
    // }

    // if(typeof c.fantasyPositionCategory !== 'undefined'){
    //   found = p.fantasyPositionCategory.toLowerCase() === c.fantasyPositionCategory.toLowerCase();
    //   if(!found) return false;
    // }

    found = numberSearch(c, 'age', p);
    if(!found) return false;

    found = numberSearch(c, 'heightInInches', p);
    if(!found) return false;

    found = numberSearch(c, 'weight', p, 10);
    if(!found) return false;

    found = numberSearch(c, 'experience', p);
    if(!found) return false;

    found = numberSearch(c, 'number', p);
    if(!found) return false;

    // if(typeof c.age !== 'undefined' && !isNaN(c.age)){
    //   found = p.age === parseInt(c.age,0);
    //   if(!found) return false;
    // }
    // else if(typeof p.age === 'undefined' && c.sortBy === 'age'){
    //   return false;
    // }

    // if(typeof c.heightInInches !== 'undefined' && !isNaN(c.heightInInches)){
    //   found = p.heightInInches === parseInt(c.heightInInches,0);
    //   if(!found) return false;
    // }

    // if(typeof c.weight !== 'undefined' && !isNaN(c.weight)){
    //   found = (p.weight <= (parseInt(c.weight,0) + 10)) && (p.weight >= (parseInt(c.weight,0) - 10)); // Between 10+/- lbs
    //   if(!found) return false;
    // }

    // if(typeof c.experience !== 'undefined' && !isNaN(c.experience)){
    //   found = p.experience === parseInt(c.experience,0);
    //   if(!found) return false;
    // }

    // if(typeof c.number !== 'undefined' && !isNaN(c.number)){
    //   found = p.number === parseInt(c.number,0);
    //   if(!found) return false;
    // }

    return found;
  })
  .sortBy(function(p){
    return _.chain(p) // Make it chainable [{hi:1},{there:2},{guy:3}]
      .pick(c.sortByArray) // Grab the sort properties from objects ['hi','there'] => [{hi:1},{there:2}]
      .values() // Pull out only the values into an array [1,2]
      .map(function(item){
        if(typeof item === 'undefined' || item === null || typeof item === 'number'){
          return item;
        }
        else{
          return item.toString().toUpperCase();
        }
      })
      .value(); // Return the value array [1,2]
  })
  .tap(function(players){
    if(c.sortDirection === 'desc'){
      players = _(players).reverse();
    }

    return _(players).reject(function(p){
      var isValid = true;
      for (var i = 0; i < c.sortByArray.length; i++) {
        if(typeof p[c.sortByArray[i]] === 'undefined'){
          isValid = false;
          break;
        }
      };

      return isValid;
    });
  })
  .first(c.limit)
  .value();

  callback(null, data);
};

var stringSearch = function(criteria, property, obj){
  var c = criteria;
  var p = property;
  var o = obj;
  var found = true;

  if(typeof c[p] !== 'undefined'){
    found = (o[p]||'').toLowerCase() === c[p].toLowerCase();

    // Ends with
    if(!found && _.str.startsWith(c[p],'*') && c[p].length > 1 && _.str.trim(c[p],'*').length){
      found = _.str.endsWith((o[p]||'').toLowerCase(), _(c[p]).rest(1).join('').toLowerCase());
    }

    // Starts with
    if(!found && _.str.endsWith(c[p],'*') && c[p].length > 1 && _.str.trim(c[p],'*').length){
      found = _.str.startsWith((o[p]||'').toLowerCase(), _(c[p]).first(c[p].length - 1).join('').toLowerCase());
    }

    // Contains
    if(!found && _.str.endsWith(c[p],'*') && _.str.startsWith(c[p],'*') && c[p].length > 2 && _.str.trim(c[p],'*').length){
      found = _.str.contains((o[p]||'').toLowerCase(), _.str.trim(c[p], '*').toLowerCase());
    }
  }

  return found;
}

var numberSearch = function(criteria, property, obj, variance){
  var c = criteria;
  var p = property;
  var o = obj;
  var v = variance || 0;
  var found = true;

  if(typeof c[p] !== 'undefined' && !isNaN(c[p])){
    found = ((o[p]||-1) <= (parseInt(c[p],0) + v)) && ((o[p]||-1) >= (parseInt(c[p],0) - v));
    if(!found) return false;
  }

  return found;
}

var sendBackValidResponse = function(res, responeBody){
  lastAuthDate = moment();
  return res.json(responeBody);
};


module.exports = apiRouteController;