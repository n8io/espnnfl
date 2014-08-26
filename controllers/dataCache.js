var request = require('request');
var _ = require('underscore'),
  cheerio = require('cheerio'),
  async = require('async'),
  colors = require('colors'),
  moment = require('moment-timezone'),
  url = require('url'),
  fs = require('fs');

var playerCache = [];
var teamCache = [];

var dataCache = function(){};

var parsePlayersFromTeamRoster = function(teamAbbrev, callback){
  var options = {
    method: 'get',
    uri: 'http://espn.go.com/nfl/team/roster/_/name/'+teamAbbrev
  };

  request(options, function(err, results, body){
    if(err){
      console.log('Failed to retrieve given team roster.'.red);
      callback(err, null);
      return;
    }

    $ = cheerio.load(body);

    var table = $('table.tablehead');

    var rows = _($(table).find('tr')).filter(function(tr){
      return _.str.contains($(tr).attr('class'), 'player-');
    });

    if(rows.length <= 0){
      console.log('Could not find team roster rows for team: '.red + teamAbbrev.toString().red);
      callback(1, null);
      return;
    }

    _(rows).each(function(row){
      var player = parsePlayerInfo(row);
      player.team = teamAbbrev;
      if(!_(playerCache).findWhere({id:player.id})){
        playerCache.push(player);
      }
    });

    callback(null);
  });
};

var parsePlayerInfo = function(row){
  var link = $(row).find('a');
  var id = parseInt(link.attr('href').split('http://espn.go.com/nfl/player/_/id/')[1].split('/')[0], 0);
  var firstName = _.str.trim(link.text().split(' ')[0]);
  var lastName = _.str.trim(_(link.text().split(' ')).rest(1).join(' '));
  var tdPosition = $(row).find('td').eq(2);
  var position = _.str.trim(tdPosition.text(), [' ', '?']);
  var tdNumber = $(row).find('td').first();
  var number = parseInt(_.str.trim(tdNumber.text(), [' ', '-']), 0) || -1;
  var tdAge = $(row).find('td').eq(3);
  var age = parseInt(_.str.trim(tdAge.text(), [' ', '-']), 0) || -1;
  var strHeight = $(row).find('td').eq(4).text();
  var height = 0;

  if(strHeight && strHeight.indexOf('-') > -1){
    var feet = parseInt(strHeight.split('-')[0],0);
    var inches = parseInt(strHeight.split('-')[1],0);
    height = (feet * 12) + inches;
  }

  var tdWeight = $(row).find('td').eq(5);
  var weight = parseInt(_.str.trim(tdWeight.text(), [' ', '-']), 0) || -1;

  var tdExperience = $(row).find('td').eq(6);
  var experience = parseInt(_.str.trim(tdExperience.text(), [' ', '-']), 0) || 0;

  var tdCollege = $(row).find('td').eq(7);
  var college = _.str.trim(tdCollege.text(), [' ', '?', '-']);

  var player = {
    id: id,
    firstName: firstName,
    lastName: lastName,
    position: position.toUpperCase(),
    experience: experience,
    fantasyPosition: parsePlayerFantasyPosition(position),
    fantasyPositionCategory: parsePlayerFantasyPositionCategory(position),
    number: number
  };

  if(age > 0){
    player.age = age;
  }

  if(number > 0){
    player.number = number;
  }

  if(weight > 0){
    player.weight = weight;
  }

  if(height > 0){
    player.heightInInches = height;
  }

  if(experience > 0){
    player.experience = experience;
  }

  if(college){
    player.college = college;
  }

  if(strHeight){
    player.height = strHeight;
  }

  return player;
};

var parsePlayerFantasyPosition = function(actual){
  var raw = actual || '';
  raw = raw.toLowerCase();

  if(!raw) return actual;

  switch(raw){
    case 'cch':
      return 'coach'.toUpperCase();
    case 'qb':
    case 'te':
    case 'wr':
    case 'p':
      return raw.toUpperCase();
    case 'rb':
    case 'fb':
    case 'hb':
      return 'rb'.toUpperCase();
    case 'db':
    case 'cb':
    case 's':
    case 'fs':
    case 'ss':
    case 'ws':
      return 'db'.toUpperCase();
    case 'lb':
    case 'ilb':
    case 'olb':
      return 'lb'.toUpperCase();
    case 'dl':
    case 'de':
    case 'dt':
      return 'dl'.toUpperCase();
    case 'ol':
    case 'c':
    case 'g':
    case 'og':
    case 'lg':
    case 'rg':
    case 't':
    case 'rt':
    case 'lt':
    case 'ot':
      return 'ol'.toUpperCase();
    case 'k':
    case 'pk':
      return 'k'.toUpperCase();
    default:
      console.log(raw);
      return raw.toUpperCase();
  }
};

var parsePlayerFantasyPositionCategory = function(actual){
  var raw = actual || '';
  raw = raw.toLowerCase();

  if(!raw) return actual;

  switch(raw){
    case 'cch':
      return 'coach'.toUpperCase();
    case 'qb':
    case 'te':
    case 'wr':
    case 'rb':
    case 'fb':
    case 'hb':
    case 'ol':
    case 'c':
    case 'g':
    case 'og':
    case 'lg':
    case 'rg':
    case 't':
    case 'rt':
    case 'lt':
    case 'ot':
      return 'off'.toUpperCase();
    case 'db':
    case 'cb':
    case 's':
    case 'fs':
    case 'ss':
    case 'ws':
    case 'lb':
    case 'ilb':
    case 'olb':
    case 'dl':
    case 'de':
    case 'dt':
      return 'def'.toUpperCase();
    case 'k':
    case 'pk':
    case 'p':
      return 'st'.toUpperCase();
    default:
      console.log(raw);
      return raw.toUpperCase();
  }
};

var parseTeamsFromMobileListing = function(callback){
  var options = {
    method: 'get',
    uri: 'http://m.espn.go.com/nfl/teams'
  };

  request(options, function(err, results, body){
    if(err){
      console.log('Failed to retrieve mobile teams listing.'.red);
      callback(err, null);
      return;
    }

    $ = cheerio.load(body);

    var links = $('.zebra-links * a');

    if(links.length <= 0){
      console.log('Could not find teams'.red);
      callback(1, null);
      return;
    }

    _(links).each(function(link){
      var id = parseInt($(link).attr('href').split('clubhouse?teamId=')[1], 0);
      var fullName = _.str.trim($(link).find('p').text());
      var team = {
        id: id,
        fullName: fullName
      };
      if(!_(teamCache).findWhere({id:team.id})){
        teamCache.push(team);
      }
    });

    callback(null);
  });
}

var parseTeamsFromDesktopListing = function(callback){
  var options = {
    method: 'get',
    uri: 'http://espn.go.com/nfl/teams'
  };

  request(options, function(err, results, body){
    if(err){
      console.log('Failed to retrieve desktop teams listing.'.red);
      callback(err, null);
      return;
    }

    $ = cheerio.load(body);

    var conferenceDivs = $('.mod-open-list');

    if(conferenceDivs.length <= 0){
      console.log('Could not find conferences'.red);
      callback(1, null);
      return;
    }

    _(conferenceDivs).each(function(conference){
      var header = $(conference).find('.stathead h4');
      var blogUrl = header.find('span a').attr('href');
      header.find('span').remove();
      var conferenceName = header.text();

      var teams = $(conference).find('.medium-logos li');
      _(teams).each(function(team){
        var link = $(team).find('h5 a');
        var fullName = _.str.trim(link.text());
        var abbrev = link.attr('href').split('_/name/')[1].split('/')[0].toUpperCase();

        var tc = _(teamCache).findWhere({fullName:fullName});
        if(tc){
          tc.abbrev = abbrev;
          tc.conference = {
            name: conferenceName,
            blogUrl: blogUrl,
            abbrev: blogUrl.split('http://espn.go.com/blog/')[1]
          };
        }
      });
    });

    callback(null);
  });
}

dataCache.initPlayers = function(callback){
  var teamIds = _(teamCache).pluck('abbrev');

  async.mapLimit(
    teamIds,
    16,
    parsePlayersFromTeamRoster,
    function(err, results){
      if(err){
        console.log('Failed to retrieve team roster rows.'.red);
        callback(1, null);
        return;
      }

      fs.writeFile('./players.json', JSON.stringify(playerCache, null, 2));

      console.log((playerCache.length + ' players loaded into cache.').cyan);

      return callback(null, playerCache);
    });
};

dataCache.initTeams = function(outerCallback){
  async.series({
    initTeamIds: function(callback){
      return parseTeamsFromMobileListing(callback);
    },
    initTeamMetadata: function(callback){
      return parseTeamsFromDesktopListing(callback);
    }
  },
  function(err, results){
    if(err){
      console.log('Failed to init teams.'.red);
      outerCallback(1, null);
      return;
    }

    console.log((teamCache.length + ' teams loaded into cache.').cyan);

    fs.writeFile('./teams.json', JSON.stringify(teamCache, null, 2));

    outerCallback(null, teamCache);
  });
};

dataCache.players = playerCache;
dataCache.teams = teamCache;

module.exports = dataCache;