/*global define*/

define([
        'jquery',
        'underscore',
        'backbone',
        'templates',
        'dygraphs',
        'helpers/graph-utils',
        'helpers/gauge-helper',
        'marionette'
], function($, _, Backbone, JST, Dygraph, gutils, gaugeHelper) {
    'use strict';

    var IopsDashView = Backbone.Marionette.ItemView.extend({
        className: 'custom-gutter col-sm-12 col-xs-12 col-lg-9 col-md-9',
        template: JST['app/scripts/templates/iops-dash.ejs'],
        ui: {
            'canvas': '.iopscanvas',
            'headline': '.headline',
            'legend': '.legend'
        },
        initialize: function() {
            this.Dygraph = Dygraph;
            this.App = Backbone.Marionette.getOption(this, 'App');

            gaugeHelper(this);
            this.graphiteHost = Backbone.Marionette.getOption(this, 'graphiteHost');
            this.baseUrl = gutils.makeBaseUrl(this.graphiteHost);
            var metrics = ['num_read', 'num_write'];
            var targets = gutils.makePoolIOPSTargets(metrics);
            var targetParam = gutils.makeTargets(gutils.sumSeries(targets));
            var fns = [
                gutils.makeParam('format', 'json-array'),
                gutils.makeParam('from', '-1d'),
                targetParam
            ];
            this.getUrl = _.partial(gutils.makeGraphURL(this.baseUrl, fns), '', 'all');
            _.bindAll(this, 'postRender', 'updateGraph');
            this.listenToOnce(this, 'render', this.postRender);
            this.listenTo(this.App.vent, 'iops:update', this.updateGraph);
        },
        data: [
            [1, 10, 120],
            [2, 20, 80],
            [3, 50, 60],
            [4, 70, 80]
        ],
        getData: function() {
            return $.ajax({
                url: this.getUrl('', 'all'),
                dataType: 'json'
            });
        },
        updateGraph: function() {
            var dygraph = this.dygraph;
            this.getData().done(function(resp) {
                var d = gutils.graphiteJsonArrayToDygraph(resp);
                dygraph.updateOptions({
                    file: d.data
                });
            });
        },
        postRender: function() {
            var request = this.getData();
            var canvas = this.ui.canvas[0];
            var headline = this.ui.headline;
            var legend = this.ui.legend[0];
            var self = this;
            request.done(function(resp) {
                var d = gutils.graphiteJsonArrayToDygraph(resp);
                self.dygraph = new Dygraph(canvas, d.data, {
                    axisLabelFontSize: 10,
                    labels: ['Date', 'IOPS'],
                    labelsKMB: true,
                    labelsDiv: legend,
                    interactionModel: {}
                });
                var iops = _.last(d.data)[1];
                if (iops === null) {
                    iops = 0;
                }
                headline.text(iops);
            });
        }
    });

    return IopsDashView;
});
