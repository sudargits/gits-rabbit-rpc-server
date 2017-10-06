'use strict';

const async = require('async');
const amqp = require('amqplib/callback_api');
const url = require('url');
const _ = require('underscore');

// var _server = {};
var _handlers = {};
var _global_connection;
var _global_channel;
var _global_queue_name;
var _exchange_name;

var ack = (msg) => {
    try {
        _global_channel.ack(msg);
    } catch (e) {
        console.log(e);
    }
};

/**
 * Purge queue with callback
 * @param queue_name => queue name
 * @param callback => function(err,ok) {...}
 */
var purge = (queue_name,callback) => {
    if (!_global_channel) { console.log('Channel for RabbitRPC Server is not ready'); return; }
    _global_channel.purgeQueue(queue_name,callback);
}

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
    
    _global_queue_name = queue_name;    
    console.log('RabbitRPC Server is listening..');
    _global_channel.consume(queue_name, (msg) => {

        let route = msg.fields.routingKey;
        let string_body = msg.content.toString();

        var handler = _handlers[route];
        if (!handler) { console.log(`undhandled message at route ${route} with body:\n${string_body}`); ack(msg); return; }

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


/**
 * Purge with callback
 * @param queue_name
 * @param callback => function(err,ok) {...}
 */
exports.purge = (queue_name,callback) => {
    if (!queue_name) { console.log(`Please input queue_name for purge`); return;}
    _global_channel.purgeQueue(queue_name,callback);
};

exports.handleRoute = (route, handler) => {
    _handlers[route] = handler;
};

exports.declareExchange = ({name = '', type = 'topic', durable = 'true'}) => {
    _exchange_name = name;
    _global_channel.assertExchange(name, type, { durable: durable });
};

exports.bindExchangeToQueue = ({queue_name = _global_queue_name, routingKey = undefined}) => {
    if (!_exchange_name) { console.log(`Please declare exchange first`); return; }
    if (!routingKey) { console.log(`Routing key cannto be empty`); return; }
    console.log(`Binding queue ${queue_name} to exchange ${_exchange_name} with patter ${routingKey}`);
    _global_channel.bindQueue(queue_name, _exchange_name, routingKey);
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

exports.startWithPurge = (url_string, queue_name, max_connection, callback) => {
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
        _global_channel.purgeQueue(queue_name,(err,ok) => {
            subscribe(queue_name);
        });
        callback(err);
    });
}

// exports.server = server;