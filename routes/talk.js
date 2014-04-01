var shortId = require('shortid');
var mongodb = require('mongodb');

exports.live = function (req, res) {
	res.data = {};
	res.data.notifications = 0;
	if ( req.user.notifications.friend_requests ) res.data.notifications += req.user.notifications.friend_requests.length;
	if ( req.user.notifications.friend_accepts ) res.data.notifications += req.user.notifications.friend_accepts.length;
	if ( req.user.notifications.friend_denies ) res.data.notifications += req.user.notifications.friend_denies.length;
	if ( req.user.notifications.friend_deletes ) res.data.notifications += req.user.notifications.friend_deletes.length;
	if ( req.user.notifications.group_drops ) res.data.notifications += req.user.notifications.group_drops.length;
	if ( req.user.notifications.group_member_adds ) res.data.notifications += req.user.notifications.group_member_adds.length;
	if ( req.user.notifications.group_member_removes ) res.data.notifications += req.user.notifications.group_member_removes.length;

	update_last_show_time(req.user.email);

	closed_window_messages(req, res, function () {
		opened_window_messages(req, res, function () {
			online_status(req, res, function () {
				res.json(res.data);
			})
		});
	});
};

exports.delete = function (req, res) {
	var id_to_delete = req.body.id_to_delete;
	var object_ids = [];
	for (var i = 0; i < id_to_delete.length; i++) {
		object_ids.push(new mongodb.ObjectID.createFromHexString(id_to_delete[i]));
	}

	db.collection('messages').remove({_id: {$in: object_ids}}, function (err,numberOfRemovedDocs) {
		if ( err ) {
			res.send(500);
		} else {
			res.send(200);
		}
	});

};

exports.group_message_delete = function (req, res) {
	var id_to_pull = req.body.id_to_pull;
	var object_ids = [];
	for (var i = 0; i < id_to_pull.length; i++) {
		object_ids.push(new mongodb.ObjectID.createFromHexString(id_to_pull[i]));
	}

	db.collection('group_messages').update({_id: {$in: object_ids}}, {$pull: { not_received: req.user.email }}, {multi: true}, function(err, result){
		if ( err ) {
			res.send(500);
		} else {
			res.send(200);
			db.collection('group_messages').remove({not_received: []}, function(){});
		}

	});
};

var update_last_show_time = function(email) {
	var users = db.collection('users');
	users.update({email: email}, { $set: {last_show_time: new Date()} }, function(){});
};

var online_status = function (req, res, next) {
	var users = db.collection('users');
	var online_start = new Date();
	online_start.setTime(online_start.getTime() - 5 * 1000);

	users.find({ $and: [ {email: { $in: req.user.friends }}, {last_show_time: { $gt: online_start }} ] }, {email: 1, _id: 0})
		.toArray(function (err, docs) {
			var status = [];
			for (var i = 0; i < docs.length; i++) {
				status.push(docs[i].email);
			}
			res.data.online_status = status;
			next();
		});
};

var closed_window_messages = function(req, res, next){
	var opened_emails = req.body.opened_emails || [];
	var opened_groups = req.body.opened_groups || [];

	var messages = db.collection('messages');
	var group_messages = db.collection('group_messages');
	var groups = db.collection('groups');

	messages.aggregate(
		[ 
			{ $match: {to: req.user.email, from: {$nin: opened_emails}} },
			{ $group: { _id: "$from", count: {$sum: 1} } } 
		]
	, function (err, result) {
		res.data.closed_window_users = result;
		groups.find({members: req.user.email}).toArray(function (err, docs) {
			var groups = [];
			for (var i = 0; i < docs.length; i++) {
				if( opened_groups.indexOf(docs[i].name) < 0 ) groups.push(docs[i].name);
			}
			group_messages.aggregate(
				[
					{ $match: {to: {$in: groups}, not_received: req.user.email } },
					{ $group: { _id: "$to", count: {$sum: 1} } } 
				],
				function (err, result) {
					res.data.closed_window_groups = result;
					next();
				}
			);
		});			    	
	}
	);
};


var opened_window_messages = function (req, res, next) {
	var opened_emails = req.body.opened_emails || [];
	var opened_groups = req.body.opened_groups || [];

	var messages = db.collection('messages');
	var group_messages = db.collection('group_messages');
	var groups = db.collection('groups');

	messages.find({to: req.user.email, from: {$in: opened_emails}}, {sort: [['from', 1],['time', 1]]}).toArray(function(err, docs){
		if ( docs ) {
			for (var i = 0; i < docs.length; i++) {
				docs[i].time = format_time(docs[i].time);
			}
			res.data.opened_window_users = docs;
		}

		groups.find({members: req.user.email}).toArray(function (err, docs) {
			var groups = [];
			for (var i = 0; i < docs.length; i++) {
				if( opened_groups.indexOf(docs[i].name) >= 0 ) groups.push(docs[i].name);
			}
			group_messages.find({ $and: [ {to: {$in: groups}}, { not_received: req.user.email } ] }, {sort: [['time', 1]], fields:{not_received: 0} }).toArray(function(err, docs){
				for (var i = 0; i < docs.length; i++) {
					docs[i].time = format_time(docs[i].time);
				}
				res.data.opened_window_groups = docs;
				next();
			});

		});
	});
};

exports.start = function(req, res) {
	var email = req.query.email;

	start_messages(req, res, function() {
		var users = db.collection('users');
		users.findOne({ email: email }, function(err, result) {
			if ( err ) {
				res.send(500);
			} else if (result) {
				res.render('talk_start', {id: shortId.generate(), me: req.user, friend: result, messages: req.messages});

				// detele the messages
				var to_delete =[];
				for (var i = 0; i < req.messages.length; i++) {
					to_delete.push(req.messages[i]._id);
				}
				db.collection('messages').remove({_id: {$in: to_delete}}, function(){});
			} else {
				res.send(404);
			}
		});
	});
};

exports.start_group = function(req, res) {
	var name = req.query.name;

	var groups = db.collection('groups');

	groups.findOne({name: name}, function (err, doc) {
		if (err) {
			res.send(500)
		} else{
			start_group_messages(req, res, function() {
				res.render('talk_start_group', {id: shortId.generate(), me: req.user, group: doc, messages: req.messages});

				// detele the messages
				var to_delete =[];
				for (var i = 0; i < req.messages.length; i++) {
					to_delete.push(req.messages[i]._id);
				}
				db.collection('group_messages').update({_id: {$in: to_delete}}, {$pull: { not_received: req.user.email }}, {multi: true}, function(){
					db.collection('group_messages').remove({not_received: []}, function(){});
				});
			});
		}
	});	
};

var format_time = function(t) {
	var time = t.getFullYear();
	if ( t.getMonth() < 10 ) {time = time + '-0' + t.getMonth() } 
	else { time = time + '-' + t.getMonth() }
	if ( t.getDay() < 10 ) {time = time + '-0' + t.getDay() } 
	else { time = time + '-' + t.getDay() }

	if ( t.getHours() < 10 ) {time = time + ' 0' + t.getHours() } 
	else { time = time + ' ' + t.getHours() }
	if ( t.getMinutes() < 10 ) {time = time + ':0' + t.getMinutes() } 
	else { time = time + ':' + t.getMinutes() }
	if ( t.getSeconds() < 10 ) {time = time + ':0' + t.getSeconds() } 
	else { time = time + ':' + t.getSeconds() }

	return time;
};

var start_messages = function (req, res, next) {
	var email = req.query.email;

	var messages = db.collection('messages');
	messages.find({ from: email, to: req.user.email}, {sort: [['time', 1]]}).toArray(function(err, docs){
		for (var i = 0; i < docs.length; i++) {
			docs[i].time = format_time(docs[i].time);
		}
		req.messages = docs;
		next();
	});
};

var start_group_messages = function (req, res, next) {
	var name = req.query.name;

	var messages = db.collection('group_messages');
	messages.find({ $and: [ {to: name}, { not_received: req.user.email } ] }, {sort: [['time', 1]]}).toArray(function(err, docs){
		for (var i = 0; i < docs.length; i++) {
			docs[i].time = format_time(docs[i].time);
		}
		req.messages = docs;
		next();
	});
};



exports.talkto = function (req, res) {
	var email = req.params.email;
	var message = req.body.message;

	var messages = db.collection('messages');
	var message_histories = db.collection('message_histories');
	messages.save({ to: email, from: req.user.email, message: message, time: new Date() }, function(err, result) {
		if ( err ) {res.send(500);}
		else {
			res.send(200);
			message_histories.save({ to: email, from: req.user.email, message: message, time: new Date() }, function(){});
		}
	});
}

exports.talktogroup = function (req, res) {
	var name = req.params.name;
	var message = req.body.message;

	var groups = db.collection('groups');
	var messages = db.collection('group_messages');
	var message_histories = db.collection('group_message_histories');

	groups.findOne({name: name}, function (err, group) {
		if ( err ) {
			res.send(500)
		} else {
			var members = [];
			for (var i = 0; i < group.members.length; i++) {
				if ( group.members[i] != req.user.email ) members.push(group.members[i]);
			}
			messages.save({ to: name, from: req.user.email, from_name: req.user.name, not_received: members, message: message, time: new Date() }, function(err, result) {
				if ( err ) {res.send(500);}
				else {
					res.send(200);
					message_histories.save({ to: name, from: req.user.email, message: message, time: new Date() }, function(){});
				}
			});
		}	    	
	});
}
