/**
 * Created by Peter Ryszkiewicz (https://github.com/pRizz) on 9/10/2017.
 * https://github.com/pRizz/iota.transactionSpammer.js
 */

window.iotaTransactionSpammer = (function(){
    const iotaLib = window.IOTA
    const curl = window.curl
    var iota // initialized in initializeIOTA
    var started = false

    // from https://iotasupport.com/providers.json
    const httpProviders = [
        "http://iota.bitfinex.com:80",
        "http://service.iotasupport.com:14265",
        "http://eugene.iota.community:14265",
        "http://eugene.iotasupport.com:14999",
        "http://eugeneoldisoft.iotasupport.com:14265",
        "http://node01.iotatoken.nl:14265",
        "http://node02.iotatoken.nl:14265",
        "http://node03.iotatoken.nl:15265",
        "http://mainnet.necropaz.com:14500",
        "http://iota.digits.blue:14265",
        "http://wallets.iotamexico.com:80",
        "http://5.9.137.199:14265",
        "http://5.9.118.112:14265",
        "http://5.9.149.169:14265",
        "http://88.198.230.98:14265",
        "http://176.9.3.149:14265",
        "http://node.lukaseder.de:14265"
    ]

    const httpsProviders = [
        //'https://node.tangle.works:443', // commented out due to network issues; asked by node operator
        //'https://n1.iota.nu:443' // commented out due to network issues; asked by node operator
    ]

    const validProviders = getValidProviders()
    var currentProvider = getRandomProvider()

    var depth = 10
    var weight = 15
    var spamSeed = generateSeed()

    const hostingSite = 'https://github.com/pRizz/iota.transactionSpammer.js'
    const hostingSiteTritified = tritifyURL(hostingSite)
    var message = hostingSiteTritified
    var tag = "SEESITEINMESSAGE"
    var numberOfTransfersInBundle = 1

    const eventEmitter = new EventEmitter()

    var transactionCount = 0
    var confirmationCount = 0
    var averageConfirmationDuration = 0 // milliseconds

    // must be https if the hosting site is served over https; SSL rules
    function getValidProviders() {
        if(isRunningOverHTTPS()) {
            return httpsProviders
        } else {
            return httpProviders.concat(httpsProviders)
        }
    }

    function isRunningOverHTTPS() {
        switch(window.location.protocol) {
            case 'https:':
                return true
            default:
                return false
        }
    }

    // returns a depth in [4, 12] inclusive
    function generateDepth() {
        depth = Math.floor(Math.random() * (12 - 4 + 1)) + 4
        return depth
    }

    function generateSeed() {
        const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ9'
        return Array.from(new Array(81), (x, i) => validChars[Math.floor(Math.random() * validChars.length)]).join('')
    }

    function generateTransfers() {
        return Array.from(new Array(numberOfTransfersInBundle), (x, i) => generateTransfer())
    }

    function generateTransfer() {
        return {
            address: spamSeed,
            value: 0,
            message: message,
            tag: tag
        }
    }

    function initializeIOTA() {
        eventEmitter.emitEvent('state', [`Initializing IOTA connection to ${currentProvider}`])
        iota = new iotaLib({'provider': currentProvider})
        curl.overrideAttachToTangle(iota.api)
    }

    // Iota api extensions
    function sendTransfer2steps(seed, depth, minWeightMagnitude, transfers, options, callback1, callback2) {
        // Copy of iota.api.sendTransfer, but with 1 extra parameter (callback2),
        // and using sendTrytes2steps instead of iota.api.sendTrytes.
        // To avoid potential errors, the parameter 'options' is mandatory,
        // unlike the original sendTransfer, where it could be omitted.
        // If no 'options' are present, simply use {} as 'options' when calling.
        // Important ! Parameter validation has been removed, make sure they are correct when calling.
        var self = this;

        // Validity check for number of arguments
        if (arguments.length != 7) {
            return callback1(new Error("Invalid number of arguments"));
        }

        // Check if correct depth and minWeightMagnitude
        // inputValidator <-> iota.valid
        if (!iota.valid.isValue(depth) && !iota.valid.isValue(minWeightMagnitude)) {

            return callback(errors.invalidInputs());
        }

        self.prepareTransfers(seed, transfers, options, function(error, trytes) {

            if (error) {
                return callback1(error)
            }

            sendTrytes2steps.call(self, trytes, depth, minWeightMagnitude, callback1, callback2);
        })
    }
    function sendTrytes2steps(trytes, depth, minWeightMagnitude, callback1, callback2) {
        // Does exactly what iota.api.sendTrytes() does, but in two steps:
        // First, it gets the transactions to approve without attaching to tangle (i.e. without doing PoW),
        //   and then calls callback1.
        // Second, it attaches to the Tangle (does PoW) and finally calls callback2.
        // This allows for other tasks (logging, resource management, etc) to be done by callback1,
        // just before starting the (computationally expensive) PoW calculation.

        var self = this;

        // Inputs already ok, because we are called by sendTransfer2steps().

        // Get branch and trunk
        self.getTransactionsToApprove(depth, function(error, toApprove) {

            if (error) {
                return callback1(error)
            }

            // HERE is the only real difference:
            callback1(null, toApprove);
            // everything afterwards is handled by callback2

            // attach to tangle - do pow
            self.attachToTangle(toApprove.trunkTransaction, toApprove.branchTransaction, minWeightMagnitude, trytes, function(error, attached) {

                if (error) {
                    return callback2(error)
                }

                // Broadcast and store tx
                self.storeAndBroadcast(attached, function(error, success) {

                    if (error) {
                        return callback2(error);
                    }

                    var finalTxs = [];

                    attached.forEach(function(trytes) {
                        finalTxs.push(iota.utils.transactionObject(trytes)); // utils <-> iota.utils
                    })

                    return callback2(null, finalTxs);

                })
            })
        })
    }
    function sendMessages() {
        const transfers = generateTransfers()
        const transferCount = transfers.length
        const localConfirmationCount = transferCount * 2
        const transactionStartDate = Date.now()
        eventEmitter.emitEvent('state', [`Requesting ${localConfirmationCount} transactions to create confirmations for`])
        sendTransfer2steps.call(iota.api, spamSeed, generateDepth(), weight, transfers, {},
            // Network related
            function(error, success) {
                if (error) {
                    eventEmitter.emitEvent('state', ['Error occurred while getting transactions'])
                    setTimeout(function(){
                        changeProviderAndSync()
                    }, 1000)
                    return
                }
                eventEmitter.emitEvent('state', [`Performing PoW (Proof of Work) on ${localConfirmationCount} transactions`])
                eventEmitter.emitEvent('working', [true])
            },
            // PoW related
            function(error, success) {
                if (error) {
                    eventEmitter.emitEvent('state', ['Error occurred while attaching transactions'])
                    setTimeout(function(){
                        changeProviderAndSync()
                    }, 1000)
                    return
                }
                const transactionEndDate = Date.now()
                const transactionDuration = transactionEndDate - transactionStartDate // milliseconds
                const oldTotalConfirmationDuration = averageConfirmationDuration * confirmationCount

                transactionCount += transferCount
                confirmationCount += localConfirmationCount
                averageConfirmationDuration = (oldTotalConfirmationDuration + transactionDuration) / confirmationCount

                eventEmitter.emitEvent('state', [`Completed PoW (Proof of Work) on ${localConfirmationCount} transactions`])
                eventEmitter.emitEvent('transactionCountChanged', [transactionCount])
                eventEmitter.emitEvent('confirmationCountChanged', [confirmationCount])
                eventEmitter.emitEvent('averageConfirmationDurationChanged', [averageConfirmationDuration])

                eventEmitter.emitEvent('transactionCompleted', [success])
                eventEmitter.emitEvent('working', [false])

                checkIfNodeIsSynced()
            }
        )
    }

    function getRandomProvider() {
        return validProviders[Math.floor(Math.random() * validProviders.length)]
    }

    function changeProviderAndSync() {
        eventEmitter.emitEvent('state', ['Randomly changing IOTA nodes'])
        currentProvider = getRandomProvider()
        eventEmitter.emitEvent('state', [`New IOTA node: ${currentProvider}`])
        restartSpamming()
    }

    function checkIfNodeIsSynced() {
        eventEmitter.emitEvent('state', ['Checking if node is synced'])

        iota.api.getNodeInfo(function(error, success){
            if(error) {
                eventEmitter.emitEvent('state', ['Error occurred while checking if node is synced'])
                setTimeout(function(){
                    changeProviderAndSync()
                }, 1000)
                return
            }

            const isNodeUnsynced =
                success.latestMilestone == spamSeed ||
                success.latestSolidSubtangleMilestone == spamSeed ||
                success.latestSolidSubtangleMilestoneIndex < success.latestMilestoneIndex

            const isNodeSynced = !isNodeUnsynced

            if(isNodeSynced) {
                eventEmitter.emitEvent('state', ['Node is synced'])
                sendMessages()
            } else {
                const secondsBeforeChecking = 10
                eventEmitter.emitEvent('state', [`Node is not synced. Trying again in ${secondsBeforeChecking} seconds.`])
                setTimeout(function(){
                    changeProviderAndSync() // Sometimes the node stays unsynced for a long time, so change provider
                }, secondsBeforeChecking * 1000)
            }
        })
    }

    // Only call if there is an error or there is no current spamming running
    function restartSpamming() {
        eventEmitter.emitEvent('state', ['Restart transaction spamming'])
        initializeIOTA()
        checkIfNodeIsSynced()
    }

    // Helper for tritifying a URL.
    // WARNING: Not a perfect tritifier for URL's - only handles a few special characters
    function tritifyURL(urlString) {
        return urlString.replace(/:/gi, 'COLON').replace(/\./gi, 'DOT').replace(/\//gi, 'SLASH').replace(/-/gi, 'DASH').toUpperCase()
    }

    return {
        // View options, or set options if params are specified
        options: function(params) {
            if(!params) {
                return {
                    provider: currentProvider,
                    depth: depth,
                    weight: weight,
                    spamSeed: spamSeed,
                    message: message,
                    tag: tag,
                    numberOfTransfersInBundle: numberOfTransfersInBundle
                }
            }
            if(params.hasOwnProperty("provider")) { currentProvider = params.provider }
            if(params.hasOwnProperty("depth")) { depth = params.depth }
            if(params.hasOwnProperty("weight")) { weight = params.weight }
            if(params.hasOwnProperty("spamSeed")) { spamSeed = params.spamSeed }
            if(params.hasOwnProperty("message")) { message = params.message }
            if(params.hasOwnProperty("tag")) { tag = params.tag }
            if(params.hasOwnProperty("numberOfTransfersInBundle")) { numberOfTransfersInBundle = params.numberOfTransfersInBundle }
        },
        startSpamming: function() {
            if(started) { return }
            started = true
            eventEmitter.emitEvent('state', ['Start transaction spamming'])
            restartSpamming()
        },
        stopSpamming: function() {
            // TODO
            console.error("stopSpamming() NOT IMPLEMENTED")
        },
        tritifyURL: tritifyURL,
        eventEmitter: eventEmitter,
        getTransactionCount: () => transactionCount,
        getConfirmationCount: () => confirmationCount,
        getAverageConfirmationDuration: () => averageConfirmationDuration
    }
})()
