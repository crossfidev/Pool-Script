module.exports = {
  "NODE_RPC": "http://127.0.0.1:8732/",
  "MONGO_URL": "mongodb://localhost:27017/dbname",
  "START_INDEXING_LEVEL": 200160, // Level a baker has started
  "BAKER_LIST": [
    "address"
  ],
  "PAYMENT_SCRIPT": {
    "ENABLED_AUTOPAYMENT": true, // You need to make payments manually if this option is disabled.
    "AUTOPAYMENT_LEVEL": 10, // 5 is a minimal level
    "BAKER_PRIVATE_KEYS": [
      "privatekey"
    ],
    "MIN_PAYMENT_AMOUNT": 0.1, // Minimal reward to address in PLEX
    "DEFAULT_BAKER_COMMISSION": 0.1, // 1 = 100%, 0.1 = 10%
    "BAKERS_COMMISSIONS": { // If you need to set a difference comissions from each bakers.
      "address1" : 0.15,
      "address2" : 0.1,
    },
    "ADDRESSES_COMMISSIONS": { // If you need to set a difference comissions to each addresses.
      "address3" : 0,
    },
    "MAX_COUNT_OPERATIONS_IN_ONE_BLOCK": 199 // The maximum number of operations per block (1 - 199)
  }
}