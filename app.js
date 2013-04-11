
/**
 * Module dependencies.
 */

var express  = require('express')
  , http     = require('http')
  , RedisStore = require('connect-redis')(express)
  , xmpp     = require('simple-xmpp')
  , passport = require('passport')
  , WindowsLiveStrategy = require('passport-windowslive').Strategy
  , rest = require('restler')
  , token
  , path     = require('path');

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new WindowsLiveStrategy({
    clientID: process.env.WINDOWS_LIVE_CLIENT_ID,
    clientSecret: process.env.WINDOWS_LIVE_CLIENT_SECRET,
    callbackURL: 'http://bot.pomeo.ru/auth/windowslive/callback'
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      token = accessToken;
      return done(null, profile);
    });
  }
));

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser(process.env.SECRET));
app.use(express.session({store: new RedisStore({host:'redis.robo38.com', port:6379, pass:''})}));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res){
  res.send('It works!');
});

app.get('/auth/windowslive',
  passport.authenticate('windowslive', { scope: ['wl.signin', 'wl.basic', 'wl.calendars', 'wl.events_create'] }),
  function(req, res){
  }
);

app.get('/auth/windowslive/callback',
  passport.authenticate('windowslive', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/');
  }
);

xmpp.on('online', function() {
  console.log('Yes, I\'m connected!');
});

xmpp.on('chat', function(from, message) {
  if (from === 'me@sovechkin.com') {
    var rePattern = new RegExp(/^(\d{2}).(\d{2}).(\d{2})\|([\w\sа-яА-Я\.\,\:\;]{1,255})\|([\w\W]{1,32768})$/);
    var msgmatch = message.match(rePattern);
    if (msgmatch) {
      if ((msgmatch[1] <= 0)||(msgmatch[1] >= 32)) {
        xmpp.send(from, 'day error');
      } else if ((msgmatch[2] <= 0)||(msgmatch[2] >= 13)) {
        xmpp.send(from, 'month error');
      } else {
        rest.post('https://apis.live.net/v5.0/me/events?access_token='+token, {
          headers: { 'accept-encoding': 'gzip' },
          data:    {
            name: msgmatch[4],
            description : msgmatch[5],
            is_all_day_event: true,
            visibility: 'private',
            start_time: '20'+msgmatch[3]+'-'+msgmatch[2]+'-'+msgmatch[1]+'T00:00:00+0400'
          }
        }).on('complete', function(data, response) {
          if (response.statusCode === 201) {
            xmpp.send(from, 'done');
          } else if (response.statusCode === 401) {
            xmpp.send(from, 'need login');
          } else {
            xmpp.send(from, 'status: ' + response.statusCode);
          }
        });
      }
    } else if (message === 'help') {
      xmpp.send(from, 'dd.mm.yyyy|title|description - sample: 21.12.13|name|some description\nlogin  - url for authorization\nlogout - end session\nhelp   - this message');
    } else if (message === 'login') {
      xmpp.send(from, 'http://' + process.env.BOT_URL + '/auth/windowslive');
    } else if (message === 'logout') {
      req.logout();
      xmpp.send(from, 'exit');
    } else {
      xmpp.send(from, 'send \'help\'');
    }
  }
});

xmpp.on('error', function(err) {
  console.error(err);
});

xmpp.connect({
  jid      : process.env.JABBER_NAME,
  password : process.env.JABBER_PASSWORD,
  host     : 'talk.google.com',
  port     : 5222
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});