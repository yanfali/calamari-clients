/*global define*/

define(['jquery', 'underscore', 'backbone', 'templates', 'helpers/graph-utils', 'models/application-model', 'dygraphs', 'l20nCtx!locales/{{locale}}/strings', 'marionette', 'modal'], function($, _, Backbone, JST, gutils, models, Dygraph, l10n) {
    'use strict';

    var GraphwallView = Backbone.Marionette.ItemView.extend({
        template: JST['app/scripts/templates/graphwall.ejs'],
        graphTemplate: JST['app/scripts/templates/graph.ejs'],
        graphHelpTemplate: l10n.getSync('GraphHelp'),
        graphFailToLoadTemplate: _.template('<i title="<%- msg %>" class="fa fa-warning fa-3x warn"></i>'),
        className: 'graph-mode',
        currentGraph: '',
        ui: {
            'title': '.title',
            'buttons': '.btn-toolbar',
            'hosts': '.hosts-select'
        },
        events: {
            'click .btn-graph .btn': 'clickHandler',
            'change .hosts-select select': 'hostChangeHandler',
            'input .graph-range input': 'changeGraphRange'
        },
        rangeText: [
            l10n.getSync('Graph1Week'), l10n.getSync('Graph3Days'), l10n.getSync('Graph24Hours'), l10n.getSync('Graph12Hours'), l10n.getSync('GraphHour')
        ],
        rangeQuery: [
                '-7d', '-3d', '-1d', '-12hour', '-1hour'
        ],
        rangeLabel: [
            l10n.getSync('GraphLabelWeek'), l10n.getSync('GraphLabel3Days'), l10n.getSync('GraphLabel24Hours'), l10n.getSync('GraphLabel12Hours'), l10n.getSync('GraphLabelHour')
        ],
        graphTitleTemplates: {},
        graphOptions: {},
        graphs: [{
                metrics: ['byte_free', 'byte_used'],
                fn: 'makeDiskSpaceBytesGraphUrl',
                util: 'makeDiskSpaceTargets',
                titleTemplate: 'TitleGraphDiskSpaceBytes',
                options: {
                    labelsKMG2: true,
                    stackedGraph: true,
                    fillGraph: true,
                    ylabel: 'Bytes',
                    labels: ['Date', 'Free', 'Used']
                }
            }, {
                metrics: ['inodes_free', 'inodes_used'],
                fn: 'makeDiskSpaceInodesGraphUrl',
                util: 'makeDiskSpaceTargets',
                titleTemplate: 'TitleGraphDiskSpaceInodes',
                options: {
                    labelsKMB: true,
                    stackedGraph: true,
                    fillGraph: true,
                    ylabel: 'Inodes',
                    labels: ['Date', 'Free', 'Used']
                }
            }, {
                metrics: ['system', 'user', 'idle'],
                fn: 'makeCPUGraphUrl',
                util: 'makeCPUTargets',
                titleTemplate: 'TitleGraphHostCPUSummary',
                options: {
                    labels: ['Date', 'System', 'User', 'Idle'],
                    stackedGraph: true,
                    fillGraph: true,
                    ylabel: 'Percent',
                    stepPlot: true
                }
            }, {
                metrics: ['system', 'user', 'nice', 'idle', 'iowait', 'irq', 'softirq', 'steal'],
                fn: 'makeCPUDetailGraphUrl',
                util: 'makeCPUDetailedTargets',
                titleTemplate: 'TitleGraphCPUDetail',
                options: {
                    labels: ['Date', 'System', 'User', 'Nice', 'Idle', 'IOWait', 'IRQ', 'Soft IRQ', 'Steal'],
                    stackedGraph: true,
                    fillGraph: true,
                    ylabel: 'Percent',
                    stepPlot: true
                }
            }, {
                metrics: ['op_r_latency', 'op_w_latency', 'op_rw_latency'],
                fn: 'makeOpsLatencyGraphUrl',
                util: 'makeOpLatencyTargets',
                titleTemplate: 'TitleGraphOpsLatency',
                options: {
                    ylabel: 'Ms',
                    labels: ['Date', 'Read Latency', 'Write Latency', 'RW Latency']
                }
            }, {
                metrics: ['journal_ops', 'journal_wr'],
                fn: 'makeJournalOpsGraphUrl',
                util: 'makeFilestoreTargets',
                titleTemplate: 'TitleGraphJournalOps',
                options: {
                    ylabel: 'Operations',
                    labels: ['Date', 'Journal Ops', 'Journal Writes']
                }
            }, {
                metrics: ['01', '05', '15'],
                fn: 'makeLoadAvgGraphUrl',
                util: 'makeLoadAvgTargets',
                titleTemplate: 'TitleGraphLoadAverage',
                options: {
                    ylabel: 'Load Average',
                    labels: ['Date', '1 Min', '5 Min', '15 Min']
                }
            }, {
                metrics: ['Active', 'Buffers', 'Cached', 'MemFree'],
                fn: 'makeMemoryGraphUrl',
                util: 'makeMemoryTargets',
                titleTemplate: 'TitleGraphMemory',
                options: {
                    labelsKMG2: true,
                    labels: ['Date', 'Active', 'Buffers', 'Cached', 'Free'],
                    fillGraph: true,
                    ylabel: 'Bytes',
                    stackedGraph: true
                }
            }, {
                metrics: ['read_byte_per_second', 'write_byte_per_second'],
                fn: 'makeHostDeviceRWBytesGraphUrl',
                util: 'makeIOStatIOPSTargets',
                titleTemplate: 'TitleGraphRWBytes',
                options: {
                    labelsKMG2: true,
                    ylabel: 'Bytes/Second',
                    labels: ['Date', 'Read Bytes/Sec', 'Write Bytes/Sec']
                }
            }, {
                metrics: ['read_await', 'write_await'],
                fn: 'makeHostDeviceRWAwaitGraphUrl',
                util: 'makeIOStatIOPSTargets',
                titleTemplate: 'TitleGraphRWAwait',
                options: {
                    ylabel: 'Millis',
                    labels: ['Date', 'Reads', 'Writes']
                }
            }, {
                metrics: ['iops'],
                fn: 'makeHostDeviceIOPSGraphUrl',
                util: 'makeIOStatIOPSTargets',
                titleTemplate: 'TitleGraphIOPS',
                options: {
                    ylabel: 'IOPS',
                    labels: ['Date', 'IOPS']
                }
            }, {
                metrics: ['tx_byte', 'rx_byte'],
                fn: 'makeHostNetworkTXRXBytesGraphURL',
                util: 'makeNetworkTargets',
                titleTemplate: 'TitleGraphNetworkTXRXBytes',
                options: {
                    labelsKMG2: true,
                    ylabel: 'Bytes',
                    labels: ['Date', 'TX Bytes', 'RX Bytes']
                }
            }, {
                metrics: ['tx_packets', 'rx_packets'],
                fn: 'makeHostNetworkTXRXPacketsGraphURL',
                util: 'makeNetworkTargets',
                titleTemplate: 'TitleGraphNetworkTXRXPackets',
                options: {
                    labelsKMB: true,
                    ylabel: 'Packets',
                    labels: ['Date', 'TX Packets', 'RX Packets']
                }
            }, {
                metrics: ['tx_errors', 'rx_errors'],
                fn: 'makeHostNetworkTXRXErrorsGraphURL',
                util: 'makeNetworkTargets',
                titleTemplate: 'TitleGraphNetworkTXRXErrors',
                options: {
                    labelsKMB: true,
                    ylabel: 'Packets',
                    labels: ['Date', 'TX Errors', 'RX Errors']
                }
            }, {
                metrics: ['tx_drop', 'rx_drop'],
                fn: 'makeHostNetworkTXRXDropGraphURL',
                util: 'makeNetworkTargets',
                titleTemplate: 'TitleGraphNetworkTXRXDrops',
                options: {
                    labelsKMB: true,
                    ylabel: 'Packets',
                    labels: ['Date', 'TX Drops', 'RX Drops']
                }
            }, {
                metrics: ['num_read', 'num_write'],
                fn: 'makePoolIOPSGraphURL',
                util: 'makePoolIOPSTargets',
                titleTemplate: 'TitleGraphPoolIOPS',
                options: {
                    labelsKMB: true,
                    ylabel: 'IOPS',
                    labels: ['Date', 'Read', 'Write'],
                    stackedGraph: true,
                    fillGraph: true
                }
            }, {
                metrics: ['total_avail', 'total_used'],
                fn: 'makePoolDiskFreeGraphURL',
                util: 'makePoolDiskFreeTargets',
                titleTemplate: 'TitleGraphPoolTotalDiskFree',
                options: {
                    labelsKMG2: true,
                    ylabel: 'Bytes',
                    labels: ['Date', 'Available', 'Used'],
                    stackedGraph: true,
                    fillGraph: true
                }
            }
        ],
        selectTemplate: _.template('<select class="form-control" name="hosts"><option value="all" selected><%- Cluster %></option><option value="iops"><%- PoolIOPS %></option><%= list %></select>'),
        optionTemplate: _.template('<option value="<%- args.host %>">Host - <%- args.host %></option>"', null, {
            variable: 'args'
        }),
        selectors: [],
        dygraphDefaultOptions: {
            labelsKMG2: false,
            labelsKMB: false,
            stackedGraph: false,
            fillGraph: false,
            stepPlot: false,
            xlabel: 'Time (Last 24 hours)',
            connectSeparatedPoints: true,
            colors: ['#8fc97f', '#beaed4', '#fdc086', '#386cb0', '#f0027f', '#bf5b17', '#666666'],
            labelsSeparateLines: true,
            legend: 'always',
            axes: {
                x: {
                    valueFormatter: function(ms) {
                        return new Date(ms).strftime('%Y-%m-%d @ %H:%M%Z');
                    }
                }
            }
        },
        // **initialize**
        initialize: function() {
            this.App = Backbone.Marionette.getOption(this, 'App');
            this.AppRouter = Backbone.Marionette.getOption(this, 'AppRouter');
            this.graphiteHost = Backbone.Marionette.getOption(this, 'graphiteHost');
            this.graphiteRequestDelayMs = Backbone.Marionette.getOption(this, 'graphiteRequestDelayMs');
            this.baseUrl = gutils.makeBaseUrl(this.graphiteHost);
            this.heightWidth = gutils.makeHeightWidthParams(442, 266);
            _.bindAll(this, 'makeGraphFunctions', 'renderHostSelector', 'dygraphLoader', 'renderGraphTemplates', 'onItemBeforeClose', 'renderGraph', 'poolIopsGraphTitleTemplate', 'clusterUpdate');

            _.each(this.graphs, this.makeGraphFunctions);
            this.wrapTitleTemplate('makePoolIOPSGraphURL', this.poolIopsGraphTitleTemplate);

            this.cpuTargetModels = new models.GraphiteCPUModel(undefined, {
                graphiteHost: this.graphiteHost
            });
            this.ioTargetModels = new models.GraphiteIOModel(undefined, {
                graphiteHost: this.graphiteHost
            });
            this.netTargetModels = new models.GraphiteNetModel(undefined, {
                graphiteHost: this.graphiteHost
            });
            var self = this;
            this.iopsTargetModels = new models.GraphitePoolIOPSModel(undefined, {
                graphiteHost: this.graphiteHost,
                clusterName: this.App.ReqRes.request('get:cluster').get('id')
            });
            this.iopsTargetModels.filter = function(res) {
                var pools = self.App.ReqRes.request('get:pools');
                pools.all = true;
                return _.filter(res, function(el) {
                    return pools[el] !== undefined;
                });
            };
            this.render = _.wrap(this.render, this.renderWrapper);
            this.listenTo(this, 'item:before:close', this.onItemBeforeClose);
            this.listenTo(this.App.vent, 'cluster:update', this.clusterUpdate);
            this.debouncedChangedGraph = _.debounce(this.debouncedChangedGraph, 500);
            this.readyDeferred = $.Deferred();
            this.readyPromise = this.readyDeferred.promise();
        },
        // **isReady**
        // Returns a promise which is only fulfilled when the entire widget
        // has finished initializing.
        isReady: function() {
            return this.readyPromise;
        },
        // **debouncedChangedGraph**
        // Debounce wrapper for Changing the scale of the Graph.
        debouncedChangedGraph: function($parent, url, opts) {
            this.dygraphLoader($parent, url, opts);
        },
        // **changeGraphRange**
        // Handle slider events for the graph time scale.
        changeGraphRange: function(evt) {
            evt.preventDefault();
            evt.stopPropagation();
            var $target = $(evt.target);
            var $parent = $target.closest('.graph-card');
            var $workarea = $parent.find('.workarea_g');
            var url = $workarea.data('url');
            var value = $target.val();
            var opts = _.extend($workarea.data('opts'), {
                xlabel: this.rangeLabel[value]
            });
            $parent.find('.graph-value').text(this.rangeText[value]);
            var index = url.indexOf('&from');
            if (index !== -1) {
                url = url.slice(0, index);
            }
            this.debouncedChangedGraph($parent, url + '&from=' + this.rangeQuery[value], opts);
        },
        // **hostChangeHandler**
        // Handle dropdown select change event. Change the route of the App
        // to reflect changes to the host being viewed.
        hostChangeHandler: function(evt) {
            var target = evt.target;
            var $el = $(target.options[target.selectedIndex]);
            var host = $el.attr('value');
            if (target.selectedIndex < 2 || this.currentGraph === '') {
                this.currentGraph = '';
            } else {
                host += '/' + this.currentGraph;
            }
            this.AppRouter.navigate('graph/' + host, {
                trigger: true
            });
        },
        // **clickHandler**
        // Handle buttons above graphs to change to different host graphs.
        // Updates the route for the correct subview.
        clickHandler: function(evt) {
            var $target = $(evt.target);
            var id = $target.attr('data-id');
            var route = 'graph/' + this.hostname + '/' + id;
            this.currentGraph = id;
            if (id === 'overview') {
                route = 'graph/' + this.hostname;
                this.currentGraph = '';
            }
            this.AppRouter.navigate(route, {
                trigger: true
            });
        },
        // **onItemBeforeClose**
        // Clean up view when closed.
        // Remove cached graph instances and state.
        onItemBeforeClose: function() {
            this.$('.workarea_g').each(function(index, graph) {
                /* clean up cached dygraph instances before closing view */
                var $graph = $(graph);
                var dynagraph = $graph.data('graph');
                // jshint camelcase: false
                if (dynagraph && dynagraph.maindiv_ !== null) {
                    dynagraph.destroy();
                }
                $graph.data('graph', undefined);
                $graph.data('url', undefined);
                $graph.data('opts', undefined);
            });
        },
        // **poolIopsGraphTitleTemplate**
        poolIopsGraphTitleTemplate: function(fn) {
            // wrap Pool Iops Title Template so we can add proper name
            var self = this;
            return function(opts) {
                var pools = self.App.ReqRes.request('get:pools');
                pools.all = 'Aggregate';
                if (opts.id) {
                    opts.id = pools[opts.id];
                }
                return fn(opts);
            };
        },
        // **makeGraphFunctions**
        makeGraphFunctions: function(options) {
            var targets = gutils.makeTargets(gutils[options.util](options.metrics));
            var fns = [
                gutils.makeParam('format', 'json-array'),
                targets
            ];
            this[options.fn] = gutils.makeGraphURL(this.baseUrl, fns);
            this.graphTitleTemplates[options.fn] = function() {
                var args = Array.prototype.slice.call(arguments, 0);
                args.unshift(options.titleTemplate);
                return l10n.getSync.apply(null, args);
            };
            this.graphOptions[options.fn] = options.options;
        },
        // **wrapTitleTemplate**
        wrapTitleTemplate: function(key, wrapperFn) {
            this.graphTitleTemplates[key] = wrapperFn(this.graphTitleTemplates[key]);
        },
        // **clusterUpdate**
        clusterUpdate: function(model) {
            // re-init models that depend on cluster name issue #7140
            this.iopsTargetModels = new models.GraphitePoolIOPSModel(undefined, {
                graphiteHost: this.graphiteHost,
                clusterName: model.get('id')
            });
        },
        // **renderWrapper**
        // Wrap render so we can augment it with ui elements and
        // redelegate events on new ui elements
        renderWrapper: function(fn) {
            fn.call(this);
            this.renderGraphTemplates();
            this.renderHostSelector();
            this.delegateEvents(this.events);
            this.readyDeferred.resolve();
        },
        // **renderGraphTemplates**
        renderGraphTemplates: function() {
            var self = this;
            this.selectors = _.map(_.range(30), function(id) {
                var selector = 'graph-' + id;
                var t = self.graphTemplate({
                    graphid: selector
                });
                self.$el.append(t);
                return '.' + selector;
            });
        },
        // **makeCPUDetail**
        makeCPUDetail: function(hostname, id) {
            this.updateBtns(id);
            return this.makePerHostModelGraphs(hostname, 'makeCPUDetailGraphUrl', this.cpuTargetModels);
        },
        // **makeHostDeviceIOPS**
        makeHostDeviceIOPS: function(hostname, id) {
            this.updateBtns(id);
            return this.makePerHostModelGraphs(hostname, 'makeHostDeviceIOPSGraphUrl', this.ioTargetModels);
        },
        // **makeHostDeviceRWBytes**
        makeHostDeviceRWBytes: function(hostname, id) {
            this.updateBtns(id);
            return this.makePerHostModelGraphs(hostname, 'makeHostDeviceRWBytesGraphUrl', this.ioTargetModels);
        },
        // **makeHostDeviceRWAwait**
        makeHostDeviceRWAwait: function(hostname, id) {
            this.updateBtns(id);
            return this.makePerHostModelGraphs(hostname, 'makeHostDeviceRWAwaitGraphUrl', this.ioTargetModels);
        },
        // **makePoolIOPS**
        makePoolIOPS: function() {
            return this.makePerHostModelGraphs('', 'makePoolIOPSGraphURL', this.iopsTargetModels, this.iopsTargetModels.clusterName);
        },
        // **updateBtns**
        updateBtns: function(id) {
            this.ui.buttons.find('.btn').removeClass('active');
            this.ui.buttons.find('[data-id="' + id + '"]').addClass('active');
        },
        // **getOSDIDs**
        getOSDIDs: function() {
            // create a fake model that mimics the interfaces we need
            var reqres = this.App.ReqRes;
            var model = {};
            model.fetchMetrics = function(hostname) {
                var d = $.Deferred();
                setTimeout(function() {
                    var resp = reqres.request('get:osdids', hostname);
                    model.ids = resp;
                    d.resolve(resp);
                }, 0);
                return d.promise();
            };
            model.keys = function() {
                return model.ids;
            };
            model.clear = function() {};
            return model;
        },
        // **makeHostDeviceDiskSpaceBytes**
        makeHostDeviceDiskSpaceBytes: function(hostname, id) {
            this.updateBtns(id);
            return this.makePerHostModelGraphs(hostname, 'makeDiskSpaceBytesGraphUrl', this.getOSDIDs());
        },
        // **makeHostDeviceDiskSpaceInodes**
        makeHostDeviceDiskSpaceInodes: function(hostname, id) {
            this.updateBtns(id);
            return this.makePerHostModelGraphs(hostname, 'makeDiskSpaceInodesGraphUrl', this.getOSDIDs());
        },
        // **makeHostNetworkBytesMetrics**
        makeHostNetworkBytesMetrics: function(hostname, id) {
            this.updateBtns(id);
            return this.makePerHostModelGraphs(hostname, 'makeHostNetworkTXRXBytesGraphURL', this.netTargetModels);
        },
        // **makeHostNetworkPacketsMetrics**
        makeHostNetworkPacketsMetrics: function(hostname, id) {
            this.updateBtns(id);
            var self = this;
            var r = _.map(['makeHostNetworkTXRXPacketsGraphURL', 'makeHostNetworkTXRXErrorsGraphURL', 'makeHostNetworkTXRXDropGraphURL'], function(graph) {
                return self.makePerHostModelGraphs(hostname, graph, self.netTargetModels);
            });
            return $.when.apply(undefined, r).then(function(a, b, c) {
                return a.concat(b).concat(c);
            });
        },
        // **makeClusterWideMetrics**
        makeClusterWideMetrics: function() {
            var self = this;
            var model = {
                keys: function() {
                    return ['all'];
                },
                clear: function() {},
                fetchMetrics: function() {
                    var d = $.Deferred();
                    d.resolve();
                    return d.promise();
                }

            };
            var clusterName = this.App.ReqRes.request('get:cluster').get('id');
            var r = _.map(['makePoolIOPSGraphURL', 'makePoolDiskFreeGraphURL'], function(graph) {
                return self.makePerHostModelGraphs('', graph, model, clusterName);
            });
            return $.when.apply(undefined, r).then(function(a, b) {
                return a.concat(b);
            });
        },
        // **showButtons**
        showButtons: function() {
            this.ui.buttons.css('visibility', 'visible');
        },
        // **hideButtons**
        hideButtons: function() {
            this.ui.buttons.css('visibility', 'hidden');
        },
        // **makePerHostGraphs**
        makePerHostGraphs: function(hostname, fnName) {
            var fn = this[fnName];
            var titleFn = this.graphTitleTemplates[fnName];
            var title;
            if (titleFn) {
                title = titleFn({
                    hostname: hostname
                });
            }
            var options = this.graphOptions[fnName];
            return {
                url: fn.call(this, hostname),
                title: title,
                options: options
            };
        },
        // **makePerHostModelGraphs**
        makePerHostModelGraphs: function(hostname, fnName, model, clusterName) {
            var self = this;
            var titleFn = this.graphTitleTemplates[fnName];
            var fn = this[fnName];
            var options = this.graphOptions[fnName];
            this.hostname = hostname;
            var deferred = $.Deferred();
            model.clear({
                silent: true
            });
            model.fetchMetrics(hostname).done(function() {
                var list = model.keys();
                deferred.resolve(_.map(list, function(id) {
                    var title;
                    if (titleFn) {
                        title = titleFn({
                            hostname: hostname,
                            id: id
                        });
                    }
                    return {
                        url: fn.call(self, hostname, id, clusterName),
                        title: title,
                        options: options
                    };
                }));
            }).fail(function(resp) {
                deferred.reject(resp);
            });
            return deferred.promise();
        },
        // **makeHostUrls**
        makeHostUrls: function(fnName) {
            var self = this;
            return function() {
                var hosts = this.App.ReqRes.request('get:hosts');
                return _.map(hosts, function(host) {
                    return self.makePerHostGraphs(host, fnName);
                });
            };
        },
        // **renderHostSelector**
        renderHostSelector: function() {
            var hosts = this.App.ReqRes.request('get:fqdns');
            var opts = _.reduce(hosts, function(memo, host) {
                return memo + this.optionTemplate({
                    host: host
                });
            }, null, this);
            var $el = this.ui.hosts;
            $el.html(this.selectTemplate({
                Cluster: l10n.getSync('Cluster'),
                PoolIOPS: l10n.getSync('PoolIOPS'),
                list: opts
            }));
        },
        // **jsonRequest**
        jsonRequest: function(url) {
            return $.ajax({
                url: url,
                dataType: 'json'
            });
        },
        // **useCustomLabels**
        useCustomLabels: function(post, overrides) {
            if (overrides && overrides.labels) {
                // override labels from response if we have custom ones defined
                return _.map(['Date'].concat(post.labels), function(value, index) {
                    if (overrides.labels[index] !== undefined) {
                        return overrides.labels[index];
                    } else {
                        return value;
                    }
                });
            }
            return post.labels;
        },
        // **allocateGraph**
        allocateGraph: function($el, data, options) {
            var $g = $el.data('graph');
            if ($g) {
                // use cached instance
                if ($g.isZoomed('x')) {
                    $g.resetZoom();
                }
                $g.updateOptions(_.extend({
                    file: data
                }, options));
            } else {
                // allocate new instance
                $g = new Dygraph($el[0], data, options);
                $el.data('graph', $g);
            }
            return $g;
        },
        // **renderGraph**
        renderGraph: function($el, url, overrides, resp) {
            var $workarea = $el.find('.workarea_g');
            $workarea.css('visibility', 'hidden');
            $workarea.data('url', url);
            $workarea.data('opts', overrides);
            var d = $.Deferred();
            var self = this;
            _.defer(function() {
                var post = gutils.graphiteJsonArrayToDygraph(resp);
                d.resolve(post);
            });
            d.promise().done(function(post) {
                $el.find('input').removeAttr('disabled');
                overrides.labels = self.useCustomLabels(post, overrides);
                var options = _.extend({
                    labelsDiv: $el.find('.dygraph-legend')[0]
                }, self.dygraphDefaultOptions, overrides);
                $workarea.css('visibility', 'visible');
                self.allocateGraph($workarea, post.data, options);
                $workarea.append('<div class="help-icon"><i class="fa fa-question-circle fa-2x"></i></div>');
                var $icon = $workarea.find('.help-icon i.fa');
                $icon.popover('destroy');
                $icon.popover({
                    title: 'Help',
                    trigger: 'hover',
                    container: 'body',
                    content: self.graphHelpTemplate,
                    placement: 'top'
                });
            });
        },
        // **dygraphLoader**
        dygraphLoader: function($el, url, optOverrides) {
            var self = this;
            var $graphveil = $el.find('.graph-spinner').removeClass('hidden');
            var $ajax = this.jsonRequest(url);
            $el.find('.icon-space').text('');
            $el.find('input').attr('disabled', 'disabled');
            $ajax.done(_.partial(this.renderGraph, $el, url, optOverrides)).fail(function dygraphFail(jqXHR) {
                // handle errors on load here
                var msg = _.template('Graph Error: <%- status %><%- response %>', {
                    status: jqXHR.statusText,
                    response: jqXHR.responseText
                });
                $el.find('.graph-spinner').addClass('hidden');
                $el.find('.icon-space').append(self.graphFailToLoadTemplate({
                    msg: msg
                }));
                var $g = $el.find('.workarea_g').data('graph');
                if ($g) {
                    // clear existing graph if the graph fails to load
                    $g.updateOptions({
                        labels: [],
                        file: {}
                    });
                    $el.find('.dygraph-legend').text('');
                }
            }).always(function hideVeil() {
                $graphveil.addClass('hidden');
            });
        },
        // **makeHostOverviewGraphUrl**
        makeHostOverviewGraphUrl: function(host) {
            var self = this;
            return function() {
                return _.map(['makeCPUGraphUrl', 'makeLoadAvgGraphUrl', 'makeMemoryGraphUrl'], function(fnName) {
                    return self.makePerHostGraphs(host, fnName);
                });
            };
        },
        // **hideGraphs**
        hideGraphs: function() {
            this.$('.graph-card, .workarea_g').css('visibility', 'hidden');
            this.$('.graph-range input').each(function(index, el) {
                el.value = 2;
            });
            var self = this;
            this.$('.graph-value').each(function(index, el) {
                $(el).text(self.rangeText[2]);
            });
        },
        // **renderGraphs**
        renderGraphs: function(title, fn) {
            var graphs = fn.call(this);
            var self = this;
            this.ui.title.text(title);
            _.each(graphs, function(graph, index) {
                var $graphEl = self.$(self.selectors[index]);
                $graphEl.css('visibility', 'visible');
                if (graph.title) {
                    $graphEl.find('.graph-subtitle').text(graph.title);
                }
                _.delay(function() {
                    self.dygraphLoader($graphEl, graph.url, graph.options);
                }, self.graphiteRequestDelayMs * index);
            });
        },
        // **updateSelect**
        updateSelect: function(id) {
            this.$('select option[selected]').prop('selected', false);
            this.$('select option[value="' + id + '"]').prop('selected', true);
        }
    });

    return GraphwallView;
});
