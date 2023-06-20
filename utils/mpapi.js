const _ = require('lodash');
const {mpapi} = require('../js-rpcapi');
const config = require("../config");


mpapi.node.setProvider(config.NODE_RPC);
mpapi.node.setDebugMode(false);

module.exports = mpapi;
