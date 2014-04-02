var mongodb = require('mongodb');

var Db = mongodb.Db;
var Server = mongodb.Server;
var ObjectID = mongodb.ObjectID;
var BSON = mongodb.pure().BSON;
var MongoClient = mongodb.MongoClient;
var ReplSetServers = mongodb.ReplSetServers;
var Binary = mongodb.Binary;
var GridStore = mongodb.GridStore;
var Grid = mongodb.Grid;
var Code = mongodb.Code;


exports.init = function (next) {
    global.mongodb = mongodb;
    var db = new Db( 'webchatter', new Server("localhost", 27017, {auto_reconnect: true}), {w:1} );
    db.open(function (err, db) {
        if (err) {
            process.exit(1);;
        } else{
            global.db = db;
            var empty = function(){};
            db.collection('users').ensureIndex({email:1}, {background:true}, empty);
            db.collection('users').ensureIndex({last_show_time:1}, {background:true}, empty);
            db.collection('users').ensureIndex({friends:1}, {background:true}, empty);
            db.collection('users').ensureIndex({name:1}, {background:true}, empty);

            db.collection('groups').ensureIndex({members:1}, {background:true}, empty);
            db.collection('groups').ensureIndex({name:1}, {background:true}, empty);
            db.collection('groups').ensureIndex({owner:1}, {background:true}, empty);

            db.collection('messages').ensureIndex({from:1}, {background:true}, empty);
            db.collection('messages').ensureIndex({to:1}, {background:true}, empty);
            db.collection('messages').ensureIndex({from:1, to:1}, {background:true}, empty);
            db.collection('messages').ensureIndex({time:1}, {background:true}, empty);

            db.collection('message_histories').ensureIndex({from:1}, {background:true}, empty);
            db.collection('message_histories').ensureIndex({to:1}, {background:true}, empty);
            db.collection('message_histories').ensureIndex({from:1, to:1}, {background:true}, empty);
            db.collection('message_histories').ensureIndex({time:1}, {background:true}, empty);
            
            db.collection('group_messages').ensureIndex({from:1}, {background:true}, empty);
            db.collection('group_messages').ensureIndex({to:1}, {background:true}, empty);
            db.collection('group_messages').ensureIndex({from:1, to:1}, {background:true}, empty);
            db.collection('group_messages').ensureIndex({time:1}, {background:true}, empty);
            db.collection('group_messages').ensureIndex({not_received:1}, {background:true}, empty);
            
            db.collection('group_message_histories').ensureIndex({from:1}, {background:true}, empty);
            db.collection('group_message_histories').ensureIndex({to:1}, {background:true}, empty);
            db.collection('group_message_histories').ensureIndex({from:1, to:1}, {background:true}, empty);
            db.collection('group_message_histories').ensureIndex({time:1}, {background:true}, empty);
            
            next(); 
        }
    });
};
