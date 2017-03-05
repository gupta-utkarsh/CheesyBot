var Promise = require('bluebird');
var request = require('request');
var coupons = require('./data');

const APIURL = "https://westus.api.cognitive.microsoft.com/recommendations/v4.0/models/2cc01902-44a8-41e8-8c8a-9834dda07a09/recommend/user?userId='1'&numberOfResults=3&includeMetadata=true&buildId=1614244&ItemsIds=11";

module.exports = {
  getRecommendations: function (payload) {
    return new Promise(function (resolve) {
      request.get({
        headers: {
          "Ocp-Apim-Subscription-Key": "96b0ac9ddc704529b2773bc4f26524e1",
        },
        url: APIURL
      }, function(error, res, body) {
        var resultCoupons = [];
        var response = JSON.parse(body);
        for(i = 0; i < response.recommendedItems.length; i++) {
          for(i2 = 0; i2 < coupons.length; i2++) {
            if(coupons[i2].code == response.recommendedItems[i].items[0].name) {
              var coupon = coupons[i2];
              let image = coupon.merchant == "dominos" ? "https://pbs.twimg.com/profile_images/625124035588812800/vDlAJJ8N_reasonably_small.jpg" : "http://iconshow.me/media/images/logo/brand-logo-icon/png/128/mcdonalds-128.png";
              let free;
              if(coupon.free & Array.isArray(coupon.free)) {
                  free = coupon.free.join(' or ');
              } else if(coupon.free) {
                  free = coupon.free;
              } else {
                  free = null;
              }
              let validOn = null;
              let discount = null;
              if(coupon.valid_bool != null) {
                  let validProducts;
                  if(coupon.valid_productType & Array.isArray(coupon.valid_productType)) {
                      validProducts = coupon.valid_productType.join(' or ');
                  } else if(coupon.valid_productType) {
                      validProducts = coupon.valid_productType;
                  } else {
                      validProducts = null;
                  }
                  validOn = coupon.valid_bool == true ? ("Valid on " + validProducts) : ("Not valid on " + validProducts);
              }
              if(!free) {
                  if(coupon.discount_rupees)
                      discount = "You will get a discount of Rs. " + coupon.discount_rupees;
                  else if(coupon.discount_percent)
                      discount = "You just got a " + coupon.discount_percent + "% discount";
              }
              resultCoupons.push({
                  code: coupon.code,
                  free: free,
                  validOn: validOn,
                  discount: discount,
                  image: image
              });
              break;
            }
          }
        }
        resolve(resultCoupons);
      });
    });
  }
}
