var Promise = require('bluebird');
var fs = require('fs');

var coupons;
fs.readFile('./data.json', function read(err, data) {    
    if(err)
        throw err;
    coupons = JSON.parse(data);
});

module.exports = {
    getCoupons: function (payload) {
        return new Promise(function (resolve) {
            var resultCoupons = [];
            coupons.forEach(function(coupon, coupon_index, coupons) {
                let flag = false;
                if(coupon.merchant == payload.merchant) {
                    console.log(coupon);
                    if(parseInt(coupon.minimum_money) <= parseInt(payload.amount)) {
                        flag = true;
                    } 
                } 
                if(flag == true) {
                    let image = coupon.merchant == "dominos" ? "https://static.festisite.com/static/partylogo/img/logos/dominos_pizza.png" : "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/McDonald's_Golden_Arches.svg/2000px-McDonald's_Golden_Arches.svg.png";
                    let free;
                    if(coupon.free & Array.isArray(coupon.free)) {
                        free = coupon.free.join(', ');
                    } else if(coupon.free) {
                        free = coupon.free; 
                    } else {
                        free = null;
                    }
                    let validOn = null;
                    let discount = null;
                    if(coupon.valid_bool!= null) {
                        let validProducts;
                        if(coupon.valid_productType & Array.isArray(coupon.valid_productType)) {
                            validProducts = coupon.valid_productType.join(', ');
                        } else if(coupon.valid_productType) {
                            validProducts = coupon.valid_productType; 
                        } else {
                            validProducts = null;
                        }   
                        validOn = coupon.valid_bool == true ? "valid on " + validProducts : "Not valid on " + validProducts; 
                    }
                    if(!free) {
                        if(coupon.discount_rupees) 
                            discount = "You will Rs. " + coupon.discount_rupees;
                        else if(coupon.discount_percent)
                            discount = "You just got a " + coupon.discount_percent + "% discount";
                    }
                    resultCoupons.push({
                        code: coupon.code,
                        free: free,
                        validOn: validOn,
                        discount: discount
                    });
                }
            });
            setTimeout(() => resolve(resultCoupons), 1000);
        });                     
    }
};