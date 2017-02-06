var restify = require('restify');
var builder = require('botbuilder');
var server;
var connector;
var bot;

// Create bot and add dialogs
/*bot.add('/', function (session) {
    session.send('Hello World');
});
*/
// Setup Restify Server
// 

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

const LuisModelUrl = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/b821888b-5a4c-42b7-8f01-80f3f888dc61?subscription-key=2ce69e2f40a1471eb70dea8344bf8b0b';
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });

bot.dialog('/', [
    function (session, args, next) {
        if (!session.userData.name) {
            session.beginDialog('/profile');
        } else {
            next();
        }
    },
    function (session, results) {
        session.send('Hello %s!', session.userData.name);
        session.send('Try asking me queries such as "Give me Coupons"');
        session.userData.request = Object.create({});
        session.beginDialog('/getCoupon');
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

bot.dialog('/getCoupon', intents.matches('GetCoupons', [
	function (session, args, next) {
		session.send("Welcome! We are analyzing your query");
		session.userData.request = Object.create({});
		session.userData.request.merchantEntity = builder.EntityRecognizer.findEntity(args.entities, 'merchant') ? builder.EntityRecognizer.findEntity(args.entities, 'merchant').entity : null;
		session.userData.request.amountEntity = builder.EntityRecognizer.findEntity(args.entities, 'amount') ? builder.EntityRecognizer.findEntity(args.entities, 'amount').entity : null;	
		session.userData.request.typeEntity = builder.EntityRecognizer.findEntity(args.entities, 'Demand::productType') ? builder.EntityRecognizer.findEntity(args.entities, 'Demand::productType').entity : null;

		if(!session.userData.request.merchantEntity) {
			builder.Prompts.choice(session, "Which merchant you want to buy food from?", ['Dominos', 'MacDonalds']);
		}
		else if(!session.userData.request.amountEntity) {
			builder.Prompts.number(session, "How much amount you want to spend?");
		}
		else {
			session.endDialog();
			session.beginDialog('/getType');				
		}
	},
	function (session, results) {
		if(results.response) {
			if(session.userData.request.merchantEntity) {
				session.userData.request.amountEntity = results.response;
				session.endDialog();
				session.beginDialog('/getType');
			}
			else {
				session.userData.request.merchantEntity = results.response.entity; 
				builder.Prompts.number(session, "How much money you want to spend?");
			}
		}
		else {
			session.send("Please enter query in the form 'Give me coupons for Dominos under Rs 500.'");
			session.endDialog();
		}
	},
	function (session, results) {
		if(results.response) {
			session.userData.request.amountEntity = results.response;
			session.endDialog();
			session.beginDialog('/getType');
		}
		else {
			session.send("Please enter query in the form 'Give me coupons for Dominos under Rs 500.'");
			session.endDialog();
		}
	}
]).onDefault(function(session, args) {
	session.send("Please enter query in the form 'Give me coupons for Dominos under Rs 500.'");
	session.endDialog();
}));

bot.dialog('/getType', [
	function(session, args, next) {
		if(!session.userData.request.typeEntity) {
			builder.Prompts.choice(session, "Would you prefer?", ["Veg", "Non Veg", "Any"])
		}
		else {
			session.send('%s, %d, %s',session.userData.request.merchantEntity, session.userData.request.amountEntity, session.userData.request.typeEntity);
		}
	},
	function(session, results) {
		if(results.response) {
			session.userData.request.typeEntity = results.response.entity;
			console.log(session.userData.request.merchantEntity, session.userData.request.amountEntity, session.userData.request.typeEntity);
			session.send('%s, %d, %s',session.userData.request.merchantEntity, session.userData.request.amountEntity, session.userData.request.typeEntity);
		}
		else {
			session.endDialog();
		}
	}
]);
	// .matches(/^Give me coupons.*(Dominos|MacDonald|MacDonalds|McD|Domi).*(Rs|Rupees)\s*(\d{1,})/gi, function(session, args, next) {
	// 	session.userData.request = {
	// 		merchant : args.matched[1],
	// 		minimum_price : args.matched[3]
	// 	}
	// 	session.send("You requested for %s coupon valid on orders of Rs.%d", session.userData.request.merchant, session.userData.request.minimum_price);
	// 	session.endDialog();
	// })
	// .matches(/^Give me coupons.*(Dominoes|MacDonald|McD|Domi).*/gi, [
	// 	function(session, args, next) {
	// 		session.userData.request = Object.create({});
	// 		session.userData.request.merchant = args.matched[1];
	// 		builder.Prompts.number(session, "Amount of money you want to spend?");
	// 	},
	// 	function (session, results) {
	// 		if(results.response) {
	// 			session.userData.request.minimum_price = results.response;
	// 			session.send("You requested for %s coupon valid on orders of Rs.%d", session.userData.request.merchant, session.userData.request.minimum_price);
	// 		}
	// 		session.endDialog();
	// 	}
	// ])
	// .matches(/^Give me coupons.*(Rs|Rupees)\s*(\d{1,})/gi, [
	// 	function(session, args, next) {
	// 		session.userData.request.minimum_price = args.matched[2];
	// 		builder.Prompts.choice(session, "Which merchant you want to buy food from?", ['Dominos', 'MacDonalds']);
	// 	},
	// 	function(session, results) {
	// 		if(results.response) {
	// 			session.userData.request.merchant = results.response.entity;
	// 			session.send("You requested for %s coupon valid on orders of Rs.%d", session.userData.request.merchant, session.userData.request.minimum_price);
	// 		}
	// 		session.endDialog();
	// 	}
	// ])
	// .onDefault(function (session) {
	// 	session.send("Try Again");
	// 	session.endDialog();
	// }));
