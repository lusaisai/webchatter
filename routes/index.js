exports.index = function(req, res){
	friend_list(req, res, function() {
		group_list(req, res, function () {
			res.render('index', {me: req.user, friends: req.friends, groups: req.groups});
		})
	});
};

exports.friend_list = function (req, res) {
	friend_list(req, res);
};

exports.group_list = function (req, res) {
	group_list(req, res);
};


var friend_list = function (req, res, next) {
	var users = db.collection('users');
	users.find({email: { $in: req.user.friends }}).toArray(function (err, docs) {
		if ( err ) {
			res.send(500);
		} else {
			if(next){
				req.friends = docs;
				next();
			} else {
				res.render('friend_list', {friends: docs});
			}
		}
	});
};


var group_list = function (req, res, next) {
	var groups = db.collection('groups');
	groups.find({members: req.user.email}).toArray(function (err, docs) {
		if ( err ) {
			res.send(500);
		} else {
			if (next) {
				req.groups = docs;
				next();
			} else{
				res.render('group_list', {groups: docs});
			}
		}
	});
};
