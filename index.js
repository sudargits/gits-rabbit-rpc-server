'use strict';

const async = require('async');
const amqp = require('amqplib/callback_api');
const url = require('url');
const _ = require('underscore');

// var _server = {};
var _handlers = {};
var _global_connection;
var _global_channel;

var ack = (msg) => {
    try {
        _global_channel.ack(msg);
    } catch (e) {
        console.log(e);
    }
};

var sendresponse = (msg, response, callback) => {

    if (!_global_channel) { 
        console.log('Cannot send response. Channel is not alive'); 
        callback({code: 0, message: 'Channel is not alive'}, msg); 
        return; 
    }

    let reply_to = msg.properties.replyTo;
    let corr_id = msg.properties.correlationId;
    
    _global_channel.sendToQueue(reply_to, new Buffer(response), { correlationId: corr_id });
    callback(null, msg);
};

var subscribe = (queue_name) => {
    if (!_global_channel) { console.log('Channel for RabbitRPC Server is not ready'); return; }

    console.log('RabbitRPC Server is listening..');
    _global_channel.consume(queue_name, (msg) => {

        let route = msg.fields.routingKey;
        let string_body = msg.content.toString();

        var handler = _handlers[route];
        if (!handler) { ack(msg); return; }

        handler(string_body, (err, result) => {
            if (!err && !_.isString(result)) { 
                console.log(`Result from ${route} handler is not string`); 
                ack(msg);
                return; 
            }
            sendresponse(msg, err ? err : result, (err, message) => {
                if (err) console.log(err);
                ack(message);
            });
        });
    });
};

exports.handleRoute = (route, handler) => {
    _handlers[route] = handler;
};

exports.start = (url_string, queue_name, max_connection, callback) => {
    
    const uri = url.parse(url_string);

    var connect = (cb) => {
        amqp.connect(url_string, { servername: uri.hostname }, (err, conn) => {
            cb(err, conn);
        });
    };

    var open_channel = (conn, cb) => {
        _global_connection = conn;
        conn.createChannel((err, ch) => {
            cb(err, ch);
        });
    };

    var declare_queue = (ch, cb) => {
        _global_channel = ch;
        ch.prefetch(max_connection || 5);
        ch.assertQueue(queue_name, { durable: true });
        cb(null, ch);
    };

    async.waterfall([connect, open_channel, declare_queue], (err, result) => {
        if (err) console.log(err);
        subscribe(queue_name);
        callback(err);
    });
}

// exports.server = server;