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
            next();
        }
    });
};
