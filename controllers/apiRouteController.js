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

var leagueId, seasonId, weekId, teamId, logicalSeasonId;

var isSeasonConcluded = false;

apiRouteController.PlayerSearch = function (req, res) {
  var criteria = {};

  var searchValues = [
    'firstName',
    'lastName',
    'position',
    'positionCategory',
    'college',
    'team',
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

  var findOne = false;
  if(req.query.findone){
    findOne = req.query.findone.toLowerCase() === 'true' || req.query.findone.toLowerCase() === '1';
  }

  async.series(
    {
      espnAuth: authenticateEspnCredentials,
      playerSearch: function(cb){ return playerSearch(criteria, cb, findOne); }
    },
    // On Complete
    function(err, results){
      if(err){
        console.log(err);
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

var playerSearch = function(criteria, callback, findOne){
  var c = criteria;
  findOne = arguments.length === 3 ? findOne : false;

  var sortableProps = [
    'firstName',
    'lastName',
    'position',
    'positionCategory',
    'college',
    'team',
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

  if(tSortByArray.length){
    c.sortBy = tSortByArray[0];
  }

  c.sortDirection = c.sortDirection && c.sortDirection === 'desc' ? 'desc' : 'asc';

  c.limit = c.limit && !isNaN(c.limit) ? parseInt(c.limit, 0) : 10;

  // console.log(c);
  var data = _.chain(dataCache.players)[findOne ? 'find' : 'filter'](function(p){
    var found = true;

    if(typeof c.id !== 'undefined' && !isNaN(c.id)){
      found = p.id === parseInt(c.id,0);
      if(found) return true; // Exit immediately
    }

    if(typeof c.firstName !== 'undefined'){
      found = p.firstName.toLowerCase() === c.firstName.toLowerCase();
      if(!found) return false;
    }

    if(typeof c.lastName !== 'undefined'){
      found = p.lastName.toLowerCase() === c.lastName.toLowerCase();
      if(!found) return false;
    }

    if(typeof c.college !== 'undefined'){
      found = p.college.toLowerCase() === c.college.toLowerCase();
      if(!found) return false;
    }

    if(typeof c.team !== 'undefined'){
      found = p.team.toLowerCase() === c.team.toLowerCase();
      if(!found) return false;
    }

    if(typeof c.position !== 'undefined'){
      found = p.position.toLowerCase() === c.position.toLowerCase() || p.fantasyPosition.toLowerCase() === c.position.toLowerCase();
      if(!found) return false;
    }

    if(typeof c.age !== 'undefined' && !isNaN(c.age)){
      found = p.age === parseInt(c.age,0);
      if(!found) return false;
    }
    else if(typeof p.age === 'undefined' && c.sortBy === 'age'){
      return false;
    }

    if(typeof c.heightInInches !== 'undefined' && !isNaN(c.heightInInches)){
      found = p.heightInInches === parseInt(c.heightInInches,0);
      if(!found) return false;
    }

    if(typeof c.weight !== 'undefined' && !isNaN(c.weight)){
      found = (p.weight <= (parseInt(c.weight,0) + 10)) && (p.weight >= (parseInt(c.weight,0) - 10)); // Between 10+/- lbs
      if(!found) return false;
    }

    if(typeof c.experience !== 'undefined' && !isNaN(c.experience)){
      found = p.experience === parseInt(c.experience,0);
      if(!found) return false;
    }

    if(typeof c.number !== 'undefined' && !isNaN(c.number)){
      found = p.number === parseInt(c.number,0);
      if(!found) return false;
    }

    return found;
  })
  .sortBy(c.sortBy)
  .tap(function(items){
    if(c.sortDirection === 'desc'){
      return _(items).reverse();
    }

    return items;
  })
  .first(c.limit)
  .value();

  callback(null, data);
};

var sendBackValidResponse = function(res, responeBody){
  lastAuthDate = moment();
  return res.json(responeBody);
};

function getTeamIdFromUrl(urlStr){
  if(!urlStr) return -1;
  if(!_.str.startsWith(urlStr, 'http')){
    urlStr = 'http://www.google.com' + urlStr;
  }

  var uri = url.parse(urlStr, true);

  return parseInt(uri.query.teamId, 0);
}

function getTrophyIdFromUrl(urlStr){
  // console.log(urlStr);
  if(!urlStr) return -1;
  if(!_.str.startsWith(urlStr, 'http')){
    urlStr = 'http://www.google.com' + urlStr;
  }

  var uri = url.parse(urlStr, true);

  return parseInt(uri.query.trophyId, 0);
}

function getFeeBreakDownFromStr(str){
  var parts = str.split(' ');
  var total = parseFloat(_.str.trim(parts[0], '$'),2);
  var qty = parseInt(_.str.trim(parts[1], ['(',')',' ']),0);

  return {
    total: total,
    quantity: qty
  };
}

function getTrxTypes($){
  var table = $('.tableBody')[1];
  var rows = _($(table).find('tr')).rest(2);
  var trxTypes = [];
  _(rows).each(function(row){
    var trxName = $(row).find('td').eq(0).text();
    var trxKey = _.str.classify(trxName);
    var trxCost = parseFloat($(row).find('td').eq(1).text().split('$')[1], 2);
    trxTypes.push({
      name: trxName,
      key: trxKey,
      cost: trxCost
    });
  });

  return trxTypes;
}

function getOverallRecord(str){
  var parts = str.split('-');
  var wins = parseInt(parts[0],0);
  var losses = parseInt(parts[1],0);
  var ties = parseInt(parts[2],0) || 0;
  return {
    wins: wins,
    losses: losses,
    ties: ties
  };
}

function getGameResults(str){
  var parts = str.split(' ');

  if(parts.length < 2){
    return {
      isWinner: false,
      outcome: 'undetermined',
      scores: {
        team: null,
        opponent: null
      }
    };
  }

  var sparts = parts[1].split('-');
  var score1 = parseFloat(sparts[0],2) || 0;
  var score2 = parseFloat(sparts[1],2) || 0;
  var outcome = parts[0].toLowerCase() === 'w' ? 'win' : (parts[0].toLowerCase() === 'l' ? 'loss' : 'tie');
  var max = [score1,score2].sort()[1];
  var min = [score1,score2].sort()[0];

  return {
    isWinner: outcome === 'win',
    outcome: outcome,
    scores: {
      team: outcome === 'win' ? max : min,
      opponent: outcome === 'win' ? min : max
    }
  };
}

function calculateRunningRecord(outcomes){
  _(outcomes).each(function(o,i){
    if(o.result.outcome != 'undetermined'){
      var wins = i === 0 ? 0 : outcomes[i-1].recordSnapshot.wins;
      var losses = i === 0 ? 0 : outcomes[i-1].recordSnapshot.losses;
      var ties = i === 0 ? 0 : outcomes[i-1].recordSnapshot.ties;

      if(o.result.outcome === 'win'){
        o.recordSnapshot = {
          wins: wins+1,
          losses: losses,
          ties: ties
        };
      }
      else if(o.result.outcome === 'loss'){
        o.recordSnapshot = {
          wins: wins,
          losses: losses+1,
          ties: ties
        };
      }
      else{
        o.recordSnapshot = {
          wins: wins,
          losses: losses,
          ties: ties+1
        };
      }
    }
  }, outcomes);

  return outcomes;
}

function getPlayerInfo(pstr){
  var pi = {
    firstName: null,
    lastName: null,
    team: {
      abbrev: null
    },
    position: null,
    isKeeper: false
  };

  if(!pstr) return pi;

  var s = pstr.split('*').join('');

  if(_.str.words(s).length < 4){
    return pi;
  }

  var firstName = _.str.words(s)[0];
  var lastName = _.str.words(s)[1].split(',').join('');
  var teamAbbr = _.str.words(s)[2].toUpperCase();
  var position = _.str.words(s)[3];
  var isKeeper = _.str.words(s).length > 4;

  pi.firstName = firstName;
  pi.lastName = lastName;
  pi.team.abbrev = teamAbbr;
  pi.position = position;
  pi.isKeeper = isKeeper;

  if(lastName == 'D/ST'){
    pi.firstName = null,
    pi.lastName = null
  }

  return pi;
}

function getPlayerId(str){
  return parseInt(str.split('_')[1],0);
}

module.exports = apiRouteController;