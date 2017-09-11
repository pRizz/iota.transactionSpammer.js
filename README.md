# iota.transactionSpammer.js
Spams the IOTA newtork with dummy messages, confirming transactions while doing so.

## Basic Usage

Add this to the header of your html file
```
<script type="text/javascript" src="deps/iota.transactionSpammer.js/src/lib/iota.min.js"></script>
<script type="text/javascript" src="deps/iota.transactionSpammer.js/src/lib/curl.min.js"></script>
<script type="text/javascript" src="deps/iota.transactionSpammer.js/src/lib/EventEmitter.min.js"></script>
<script type="text/javascript" src="deps/iota.transactionSpammer.js/src/transactionSpammer.js"></script>
<script type="text/javascript" src="deps/iota.transactionSpammer.js/src/autostartSpamming.js"></script>
```

If you want to customize the settings of the spammer, do not include the `autostartSpamming.js` file.

## Basic Customization
If you want to customize the spam message:
```
iotaTransactionSpammer.options({
    message: "MYMESSAGEASTRITS"
})
iotaTransactionSpammer.startSpamming()
```
