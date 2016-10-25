#nicescrapper

Basic Web scraper for NodeJS (request, phantomjs & cheerio).

[![NPM](https://nodei.co/npm/nicescraper.png)](https://nodei.co/npm/nicescraper/)

##Example

```javascript
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
```

##Dependencies

- [phantomjs](https://github.com/ariya/phantomjs) - Scriptable Headless WebKit
- [request](https://github.com/request/request) - Simplified HTTP request client
- [cheerio](https://github.com/cheeriojs/cheerio) - Fast, flexible, and lean implementation of core jQuery designed specifically for the server
