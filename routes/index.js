exports.index = function(req, res){
	var users = db.collection('users');
	users.find({email: { $in: req.user.friends }}).toArray(function (err, result) {
		if ( err ) {
			res.send(500);
		} else {
			res.render('index', {me: req.user, friends: result});
		}
	});
	
};

exports.friend_list = function (req, res) {
	var users = db.collection('users');
	users.find({email: { $in: req.user.friends }}).toArray(function (err, result) {
		if ( err ) {
			res.send(500);
		} else {
			res.render('friend_list', {friends: result});
		}
	});
}