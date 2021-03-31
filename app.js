/*
 * Starter Project for Messenger Platform Quick Start Tutorial
 *
 * Remix this as the starting point for following the Messenger Platform
 * quick start tutorial.
 *
 * https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/
 *
 */

'use strict';

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
// Imports dependencies and set up http server
const 
  request = require('request'),
  express = require('express'),
  body_parser = require('body-parser'),
  app = express().use(body_parser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Accepts POST requests at /webhook endpoint
app.post('/webhook', (req, res) => {  

  // Parse the request body from the POST
  let body = req.body;
  console.log(body.object);
  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Get the webhook event. entry.messaging is an array, but 
      // will only ever contain one event, so we get index 0
      if(  entry.messaging )
        {
          let webhook_event = entry.messaging[0];

          // Get the sender PSID
          let senderPsid = webhook_event.sender.id;
          console.log('Sender PSID: ' + senderPsid);

          // Check if the event is a message or postback and
          // pass the event to the appropriate handler function
          if (webhook_event.message) {
            handleMessage(senderPsid, webhook_event.message);
          }
          else if( webhook_event.game_play )
          {
              receivedGameplay(webhook_event);
          }
          else if (webhook_event.postback) {
            console.log("enter post back");
            handlePostback(senderPsid, webhook_event.postback);
          }
        }
    });

    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {
  
  /** UPDATE YOUR VERIFY TOKEN **/
  const VERIFY_TOKEN = PAGE_ACCESS_TOKEN;//"<YOUR_VERIFY_TOKEN>";
  
  // Parse params from the webhook verification request
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Check if a token and mode were sent
  if (mode && token) {
  
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Respond with 200 OK and challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});

// Handles messages events
function handleMessage(senderPsid, receivedMessage) {
  let response;

  // Checks if the message contains text
  if (receivedMessage.text) {
    // Create the payload for a basic text message, which
    // will be added to the body of your request to the Send API
    response = {
      'text': `You sent the message: '${receivedMessage.text}'. Now send me an attachment!`
    };
  } else if (receivedMessage.attachments) {

    // Get the URL of the message attachment
    let attachmentUrl = receivedMessage.attachments[0].payload.url;
    response = {
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'generic',
          'elements': [{
            'title': 'Is this the right picture?',
            'subtitle': 'Tap a button to answer.',
            'image_url': attachmentUrl,
            'buttons': [
              {
                'type': 'postback',
                'title': 'Yes!',
                'payload': '{"text":"yes"}',
              },
              {
                'type': 'postback',
                'title': 'No!',
                'payload': '{"text":"no"}',
              }
            ],
          }]
        }
      }
    };
  }

  // Send the response message
  callSendAPI(senderPsid, response);
}

// Handles messaging_postbacks events
function handlePostback(senderPsid, receivedPostback) {
  let response;

  // Get the payload for the postback
  let payload = receivedPostback.payload;

  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { 'text': 'Thanks!' };
  } else if (payload === 'no') {
    response = { 'text': 'Oops, try sending another image.' };
  }
  // Send the message to acknowledge the postback
  callSendAPI(senderPsid, response);
}

 //
// Handle game_play (when player closes game) events here. 
//
function receivedGameplay(event) {
    // Page-scoped ID of the bot user
    var senderId = event.sender.id; 

    // FBInstant player ID
    var playerId = event.game_play.player_id; 

    // FBInstant context ID 
    var contextId = event.game_play.context_id;

    // Check for payload
    if (event.game_play.payload) {
        //
        // The variable payload here contains data set by
        // FBInstant.setSessionData()
        //
        var payload = JSON.parse(event.game_play.payload);

        // In this example, the bot is just "echoing" the message received
        // immediately. In your game, you'll want to delay the bot messages
        // to remind the user to play 1, 3, 7 days after game play, for example.
        sendMessage(senderId, null, "Message to game client: '" + payload.message + "'", "Play now!", payload);
    }
    else{
      sendMessage(senderId, null, "It's long time not to see you again:", "Play now!", payload);
    }
}

//
// Send bot message
//
// player (string) : Page-scoped ID of the message recipient
// context (string): FBInstant context ID. Opens the bot message in a specific context
// message (string): Message text
// cta (string): Button text
// payload (object): Custom data that will be sent to game session
// 
function sendMessage(player, context, message, cta, payload) {
    var button = {
        type: "game_play",
        title: cta
    };

    if (context) {
        button.context = context;
    }
    if (payload) {
        button.payload = JSON.stringify(payload)
    }
    var messageData = {
          attachment: {
              type: "template",
              payload: {
                  template_type: "generic",
                  elements: [
                    {
                        title: message,
                        buttons: [button]
                    }
                  ]
              }
          }
      };
    callSendAPI(player,messageData);
}

// Sends response messages via the Send API
function callSendAPI(senderPsid, response) {

  // Construct the message body
  let requestBody = {
    'messaging_type':'RESPONSE',
    'recipient': {
      'id': senderPsid
    },
    'message': response
  };

  // Send the HTTP request to the Messenger Platform
  request({
    'uri': 'https://graph.facebook.com/v10.0/me/messages',
    'qs': { 'access_token': PAGE_ACCESS_TOKEN },
    'method': 'POST',
    'json': requestBody
  }, (err, _res, _body) => {
    if (!err) {
      console.log('Message sent!');
    } else {
      console.error('Unable to send message:' + err);
    }
  });
}
