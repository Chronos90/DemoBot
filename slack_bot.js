var Botkit = require('./botkit/lib/Botkit.js')

if (!process.env.clientId || !process.env.clientSecret || !process.env.port) {
  console.log('Error: Specify clientId and clientSecret and port in environment')
  process.exit(1)
}

var controller = Botkit.slackbot({
 debug: false,
 json_file_store: './db/',
 clientId: process.env.clientId,
 clientSecret: process.env.clientSecret,
 scopes: ['bot','commands'],
})

controller.setupWebserver(process.env.port, function(err, webserver) {
  controller.createWebhookEndpoints(controller.webserver)
  controller.createOauthEndpoints(controller.webserver, function(err, req, res) {
    if (err) {
      res.status(500).send('ERROR: ' + err)
    } else {
      res.send('Success!')
    }
  })
})

var owner_name = null
controller.hears(['hola'],['direct_message','direct_mention','mention'],function(bot,message) {
  if (owner_name) {
    bot.reply(message,"Hola " + owner_name + "!");
  } else {
    bot.reply(message,"Hola! ¿Cómo te llamas?");
  }
});

controller.hears(['^me[\\s]+llamo[\\s]+(.+)$'],['direct_message','direct_mention','mention'],function(bot,message) {
  if (message.match[1]) {
    owner_name = message.match[1]
    bot.reply(message, "Vale " + owner_name + ", yo soy DemoBot")
  }
});

controller.hears(['attach'],['direct_message','direct_mention'],function(bot,message) {

  var attachments = [];
  var attachment = {
    title: 'This is an attachment',
    color: '#FFCC99',
    fields: [],
  };

  attachment.fields.push({
    label: 'Field',
    value: 'A longish value',
    short: false,
  });

  attachment.fields.push({
    label: 'Field',
    value: 'Value',
    short: true,
  });

  attachment.fields.push({
    label: 'Field',
    value: 'Value',
    short: true,
  });

  attachments.push(attachment);

  bot.reply(message,{
    text: 'See below...',
    attachments: attachments,
  },function(err,resp) {
    console.log(err,resp);
  });
});

var connected_teams = {}

trackTeam = function (token) {
  console.log('bot tracked for team\'s token ' + token)
  connected_teams[token] = true
}

checkTeamTracking = function (token) {
  if (connected_teams[token] == true) {
    return true
  } else {
    return false
  }
}

reconnectToTeams = function () {
  controller.storage.teams.all(function(err, teams) {
    if (err) {
      throw new Error(err)
    }
    // connect all teams with bots up to slack!
    teams.forEach(function (team) {
      if (team.bot.token) {
        if (checkTeamTracking(team.bot.token)) {
          //console.log('bot already tracked in team ' + team.id)
          // we check we don't have same team twice on database, because of first times developping.
          //console.log('already connected to team ' + team.id + ". skipping ...")
        } else {
          console.log('connecting bot to team ' + team.id)
          controller.spawn(team).startRTM(function (err, bot, payload) {
            if (err) {
              console.log(err)
            } else {
              trackTeam(team.bot.token)
            }
          })
        }
      } else {
        console.log('undefined team!')
      }
    })
  })
}

setInterval(reconnectToTeams, 5000)
