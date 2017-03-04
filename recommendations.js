var Promise = require('bluebird');

const APIURL = 'https://westus.api.cognitive.microsoft.com/recommendations/v4.0/models/2cc01902-44a8-41e8-8c8a-9834dda07a09/recommend/user?userId='1'&numberOfResults=1&includeMetadata=true&buildId=1614244&ItemsIds=1';

module.exports = {
  getRecommendations: function (payload) {
    return new Promise(function (resolve) {

    })
  }
}
