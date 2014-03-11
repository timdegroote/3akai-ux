define([
    'jquery',
    'underscore',
    'text!../templates/my-uploads.html'
], function($, _, template) {
    'use strict';

    var MyUploads = function(element, options) {
        _.bindAll(this);
        this.$el = $(element);
        this.template = _.template(template);
        this.data = _.extend({}, MyUploads.DEFAULTS, options);
        this.render();
    };

    _.extend(MyUploads.prototype, {
        render: function() {
            this.$el.html(this.template(this.data));
        }
    });

    MyUploads.DEFAULTS = {
        'uploads': [
            {
                'authors': 'This is an author'
            }
        ]
    };

    return MyUploads;
});
