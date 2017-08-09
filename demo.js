'use strict';

var rabbit_server = require('./index');


// rabbit_server.handleRoute('user.api.all', (param, callback) => {
//     setTimeout(() => {
//         console.log('Sending response');
//         var users = [{id: 0, email: 'kumangxxx@gmail.com', 'password': 'qwerty'}];
//         callback(null, JSON.stringify(users));
//     }, 2000);
// });

rabbit_server.start('amqps://admin:VHLNRBHTEOUASKOY@portal-ssl1078-1.bmix-dal-yp-151044e0-030b-4406-8efc-84656da093b9.nancys-us-ibm-com.composedb.com:19324/bmix-dal-yp-151044e0-030b-4406-8efc-84656da093b9', 'user_service', 10, (err) => {

    console.log('[-] Ready');
    rabbit_server.declareExchange({name: 'rpc_service', type: 'topic', durable: true});
    rabbit_server.bindExchangeToQueue({routingKey: 'rpc.api.test'});

});