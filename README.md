# Nexmo Voice Sample

#### Overview

The sample implements simple IVR offering options listed to audio file, hear the current time
or connect to an agent.  

#### Install dependencies
```
npm install
```

#### Prepare config file
Copy provided template and fill in:
```
cp env-template .env
```

#### Webhook setup.

Start ngrok:
```
ngrok http 3000 
```

Use provided js to query ngrok public url and setup the nexmo app webhooks
```
node set-app-webhook.js
```

#### Start

```
node index.js
```

#### Try

Call a LVN that is linked to the configured voice app and follow the voice prompts.
