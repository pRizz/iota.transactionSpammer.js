# iota.transactionSpammer.js
Spams the IOTA network with dummy messages, confirming transactions while doing so.

## Example Usage
See [https://prizz.github.io/iota-transaction-spammer-webapp/](https://prizz.github.io/iota-transaction-spammer-webapp/)

## Basic Usage

Add these files to your site and add these lines to the header of your html file
```
<script type="text/javascript" src="src/lib/iota.js"></script>
<script type="text/javascript" src="src/lib/curl.min.js"></script>
<script type="text/javascript" src="src/lib/EventEmitter.min.js"></script>
<script type="text/javascript" src="src/transactionSpammer.js"></script>
<script type="text/javascript" src="src/autostartSpamming.js"></script>
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

## Headless Usage

This can be installed with `npm` and run on the command line.

    npm intall -g iota.transactionspammer

And run with

    iota.transactionspammer