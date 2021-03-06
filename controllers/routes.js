var appRoutes = [
  { "method": "get",  "path" : "/",                                               "controller" : "pageRouteController", "action" : "Default" },
  { "method": "get",  "path" : "/endpoints",                                      "controller" : "pageRouteController", "action" : "Default" },
  { "method": "get",  "path" : "/heartbeat",                                      "controller" : "pageRouteController", "action" : "Heartbeat" },
  { "method": "get",  "path" : "/player/search",                                  "controller" : "apiRouteController",  "action" : "PlayerSearch" },
  // { "method": "get",  "path" : "/:leagueId/trophies",                             "controller" : "apiRouteController",  "action" : "Trophies" },
  // { "method": "get",  "path" : "/:leagueId/trophies/history/:trophyId",           "controller" : "apiRouteController",  "action" : "TrophyHistory" },
  // { "method": "get",  "path" : "/:leagueId/:seasonId",                            "controller" : "apiRouteController",  "action" : "Info" },
  // { "method": "get",  "path" : "/:leagueId/:seasonId/members",                    "controller" : "apiRouteController",  "action" : "Members" },
  // { "method": "get",  "path" : "/:leagueId/:seasonId/draftrecap",                 "controller" : "apiRouteController",  "action" : "DraftRecap" },
  // { "method": "get",  "path" : "/:leagueId/:seasonId/transactioncounts",          "controller" : "apiRouteController",  "action" : "TransactionCounts" },
  // { "method": "get",  "path" : "/:leagueId/:seasonId/finalstandings",             "controller" : "apiRouteController",  "action" : "FinalStandings" },
  // { "method": "get",  "path" : "/:leagueId/:seasonId/settings",                   "controller" : "apiRouteController",  "action" : "Settings" },
  // { "method": "get",  "path" : "/:leagueId/:seasonId/:teamId/schedule",           "controller" : "apiRouteController",  "action" : "TeamSchedule" },
  // { "method": "get",  "path" : "/:leagueId/:seasonId/:teamId/roster",             "controller" : "apiRouteController",  "action" : "TeamRoster" },
  // { "method": "get",  "path" : "/:leagueId/:seasonId/:weekId/scores",             "controller" : "apiRouteController",  "action" : "WeekScores" },
  // { "method": "get",  "path" : "/:leagueId/:seasonId/:weekId/:teamId/matchup",    "controller" : "apiRouteController",  "action" : "Matchup" }
];

module.exports = appRoutes;