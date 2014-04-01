var shortId = require('shortid');

exports.all_user_emails = function (req, res) {
	var users = db.collection('users');
	users.find({}).toArray(function (err, docs) {
		var emails = [];
		for (var i = 0; i < docs.length; i++) {
			emails.push( docs[i].email );
		}
		res.json(emails);
	});
};

exports.manage_groups = function (req, res) {
	var groups = db.collection('groups');
	groups.find( { owner: req.user.email } ).toArray(function (err, result) {
		if ( err ) {
			res.send(500);
		} else {
			res.render('manage_groups', {id: shortId.generate(), groups: result});
		}
	});
};

exports.manage_group_list = function (req, res) {
	var groups = db.collection('groups');
	groups.find( { owner: req.user.email } ).toArray(function (err, result) {
		if ( err ) {
			res.send(500);
		} else {
			res.render('manage_group_list', {groups: result});
		}
	});
};

exports.add_member = function (req, res) {
	var group = req.body.group;
	var member = req.body.member;
	var groups = db.collection('groups');
	var users = db.collection('users');
	groups.update({name: group}, { $addToSet: { members: member } }, function (err, result) {
		if ( err ) {
			res.send(500);
		} else {
			res.send(200);
			users.update({email: member}, { $addToSet: {'notifications.group_member_adds': group} }, function(){});
		}
	});
};

exports.drop_group = function (req, res) {
	var name = req.body.name;
	var groups = db.collection('groups');
	var users = db.collection('users');
	groups.findAndRemove({ name: name }, function (err, doc) {
		if ( err || !doc ) {
			res.send(500);
		} else{
			res.send(200);
			for (var i = 0; i < doc.members.length; i++) {
				if ( doc.members[i] != req.user.email ) {
					users.update({email: doc.members[i]}, { $addToSet: {'notifications.group_drops': doc.name} }, function(){});
				}
			}
		}
	});
};

exports.remove_group_member = function (req, res) {
	var group = req.body.group;
	var member = req.body.member;
	var groups = db.collection('groups');
	var users = db.collection('users');
	groups.update( {name: group}, { $pull: { members: member } }, function (err, result) {
		if ( err ) {
			res.send(500);
		} else {
			res.send(200);
			users.update({email: member}, { $addToSet: {'notifications.group_member_removes': group} }, function(){});
		}
		    	
	} )
};

exports.new_group = function (req, res) {
	check_group_name(req, res, function () {
		var name = req.body.name;
		var groups = db.collection('groups');
		groups.save(
			{ 
				name: name,
				owner: req.user.email,
				members: [req.user.email]
			},
			function (err, result) {
				if ( err ) {
					res.send(400, 'failed to create the group, please try later');
				} else {
					res.send(200);
				}
			}
		);

	})
};

var check_group_name = function (req, res, next) {
	var name = req.body.name;
	var groups = db.collection('groups');
	groups.findOne( {name: name}, function (err,doc) {
		if ( err ) {
			res.send(500)
		} else {
			if ( doc ) {
				res.send(400, 'Group name alreay exists');
			} else {
				next();
			}
		}    	
	});
}


exports.search_index = function(req, res) {
	res.render('search_index', {id: shortId.generate()});
};


exports.search_data = function(req, res) {
	var email = req.body.email;
	var users = db.collection('users');
	users.find( {$and: [{email: new RegExp(email)}, {email: { $ne: req.user.email }}] }, {limit: 10} ).toArray(function(err, users) {
		res.render('search_data', { users: users, me: req.user});
	});
};

exports.friend_request = function(req, res) {
	var email = req.body.email;
	var users = db.collection('users');
	users.update({email: email}, { $addToSet: {'notifications.friend_requests': req.user.email} }, function (err, result) {
		if ( err ) {
			res.send(500);
		} else {
			res.send(200);
		}
	});
};

exports.friend_remove = function(req, res) {
	var email = req.body.email;
	var users = db.collection('users');
	users.update({email: req.user.email}, { $pull: {friends: email} }, function (err, result) {
		if ( err ) {
			res.send(500);
		} else {
			users.update({email: email}, { $pull: {friends: req.user.email} }, function (err, result) {});
			users.update({email: email}, { $addToSet: {'notifications.friend_deletes': req.user.email} }, function(){});
			res.send(200);
		}
	});
};

exports.notifications = function(req, res) {
	res.render('notifications', {id: shortId.generate(), me: req.user});
}

exports.notifications_clean = function (req, res) {
	var email = req.body.email;
	var type = req.body.type;
	var users = db.collection('users');
	var to_pull = {};
	to_pull['notifications.'+type] = email;


	users.update({email: req.user.email}, { $pull: to_pull }, function (err, result) {
		if (err) {
			res.send(500);
		} else{
			res.send(200);
		}
	});

}

exports.handle_friend_request = function(req, res) {
	var email = req.body.email;
	var accept_friend;
	if ( req.body.accept_friend && req.body.accept_friend == 'true' ) {
		accept_friend = true;
	} else {
		accept_friend = false;
	}

	var users = db.collection('users');
	users.update({email: req.user.email}, { $pull: {'notifications.friend_requests': email} }, function (err, result) {
		if ( err ) {
			res.send(500);
		} else {
			if ( accept_friend ) {
				users.update({email: email}, { $addToSet: {friends: req.user.email} }, function (err, result) {
					if ( err ) {
						res.send(500);
					} else {
						users.update({email: req.user.email}, { $addToSet: {friends: email} }, function (err, result) {
							if ( err ) {res.send(500); } 
							else {res.send(200); }
						});
					}
				});
				users.update({email: email}, { $addToSet: {'notifications.friend_accepts': req.user.email} }, function(){});
			} else {
				users.update({email: email}, { $addToSet: {'notifications.friend_denies': req.user.email} }, function(){});
				res.send(200);
			}			
		}
	});
}