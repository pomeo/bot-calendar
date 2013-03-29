
/**
 * Module dependencies.
 */

var express  = require('express')
  , http     = require('http')
  , xmpp     = require('simple-xmpp')
  , path     = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res){
  res.render('index', { title: 'Express' });
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
