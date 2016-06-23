/**
 * ngTweet - Angular directives for better Twitter integration.
 *
 * @license
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Aru Sahni, http://arusahni.net
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */
(function() {
'use strict';

angular
    .module('ngtweet', [])
    .value('ngTweetLogVerbose', true)
    .value('twitterWidgetURL', 'https://platform.twitter.com/widgets.js');
})();

(function() {
'use strict';

ngTweetLogger.$inject = ["$log", "ngTweetLogVerbose"];
angular
    .module('ngtweet')
    .factory('ngTweetLogger', ngTweetLogger);

function ngTweetLogger($log, ngTweetLogVerbose) {
    var noop = function() {};

    var verboseCall = function verboseCall(call) {
        if (ngTweetLogVerbose === true) {
            return call;
        }
        return noop;
    };

    return {
        'log': verboseCall($log.log),
        'debug': verboseCall($log.debug),
        'info': verboseCall($log.info),
        'warn': $log.warn,
        'error': $log.error
    };
}
})();

(function() {
'use strict';

TwitterTimeline.$inject = ["ngTweetLogger", "TwitterWidgetFactory"];
angular
    .module('ngtweet')
    .directive('twitterTimeline', TwitterTimeline);

function TwitterTimeline(ngTweetLogger, TwitterWidgetFactory) {
    return {
        restrict: 'E',
        replace: true,
        transclude: true,
        scope: {
            twitterTimelineId: '=',
            twitterTimelineScreenName: '=?'
        },
        template: '<div class="ngtweet-wrapper" ng-transclude></div>',
        link: function(scope, element, attrs) {
            ngTweetLogger.debug('Linking', element, attrs);
            if (!angular.isString(scope.twitterTimelineId)) {
                ngTweetLogger.warn('twitterTimelineId should probably be a string due to loss of precision.');
            }

            try {
                scope.twitterTimelineOptions = JSON.parse(attrs.twitterTimelineOptions);
            } catch (e) {
                scope.$watch(function() {
                    return scope.$parent.$eval(attrs.twitterTimelineOptions);
                }, function(newValue, oldValue) {
                    scope.twitterTimelineOptions = newValue;
                });
            }

            if (angular.isUndefined(scope.twitterTimelineOptions)) {
                scope.twitterTimelineOptions = {};
            }

            if (!angular.isUndefined(scope.twitterTimelineId) || angular.isString(scope.twitterTimelineScreenName)) {
                TwitterWidgetFactory.createTimeline(scope.twitterTimelineId, scope.twitterTimelineScreenName, element[0], scope.twitterTimelineOptions).then(function success(embed) {
                    ngTweetLogger.debug('Timeline Success!!!');
                }).catch(function creationError(message) {
                    ngTweetLogger.error('Could not create timeline: ', message, element);
                });
            } else {
                console.log("printing elemen 0");
                console.log(element[0]);
                TwitterWidgetFactory.load(element[0]);
            }
        }
    };
}
})();

(function() {
'use strict';

TwitterWidget.$inject = ["ngTweetLogger", "TwitterWidgetFactory"];
angular
    .module('ngtweet')
    .directive('twitterWidget', TwitterWidget);

function TwitterWidget(ngTweetLogger, TwitterWidgetFactory) {
    return {
        restrict: 'E',
        replace: true,
        transclude: true,
        scope: {
            twitterWidgetId: '=',
            twitterWidgetOnRendered: '&',
            twitterWidgetOptions: '@'
        },
        template: '<div class="ngtweet-wrapper" ng-transclude></div>',
        link: function(scope, element, attrs) {
                function updateTwitterWidget(){
                    ngTweetLogger.debug('Linking', element, attrs);
                    var twitterWidgetOptions = scope.$eval(attrs.twitterWidgetOptions);
                    if (!angular.isUndefined(scope.twitterWidgetId)) {
                        
                        if (!angular.isString(scope.twitterWidgetId)) {
                            ngTweetLogger.warn('twitterWidgetId should probably be a string due to loss of precision.');
                        }
                        
                        TwitterWidgetFactory.createTweet(scope.twitterWidgetId, element[0], twitterWidgetOptions)
                        .then(function success(embed) {
                            ngTweetLogger.debug('Success!!!');

                            console.log("replacing ......");
                            var old_iframes    = document.querySelectorAll('iframe');
                            console.log("jumlah nya");
                            console.log(old_iframes.length);
                            if(old_iframes.length>2){
                                var old_iframe = document.querySelectorAll('iframe')[0];
                                var parent_iframe = old_iframe.parentNode;
                                parent_iframe.removeChild(old_iframe);

                                console.log("old iframe");
                                console.log(old_iframe);
                                console.log("new iframe is :");
                                console.log(embed);
                                console.log("parent iframe is ");
                                console.log(parent_iframe);
                                console.log("proses replacemen ");
                                
                                console.log("replaced ...");
                            }
                            scope.twitterWidgetOnRendered();
                        }).catch(function creationError(message) {
                            ngTweetLogger.error('Could not create widget: ', message, element);
                        });

                    } else {
                        TwitterWidgetFactory.load(element[0]);
                    }
                }

                scope.$watch('twitterWidgetId',function(oldvalue,newvalue){
                    if(newvalue){
                        updateTwitterWidget();
                    }
                });
        }
    };
}
})();

(function() {
'use strict';

TwitterWidgetFactory.$inject = ["$document", "$http", "ngTweetLogger", "twitterWidgetURL", "$q", "$window"];
angular
    .module('ngtweet')
    .factory('TwitterWidgetFactory', TwitterWidgetFactory);

function TwitterWidgetFactory($document, $http, ngTweetLogger, twitterWidgetURL, $q, $window) {
    var deferred;
    var statusRe = /.*\/status\/(\d+)/;

    function startScriptLoad() {
        $window.twttr = (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0],
            t = $window.twttr || {};
            if (d.getElementById(id)) { return; }
            js = d.createElement(s);
            js.id = id;
            js.src = twitterWidgetURL;
            fjs.parentNode.insertBefore(js, fjs);

            t._e = [];
            t.ready = function(f) {
                t._e.push(f);
            };

            return t;
        }($document[0], 'script', 'twitter-wjs'));
    }

    function loadScript() {
        if (!angular.isUndefined(deferred)) {
            return deferred.promise;
        }
        deferred = $q.defer();
        startScriptLoad();
        $window.twttr.ready(function onLoadTwitterScript(twttr) {
            ngTweetLogger.debug('Twitter script ready');
            twttr.events.bind('rendered', onTweetRendered);
            deferred.resolve(twttr);    
        });
        return deferred.promise;
    }

    function onTweetRendered(event) {
        ngTweetLogger.debug('Tweet rendered', event.target.parentElement.attributes);
    }

    function createTweet(id, element, options) {
        return loadScript().then(function success(twttr) {
            ngTweetLogger.debug('Creating Tweet', twttr, id, element, options);
            return $q.when(twttr.widgets.createTweet(id, element, options));
        }).catch(function(err){
            ngTweetLogger.debug("error ih");
            ngTweetLogger.debug(err);
        });
    }

    function createTimeline(id, screenName, element, options) {
        return loadScript().then(function success(twttr) {
            ngTweetLogger.debug('Creating Timeline', id, screenName, options, element);
            if (angular.isString(screenName) && screenName.length > 0) {
                options['screenName'] = screenName;
            }
            return $q.when(twttr.widgets.createTimeline(id, element, options));
        }).catch(function(err){
            ngTweetLogger.debug("error ih");
            ngTweetLogger.debug(err);
        });
    }

    function wrapElement(element) {
        loadScript().then(function success(twttr) {
            ngTweetLogger.debug('Wrapping', twttr, element);
            console.log("hai");
            twttr.widgets.load(element);
        },function(err2){
            console.log("dari ngtweet wrap");
            console.log(err2);
        }).catch(function errorWrapping(message) {
            ngTweetLogger.error('Could not wrap element: ', message, element);
        });
    }

    return {
        createTweet: createTweet,
        createTimeline: createTimeline,
        initialize: startScriptLoad,
        load: wrapElement
    };
}
})();

(function() {
'use strict';

TwitterWidgetInitialize.$inject = ["ngTweetLogger", "TwitterWidgetFactory"];
angular
    .module('ngtweet')
    .directive('twitterWidgetInitialize', TwitterWidgetInitialize);

function TwitterWidgetInitialize(ngTweetLogger, TwitterWidgetFactory) {
    return {
        restrict: 'A',
        replace: false,
        scope: false,
        link: function(scope, element, attrs) {
            ngTweetLogger.debug('Initializing');
            TwitterWidgetFactory.initialize();
        }
    };
}
})();
