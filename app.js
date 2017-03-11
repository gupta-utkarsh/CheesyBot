require('dotenv-extended').load();
var restify = require('restify');
var builder = require('botbuilder');
var Store = require('./store');
var Recommend = require('./recommendations');
var menu = require('./menu');
var server;
var connector;
var bot;
var recognizer;
var intents;
var coupons = require('./data');
const LuisModelUrl = process.env.LUIS_MODEL_URL + '&q=';

// Setup Restify Server
server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
connector = new builder.ChatConnector({
  appId: process.env.APP_ID,
  appPassword: process.env.APP_PASSWORD
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
	])
  .matches('Recommend', [
    function (session, args, next) {
      session.send("Recommending some coupons based on your previous orders");
      Recommend.getRecommendations(null).then(function(response){
        message = new builder.Message()
          .attachmentLayout(builder.AttachmentLayout.carousel)
          .attachments(response.map(couponAsAttachment));
        session.send(message);
        session.endDialog();
      });
    }
  ])
  .matches('ShowMenu', [
    function (session, args, next) {
      console.log("I will show you menu");
    }
  ])
  .matches(/^.*help.*/gi, function(session) {
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
      session.userData.request.merchantEntity = "dominos";
    }
    else if(merchant.includes('don') || merchant.includes('Don') || merchant.includes('DON')) {
      merchant = 'mcdonalds';
      session.userData.request.merchantEntity = 'mcdonalds';
    }
    builder.Prompts.choice(session, "What would you like?", menu.getItems(merchant));
  },
  function(session, results) {
    var amount;
    var merchant = session.userData.request.merchantEntity;
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
			builder.Prompts.choice(session, "Would you prefer?", ["Veg", "Non Veg", "Any"]);
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
    console.log(session.userData.request.typeEntity);
    session.send("Your current order");
    session.userData.request.discountEntity = 0;
    session.userData.request.freeEntity = [];
    var card = createReceiptCard(session);
    var msg = new builder.Message(session).addAttachment(card);
    session.send(msg);
    Store.getCoupons(payload)
    .then((coupons) => {
      session.send('I found %d coupons:', coupons.length);
      message = new builder.Message()
      .attachmentLayout(builder.AttachmentLayout.carousel)
      .attachments(coupons.map(couponAsAttachment));
      session.send(message);
      let resultantCouponCodes = coupons.map(getCouponCodes);
      resultantCouponCodes.push("No");
      builder.Prompts.choice(session, "Do you wish to add any coupon?", resultantCouponCodes);
    });
  },
  function(session, results) {
    if(results.response && results.response.entity != "No") {
      session.userData.request.appliedCoupon = getCoupon(results.response.entity);
      let appliedCoupon = session.userData.request.appliedCoupon;
      if(appliedCoupon.discount_rupees) {
        session.userData.request.discountEntity = parseInt(appliedCoupon.discount_rupees);
      }
      else if(appliedCoupon.discount_percent) {
        session.userData.request.discountEntity = ( parseInt(session.userData.request.amountEntity) * (parseInt(appliedCoupon.discount_percent) / 100) );
      }
      else if (appliedCoupon.free) {
        if (!Array.isArray(appliedCoupon.free)) {
          appliedCoupon.free = [appliedCoupon.free];
        }
        session.userData.request.freeEntity = appliedCoupon.free;
      }
      session.send("Updated order information based on your coupon selection");
      var card = createReceiptCard(session);
      var msg = new builder.Message(session).addAttachment(card);
      session.send(msg);
    }
    session.send("Thank you. Hope you enjoyed our service");
    session.endDialog();
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

function getCoupon(couponCode) {
  for(i2 = 0; i2 < coupons.length; i2++) {
    if(coupons[i2].code == couponCode) {
      return coupons[i2];
    }
  }
}

function getCouponCodes(coupon) {
  return coupon.code;
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

function createReceiptCard(session) {
  var order = 1234;
  return new builder.ReceiptCard(session)
    .title('Order Information')
    .facts([
        builder.Fact.create(session, order++, 'Order Number'),
    ])
    .items(generateItemsforOrder(session))
    .total('Rs. ' + (parseInt(session.userData.request.amountEntity) - parseInt(session.userData.request.discountEntity)));
}

function generateItemsforOrder(session) {
  let items = [];
  for(let i = 0; i < session.userData.request.typeEntity.length; i++) {
    items.push(builder.ReceiptItem.create(session, 'Rs. ' + menu.getMoney(session.userData.request.merchantEntity, session.userData.request.typeEntity[i]), session.userData.request.typeEntity[i]));
  }
  for(let i = 0; i < session.userData.request.freeEntity.length; i++) {
    items.push(builder.ReceiptItem.create(session, 'FREE', session.userData.request.freeEntity[i]));
  }
  items.push(builder.ReceiptItem.create(session, '- Rs. ' + session.userData.request.discountEntity, "Discount"));
  return items;
}
