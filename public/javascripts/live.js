$(function() {
	var get_opened_window_emails = function () {
		var emails = [];
		$('.talk-to').each(function () {
			emails.push($(this).attr('email'));
		});
		return emails;
	};

	var play_sound = function () {
		if ( $('#set-note-sound').attr('data-play') != 'true' ) {
			return;
		} else {
			document.getElementById('note-sound').play();
		}
	};

	var refresh_notifications = function (count) {
		if ( count > 0 ) {
			var Badge = $('#notifications .badge');
			if ( Badge.length > 0 ) {
				var pre_count = parseInt(Badge.text());
				if(count > pre_count) play_sound();
				Badge.text(count);
			} else {
				$('#notifications').append( '<span class="badge">' + count + '</span>' );
				play_sound();
			}
			
		} else {
			$('#notifications .badge').remove();
		}
		    	
	};

	var refresh_online_status = function (data) {
		$('#user-panel .friend').each(function () {
			var email = $(this).attr('email');
			if ( data.indexOf(email) >= 0 ) {
				$(this).removeClass('btn-default').addClass('btn-primary');
			} else {
				$(this).removeClass('btn-primary').addClass('btn-default');
			}
		});
	};

	var handle_opened_window_users = function (data, next) {
		var id_to_delete = [];
		for (var i = 0; i < data.length; i++) {
			message = data[i];
			Span = $("#desktop span[email='" + message.from +"']");
			if ( Span.length > 0 ) {
				var Window = Span.closest('.window');
				var friend_name = Span.attr('name');
				var Messages = Window.find('.messages');
				
				if ( Window.hasClass('window-back') ) {
					Window.addClass('window-note');
				}
				    	
				Messages.append('<h6>' + message.time + ' ' + friend_name + " says:" + '</h6>');
				Messages.append('<p class="your-text ' + friend_name + '-text">' + message.message + "</p>");
				Messages.animate({ scrollTop: Messages.prop("scrollHeight") - Messages.height() }, 'fast');
				id_to_delete.push(message._id);
				play_sound();
			}
		}
		if ( id_to_delete.length > 0 ) {
			$.ajax({
				type: "DELETE",
				url: "/talk/live",
				data: {id_to_delete: id_to_delete}
			})
			.done(function() {
				next();
			});
		} else {
			next();
		}
	};

	var handle_closed_window_users = function (data) {
		for (var i = 0; i < data.length; i++) {
			message = data[i];
			Button = $("#user-panel button[email='" + message._id +"']");
			if ( Button.length == 0 ) {
				continue;
			}
			Badge = Button.find('.badge');
			if (  Badge.length > 0 ) {
				var pre_count = parseInt(Badge.text());
				if(message.count > pre_count) play_sound();
			} else {
				play_sound();
			}
			Badge.remove();
			Button.append( '<span class="badge">'+message.count+'</span>' );
		}
	};

	var data_update = function () {
		var data = {
			opened_emails: get_opened_window_emails()
		};

		$.ajax({
			type: "POST",
			url: "/talk/live",
			data: data
		})
		.done(function(data) {
			refresh_notifications(data.notifications);
			handle_closed_window_users(data.closed_window_users);
			refresh_online_status(data.online_status);
			handle_opened_window_users(data.opened_window_users, function () {
				setTimeout(data_update, 1000);
			});
		})
		.fail(function() {
			setTimeout(data_update, 1000);
		})
		;
	};

	data_update();

});