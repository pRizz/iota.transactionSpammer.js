#!/usr/bin/env node

const spammer = require('./transactionSpammer')

spammer.options({
  message: 'This spam was generated in headless mode by the transaction spammer: https://www.npmjs.com/package/iota.transactionspammer'
})

spammer.eventEmitter.on('state', (state) => {
  console.log(`${new Date().toISOString()}: new state: ${state}`)
})

spammer.eventEmitter.on('transactionCompleted', (success) => {
  success.forEach(element => {
    console.log(`${new Date().toISOString()}: new transaction created with hash: ${element.hash}`)
  })
})

spammer.startSpamming()