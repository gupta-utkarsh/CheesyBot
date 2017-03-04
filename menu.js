var menu = {
	"dominos" : {
		"type" : [
			"Pizza"
		],
		"items" : [
			{
        "name": "Simply Veg",
        "amount": 300
      },
      {
        "name": "Simply Non Veg",
        "amount": 400
      }
		],
		"sizes" : [
			"Small",
			"Medium",
			"Large"
		]
	},
	"mcdonalds" : {
		"type" : [
			"Burger",
			"Small Meal",
			"Medium Meal",
			"Large Meal"
		],
		"items" : [
      {
        "name": "McChicken",
        "amount": 140
      },
      {
        "name": "McVeggie",
        "amount": 70
      },
      {
        "name": "McGrill",
        "amount": 80
      },
      {
        "name": "McEgg",
        "amount": 40
      }
		],
		"sizes" : [
		]
	}
}

function getItems(merchant) {
  var items = [];
  var len;
  len = menu[merchant].items.length;
  for(index = 0; index < len; index++) {
    items.push(menu[merchant].items[index].name);
  }
  return items;
}

function getMoney(merchant, itemName) {
  var items = [];
  var len;
  len = menu[merchant].items.length;
  for(index = 0; index < len; index++) {
    if (menu[merchant].items[index].name === itemName) {
      return menu[merchant].items[index].amount;
    }
  }
}

module.exports = {
  getItems,
  getMoney
};
