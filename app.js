
/**
 * Module dependencies.
 */

var express = require('express');
var database = require('./mongodb');
var routes = require('./routes');
var user = require('./routes/user');
var panel = require('./routes/panel');
var talk = require('./routes/talk');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 8000);
app.set('host', '0.0.0.0');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('appname', 'WebChatter');

// app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.bodyParser());
app.use(express.cookieParser('rettahcbew'));
app.use(express.cookieSession({key:'wcs'}));
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ( true || 'development' == app.get('env')) {
  app.use(express.errorHandler());
}

// routes
app.get('/', user.check_signin, routes.index);
app.get('/friend_list', user.check_signin, routes.friend_list);
app.get('/group_list', user.check_signin, routes.group_list);

app.get('/panel/search', panel.search_index);
app.get('/panel/all_user_emails', user.check_signin, panel.all_user_emails);
app.get('/panel/manage_groups', user.check_signin, panel.manage_groups);
app.get('/panel/manage_group_list', user.check_signin, panel.manage_group_list);
app.delete('/panel/group', user.check_signin, panel.drop_group);
app.delete('/panel/group/member', user.check_signin, panel.remove_group_member);
app.post('/panel/group/new', user.check_signin, panel.new_group);
app.post('/panel/group/add_member', user.check_signin, panel.add_member);
app.post('/panel/search', user.check_signin, panel.search_data);
app.post('/panel/friend_request', user.check_signin, panel.friend_request);
app.post('/panel/friend_remove', user.check_signin, panel.friend_remove);
app.get('/panel/notifications', user.check_signin, panel.notifications);
app.post('/panel/handle_friend_request', user.check_signin, panel.handle_friend_request);
app.post('/panel/notifications_clean', user.check_signin, panel.notifications_clean);

app.get('/talk/start', user.check_signin, talk.start);
app.post('/talk/live', user.check_signin, talk.live);
app.delete('/talk/live', user.check_signin, talk.delete);
app.delete('/grouptalk/live', user.check_signin, talk.group_message_delete);
app.post('/talkto/:email', user.check_signin, talk.talkto);
app.post('/talktogroup/:name', user.check_signin, talk.talktogroup);
app.post('/talk/history', user.check_signin, talk.talk_history);
app.post('/grouptalk/history', user.check_signin, talk.grouptalk_history);
app.get('/talk/start_group', user.check_signin, talk.start_group);

app.get('/signup', user.signup_index);
app.get('/signin', user.signin_index);
app.get('/signout', user.signout);
app.post('/signin', user.signin);
app.post('/signup/new', user.signup_new);

// open database and http listen
database.init(function () {
	http.createServer(app).listen(app.get('port'), app.get('host'), function(){
	  console.log('Express server listening on port ' + app.get('port'));
	});
});

