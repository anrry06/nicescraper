var niceScraper = require('./index.js');

var script = function($){
    var result = { 
        'pageTitle': $('head title').html()
    };

    return result;
};

var scraper = new niceScraper('http:', 'www.google.com', ['/'], script, {
    stepDone: function(url, result, that, index){
        console.log('STEP DONE RESULT');
        console.log(result);
    },
    stop: function(error){
        console.log('STOP');
        console.log(error);
    }
});

scraper.start();