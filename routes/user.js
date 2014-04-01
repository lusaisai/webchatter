var passwordHash = require('password-hash');

exports.signup_index = function(req, res) {
	res.render('signup');
};

exports.signout = function(req, res) {
	req.session = null;
	res.clearCookie('wcs_secret');
	res.redirect('/signin');
};

exports.signup_new = function(req, res) {
	var data = req.body;

	var required = [ 'name', 'email', 'password', 'repeat-password' ];
	for (var i = 0; i < required.length; i++) {
		if (!data[required[i]]) { 
			data.error = required[i] + " is required";
			res.render('signup', {data: data});
			return;
		}
	}

	if ( data['password'] != data['repeat-password'] ) {
		data.error = "Repeated password is not correct";
		res.render('signup', {data: data});
		return;
	}

	var funs = [ check_username, check_email, signup_success ];
	var check_chain = function() {
		if ( funs.length == 0 ) {return;}
		funs.shift().apply(undefined, [req, res, check_chain]);
	};

	check_chain();
};


exports.signin_index = function(req, res) {
	res.render('signin');
};

exports.signin = function(req, res) {
	var data = req.body;

	var required = [ 'email', 'password' ];
	for (var i = 0; i < required.length; i++) {
		if (!data[required[i]]) { 
			data.error = required[i] + " is required";
			res.render('signin', {data: data});
			return;
		}
	}

	verify_user(req, res);
};

exports.check_signin = function(req, res, next) {
	var email;
	if ( req.session && req.session.email ) {
		email = req.session.email;
	} else if ( req.signedCookies.wcs_secret ) {
		email = req.signedCookies.wcs_secret;
	}
	    	
	if ( !email ) { res.render('signin'); return; }
	var users = db.collection('users');
	users.findOne( {email: email}, function(err, user) {
		if ( !user ) { res.render('signin'); return; }
		req.user = user;
		next();
	});
};

var verify_user = function (req, res) {
	var data = req.body;
	var users = db.collection('users');
	users.findOne({ email: data.email  }, function(err, user) {
		if ( user && passwordHash.verify(data.password, user.password) ) {
			req.session.email = user.email;
			if ( data.remember ) {res.cookie('wcs_secret', user.email, { signed: true, maxAge: 1000 * 3600 * 24 * 30 }); }
			res.redirect('/');
		} else {
			data.error = "Wrong username/password";
			res.render('signin', {data: data});
		}
	});

};

var signup_success = function (req, res) {
	var data = req.body;
	var users = db.collection('users');
	users.save( { name: data.name, email: data.email, password: passwordHash.generate(data.password), friends:[], notifications: {} }, function (err, result) {
		if ( !err ) {
			res.redirect('/signin');
		} else {
			res.status(500);
			res.send('Database Down!');
		}
	} );
};

var check_username = function(req, res, next) {
	var data = req.body;
	var users = db.collection('users');
	users.findOne({ name: data.name }, function(err, result) {
		if ( result ) {
			data.error = data.name + " already exists";
			res.render('signup', {data: data});
		} else {
			next();
		}
	});
};

var check_email = function(req, res, next) {
	var data = req.body;
	var users = db.collection('users');
	users.findOne({ email: data.email }, function(err, result) {
		if ( result ) {
			data.error = data.email + " already exists";
			res.render('signup', {data: data});
		} else {
			next();
		}
	});
};
