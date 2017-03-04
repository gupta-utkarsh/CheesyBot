var restify = require('restify');
var builder = require('botbuilder');
var Store = require('./store');
var menu = require('./menu');
var server;
var connector;
var bot;
var recognizer;
var intents;
const LuisModelUrl = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/b821888b-5a4c-42b7-8f01-80f3f888dc61?subscription-key=54485818c08e4d32a58791c32521deaa&verbose=false&q=';

// Setup Restify Server
server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
connector = new builder.ChatConnector({
    appId: '0cb06353-d40c-45e6-9ad5-c2b77faeb9e1',
    appPassword: '9M85qSBFFN1DnEQ0xKh9c2C'
});
bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

recognizer = new builder.LuisRecognizer(LuisModelUrl);
intents = new builder.IntentDialog({ recognizers: [recognizer] });

bot.dialog('/', [
    function (session, args, next) {
      if(!session.userData) {
        session.userData = Object.request({});
      }
      if (!session.userData.name) {
          session.beginDialog('/profile');
      } else {
      	next();
      }
    },
    function (session, results) {
        session.send('Hello %s!', session.userData.name);
        session.send('Try asking me queries such as "Give me Coupons"');
        session.beginDialog('/init');
    }
]);

bot.dialog('/profile', [
    function (session) {
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);

bot.dialog('/help', function (session) {
	session.send("You can search queries such as :");
	session.send("Give me coupons");
	session.send("'Give me coupons for dominos'");
	session.send("or 'Give me coupons for less than Rs. 500'");
	session.send("or 'Give me coupons for dominos under Rs. 500 for veg food'");
	session.endDialog();
});

bot.dialog('/init', intents
	.matches('GetCoupons', [
		function (session, args, next) {
			session.send("Welcome! We are analyzing your query");
			session.userData.request = Object.create({});
			session.userData.request.merchantEntity = builder.EntityRecognizer.findEntity(args.entities, 'merchant') ? builder.EntityRecognizer.findEntity(args.entities, 'merchant').entity : null;
			session.userData.request.amountEntity = builder.EntityRecognizer.findEntity(args.entities, 'amount') ? builder.EntityRecognizer.findEntity(args.entities, 'amount').entity : null;
			session.userData.request.typeEntity = builder.EntityRecognizer.findEntity(args.entities, 'Demand::productType') ? builder.EntityRecognizer.findEntity(args.entities, 'Demand::productType').entity : null;

      session.endDialog();
      session.beginDialog('/selectMerchant');
    }
	]).matches(/^.*help.*/gi, function(session) {
		session.endDialog();
		session.beginDialog('/help');
	})
	.matches(/^.*bye.*/gi, function(session) {
		session.send('Bye Good to see ya!');
		session.endDialog();
	}).onDefault(function(session, args) {
		session.send("Please enter query in the form 'Give me coupons for Dominos under Rs 500.'");
		session.endDialog();
  })
);

bot.dialog('/selectMerchant', [
  function(session, args, next) {
    if(!session.userData.request.merchantEntity) {
      builder.Prompts.choice(session, "Which merchant you want to buy food from?", ['Dominos', 'McDonalds']);
    }
    else {
      next();
    }
  },
  function(session, results) {
    if(results.response) {
      session.userData.request.merchantEntity = results.response.entity;
    }
    session.endDialog();
    if(!session.userData.request.amountEntity) {
      session.beginDialog('/selectOrder');
    }
    else {
      session.beginDialog('/selectType');
    }
  }
]);

bot.dialog('/selectOrder', [
  function(session, args, next) {
    var merchant = session.userData.request.merchantEntity;
    if(merchant.includes('dom') || merchant.includes('Dom') || merchant.includes('DOM')) {
      merchant = 'dominos';
    }
    else if(merchant.includes('don') || merchant.includes('Don') || merchant.includes('DON')) {
      merchant = 'mcdonalds';
    }
    builder.Prompts.choice(session, "What would you like?", menu.getItems(merchant));
  },
  function(session, results) {
    var amount;
    var merchant = session.userData.request.merchantEntity;
    if(merchant.includes('dom') || merchant.includes('Dom') || merchant.includes('DOM')) {
      merchant = 'dominos';
    }
    else if(merchant.includes('don') || merchant.includes('Don') || merchant.includes('DON')) {
      merchant = 'mcdonalds';
    }
    if (results.response) {
      if (!session.userData.request.typeEntity) {
        session.userData.request.amountEntity = 0;
        session.userData.request.typeEntity = [results.response.entity];
      }
      else {
        session.userData.request.typeEntity.push(results.response.entity);
      }
      session.userData.request.amountEntity += menu.getMoney(merchant, results.response.entity);
    }
    builder.Prompts.confirm(session, "Do you want to add more items ?");
  },
  function(session, results) {
    if(results.response) {
      session.endDialog();
      session.beginDialog('/selectOrder');
    }
    else {
      session.beginDialog('/showCoupons');
    }
  }
]);

bot.dialog('/selectType', [
	function(session, args, next) {
    var message;
		if(!session.userData.request.typeEntity) {
			builder.Prompts.choice(session, "Would you prefer?", ["Veg", "Non Veg", "Any"])
		}
    else {
      next();
    }
	},
	function(session, results) {
    var message;
		if(results.response)
			session.userData.request.typeEntity = results.response.entity;
		session.endDialog();
    session.beginDialog('/showCoupons');
	}
]);

bot.dialog('/showCoupons', [
  function(session, args, next) {
    let payload = clean(session.userData.request.merchantEntity, session.userData.request.amountEntity, session.userData.request.typeEntity);
    Store.getCoupons(payload)
    .then((coupons) => {
      session.send('I found %d coupons:', coupons.length);
      message = new builder.Message()
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(coupons.map(couponAsAttachment));
      session.send(message);
      session.endDialog();
    });
  }
]);

function clean(merchant, amount, type) {
	if(merchant.includes('dom') || merchant.includes('Dom') || merchant.includes('DOM')) {
		merchant = 'dominos';
	}
	else if(merchant.includes('don') || merchant.includes('Don') || merchant.includes('DON') || merchant.includes('McD') || merchant.includes('MCD') || merchant.includes('Mcd') || merchant.includes('mcd')) {
		merchant = 'mcdonalds';
	}
	if(typeof amount == 'number') {
		amount = amount.toString();
	}
	amount = parseInt(amount.replace(/\D/g, ''));
	if(type == 'Any') {
		type = null;
	}
  else if(!Array.isArray(type)) {
    type = [type];
  }
	return {
		merchant: merchant,
		amount: amount,
		type: type
	}
}

function couponAsAttachment(coupon) {
    let subtitle;
    if(coupon.free) {
    	subtitle = "=> Free : Get " + coupon.free + ' => ' +  coupon.validOn;
    }
    else if(coupon.discount) {
    	subtitle = "=> " + coupon.discount + ' => ' + coupon.validOn;
    }

    return new builder.HeroCard()
        .title(coupon.code)
        .subtitle(coupon.merchant)
        .text(subtitle)
        .images([new builder.CardImage().url(coupon.image)]);
}
