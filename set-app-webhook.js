require('dotenv').config();
const async = require('async');
const request = require('request');
const Nexmo = require('nexmo');

const nexmo = new Nexmo({
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
    applicationId: process.env.APPLICATION_ID,
    privateKey: process.env.PRIVATE_KEY
})

const argv = process.argv;

if (argv.length > 3) {
    console.error("Invalid number of arguments.");
    console.log("Usage:\n\t%s %s [<webhook-root-url>]", argv[0], argv[1])
    process.exit(1);
}
const rootUrlArg = argv[2];
const appId = process.env.APPLICATION_ID;

function setPostWebhook(webhook, url) {
    webhook.address = url;
    webhook.http_method = "POST";
}

async.waterfall([
    (callback) => {
        if (rootUrlArg) {
            callback(null, null, rootUrlArg);
            return;
        }
        request("http://localhost:4040/api/tunnels", callback);
    },
    (arg1, arg2, callback) => {
        if (arg1 === null) {
            const rootUrl = arg2;
            callback(null, rootUrl);
            return;
        }
        const resp = arg1;
        if (resp.statusCode !== 200) {
            callback("error response from ngrok: " + resp.statusCode);
            return;
        }
        const body = JSON.parse(arg2);
        var ngrokUrl;
        body.tunnels.forEach(tunnel => {
            // pick the https tunnel
            if (tunnel.proto === "https") {
                ngrokUrl = tunnel.public_url;
            }
        });
        if (!ngrokUrl) {
            callback("failed to obtain ngrok url");
            return;
        }
        callback(null, ngrokUrl);
    },
    (rootUrl, callback) => {
        nexmo.applications.get(appId, (err, app) => { callback(err, rootUrl, app) }, true);
    },
    (rootUrl, app, callback) => {
        if (!app || !app.capabilities) {
            callback("Unexpected get app response: " + JSON.stringify(app));
            return;
        }
        let webhookSet = false;
        if (app.capabilities.messages) {
            const webhooks = app.capabilities.messages.webhooks;
            setPostWebhook(webhooks.inbound_url, rootUrl + "/webhooks/messages/inbound");
            setPostWebhook(webhooks.status_url, rootUrl + "/webhooks/messages/status");
            webhookSet = true;
        }
        if (app.capabilities.voice) {
            const webhooks = app.capabilities.voice.webhooks;
            setPostWebhook(webhooks.event_url, rootUrl + "/webhooks/voice/event");
            setPostWebhook(webhooks.answer_url, rootUrl + "/webhooks/voice/answer");
            webhookSet = true;
        }
        if (!webhookSet) {
            callback("No supported API enabled");
            return;
        }
        nexmo.applications.update(appId, app, callback);
    }
], (err, app) => {
    if (err) {
        console.error(err);
    } else {
        for (const key in app.capabilities) {
            console.log(key, app.capabilities[key].webhooks);
        }
    }
});
