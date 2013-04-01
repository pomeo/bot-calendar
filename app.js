
/**
 * Module dependencies.
 */

var express  = require('express')
  , http     = require('http')
  , RedisStore = require('connect-redis')(express)
  , xmpp     = require('simple-xmpp')
  , passport = require('passport')
  , WindowsLiveStrategy = require('passport-windowslive').Strategy
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
  console.log(req);
  res.render('index', { user: req.user });
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

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

xmpp.on('online', function() {
  console.log('Yes, I\'m connected!');
});

xmpp.on('chat', function(from, message) {
  xmpp.send(from, 'echo: ' + message);
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