'use strict';

var rabbit_server = require('./index');


// rabbit_server.handleRoute('user.api.all', (param, callback) => {
//     setTimeout(() => {
//         console.log('Sending response');
//         var users = [{id: 0, email: 'kumangxxx@gmail.com', 'password': 'qwerty'}];
//         callback(null, JSON.stringify(users));
//     }, 2000);
// });

rabbit_server.startWithPurge('amqps://admin:VHLNRBHTEOUASKOY@portal-ssl1078-1.bmix-dal-yp-151044e0-030b-4406-8efc-84656da093b9.nancys-us-ibm-com.composedb.com:19324/bmix-dal-yp-151044e0-030b-4406-8efc-84656da093b9',
    'rpc_service',
    10, (err) => {

    console.log("===================================");
    console.log('[-] Ready');
    rabbit_server.purge("rpc_service",(err,ok) => {
        console.log('[-] Ready',ok);
        console.log('[-] Ready',err);

        if (!err) {
            console.log("===================================");
            console.log('[-] Ready',ok);
            console.log("===================================");
            rabbit_server.declareExchange({name: 'rpc_service', type: 'topic', durable: true});
            rabbit_server.bindExchangeToQueue({routingKey: 'rpc.api.test'});
        }else{
            console.log("===================================");
            console.log('[-] Ready',err);
            console.log("===================================");
        }
    });
});