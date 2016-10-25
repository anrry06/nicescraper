var assert = require("assert");
var phantom = require('phantom');
var cheerio = require('cheerio');
var request = require('request');

var niceScraper = function(protocol, host, uris, script, options) {
    assert.notEqual(host, undefined, 'Parameter host is required');
    assert.notEqual(uris, undefined, 'Parameter uris is required');
    assert.notEqual(script, undefined, 'Parameter script is required');

    this.host = host;
    this.uris = uris;
    this.protocol = protocol;
    this.script = script;
    this._script = script;
    this.options = {
        'wait': 1000,
        'logger': console.log
    };
    for (var i in options) {
        this.options[i] = options[i];
    }

    this.stop = this.options.stop;
    this.stepDone = this.options.stepDone;

    return this;
};

niceScraper.prototype = {
    start: function start() {
        this.run(0);
    },

    run: function run(index) {
        var that = this;

        if (typeof this.uris[index] === 'undefined') {
            return this.stop(null);
        }

        setTimeout(function() {
            var url = that.protocol + '//' + that.host + that.uris[index];

            if (typeof that.script == 'string') {
                eval('that.script = function _local($, isPhantom){ ' + that.script + ' return result; }');
            }

            request(url, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    var jQuery = cheerio.load(body);
                    var result = that.script(jQuery, false);
                    if (result.length == 0) {
                        that.options.logger(body);
                    }
                    if (result.length == 0 && !url.match(/video/i)) {
                        that.runPhantom(url, index);
                    }
                    else {
                        that.stepDone(url, result, that, index);
                    }
                }
                else {
                    if(response){
                        that.options.logger('error : ' + response.statusCode + ' ' + url);
                    }
                    if(error){
                        that.options.logger(error);
                    }
                    that.runPhantom(url, index);
                    // that.stop(error);
                }
            });

        }, (index != 0 ? this.options.wait : 0));
    },

    runPhantom: function runPhantom(url, index) {
        this.options.logger('(runPhantom)');
        var that = this;

        // eval('that.script = function(){ ' + this._script + ' return result; }');

        phantom.create(function(ph) {
            ph.createPage(function(page) {
                page.set('onConsoleMessage', function (msg) {
                    that.options.logger("Phantom Console: " + msg);
                });
                page.set('userAgent', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');
                // page.settings.userAgent = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36';
                page.open(url, function(status) {
                    // Check for page load success
                    if (status !== "success") {
                        that.options.logger('(runPhantom) Unable to access ' + url);
                        that.stepDone(url, [], that, index);
                        ph.exit();
                    }
                    else {
                        that.options.logger('(phantom page opening successfull)');
                        page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js", function() {
                            var _script = that._script;
                            that.waitFor(function(_next) {
                                // Check in the page if a specific element is now visible
                                return page.evaluate(function(_script) {
                                    var result = [];
                                    var isPhantom = true;
                                    var waitFor = true;
                                    eval(_script);
                                    return result.length > 0;
                                }, _next, _script);
                            }, function() {
                                page.evaluate(function(_script) {
                                    var result = [];
                                    var isPhantom = true;
                                    eval(_script);
                                    return result;
                                }, function(result) {
                                    that.options.logger('(runPhantom) stepDone');
                                    that.stepDone(url, result, that, index);
                                    ph.exit();
                                }, _script);
                            }, function(argument) {
                                that.stepDone(url, [], that, index);
                                ph.exit();
                            });
                        });
                    }
                });
            });
        });

    },

    waitFor: function(testFx, onReady, onTimeout, timeOutMillis) {
        var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 3000, //< Default Max Timout is 3s
            start = new Date().getTime(),
            condition = false,
            run = function() {
                if ((new Date().getTime() - start < maxtimeOutMillis) && !condition) {
                    // If not time-out yet and condition not yet fulfilled
                    testFx(function(result) {
                        condition = result;
                        setTimeout(run, 250);
                    }); //< defensive code
                }
                else {
                    if (!condition) {
                        // If condition still not fulfilled (timeout but condition is 'false')
                        if ((new Date()).getTime() - start > maxtimeOutMillis) {
                            onTimeout();
                        }
                        else {
                            // console.log("'waitFor()' timeout");
                            setTimeout(run, 250);
                        }
                    }
                    else {
                        // Condition fulfilled (timeout and/or condition is 'true')
                        // console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
                        onReady(); //< Do what it's supposed to do once the condition is fulfilled
                        clearTimeout(timeout); //< Stop this interval
                    }
                }
            },
            timeout = setTimeout(run, 250); //< repeat check every 250ms
    },
};

module.exports = niceScraper;