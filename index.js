require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const OUTBOUND_LVN = process.env.OUTBOUND_LVN;
const AGENT_NUMBER = process.env.AGENT_NUMBER;
const MUSIC_URL = process.env.MUSIC_URL;

// const TTS_VOICE = "Salli";
const TTS_VOICE = "Ivy";

const Nexmo = require('nexmo');

const nexmo = new Nexmo({
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
    applicationId: process.env.APPLICATION_ID,
    privateKey: process.env.PRIVATE_KEY
})

const app = express();

app.use(bodyParser.json());

app.post('/webhooks/voice/answer', (req, res) => {
    console.log(req.originalUrl, req.body);
    const callId = req.body.uuid;
    const ncco = [
        {
            action: "talk",
            text: "Welcome to Nexmo Voice API sample. " +
                "Please " +
                "press 1 for music, " +
                "press 2 for current time " +
                "or any other digit to talk to an agent.",
            voice_name: TTS_VOICE,
            bargeIn: true
        },
        {
            action: "input",
            timeOut: 10,
            maxDigits: 1
        },
        {
            action: "conversation",
            name: callId,
            endOnExit: true
        }
    ];
    res.status(200).json(ncco).end();
});

app.post('/webhooks/voice/event', (req, res) => {
    console.log(req.originalUrl, req.body);
    const event = req.body;
    if (event.dtmf) {
        handleDtmf(event);
    }
    res.status(200).end();
});


function handleDtmf(event) {
    const dtmf = event.dtmf;
    const callId = event.uuid;
    switch (dtmf) {
        case '1':
            playMusic(callId);
            break;
        case '2':
            talkCurrentTime(callId);
            break;
        default:
            connectToAgent(callId);
            break;
    }

}

function playMusic(callId) {
    // Using transfer NCCO instead API call so that the phone call is closed when done.
    nexmo.calls.update(
        callId,
        {
            action: 'transfer',
            destination: {
                type: 'ncco',
                ncco: [{
                    action: 'stream',
                    level: -0.7,
                    streamUrl: [ MUSIC_URL ]
                }]
            }
        },
        (err, res) => logCallback(err, res, "Transfer to PLAY Music")
    );
}

function talkCurrentTime(callId) {
    const now = new Date();
    const date = "" + now.getDate() + "/" + (now.getMonth() + 1) + "/" + now.getFullYear();
    const time = "" + now.getHours() + ":" + now.getMinutes();
    const text =
        '<speak><prosody rate="70%">' +
            'It is ' +
            '<say-as interpret-as="date" format="dmy">' + date + '</say-as> ' +
            ', ' +
            '<say-as interpret-as="time" format="hm24">' + time + '</say-as>' +
        '</prosody></speak>';
    // Using transfer NCCO instead API call so that the phone call is closed when done.
    nexmo.calls.update(
        callId,
        {
            action: 'transfer',
            destination: {
                type: 'ncco',
                ncco: [{
                    action: 'talk',
                    text: text,
                    voice_name: TTS_VOICE,
                    loop: 1
                }]
            }
        },
        (err, res) => logCallback(err, res, "Transfer to TTS")
    );
}

function connectToAgent(callId) {
    nexmo.calls.update(
        callId,
        {
            action: 'transfer',
            destination: {
                type: 'ncco',
                ncco: [{
                    action: 'connect',
                    timeout: 10,
                    from: OUTBOUND_LVN,
                    endpoint: [{
                        type: "phone",
                        number: AGENT_NUMBER,
                    }]
                }]
            }
        },
        (err, res) => logCallback(err, res, "Transfer to Agent")
    );
}

function logCallback(err, res, cmd) {
    if (err) {
        console.error(cmd, "failure:", err.body ? err.body : err);
    } else {
        console.log(cmd, "OK", res);
    }
}

app.listen(3000)
console.log("Ready")
