/* global define */
(function() {
    'use strict';
    define(['lodash', 'helpers/modal-helpers'], function(_) {

        var clusterPollIntervalMs = 1000;
        var FirstTimeController = function($q, $log, $timeout, $location, $scope, KeyService, ClusterService, $modal) {
            var promises = [KeyService.getList()];
            $scope.addDisabled = true;
            $scope.debug = false;
            $q.all(promises).then(function(results) {

                $scope.up = true;
                if (ClusterService.clusterId !== null) {
                    $location.path('/');
                    return;
                }

                (function(keys) {
                    $scope.hosts = _.reduce(keys, function(result, key) {
                        if (key.status === 'pre') {
                            result.pre.push(key);
                        } else if (key.status === 'accepted') {
                            result.accepted.push(key);
                        } else {
                            result.blocked.push(key);
                        }
                        return result;
                    }, {
                        accepted: [],
                        pre: [],
                        blocked: []
                    });
                    $scope.addDisabled = false;
                    $scope.acceptAll = function() {
                        var ids = _.map($scope.hosts.pre, function(key) {
                            return key.id;
                        });
                        $log.debug(ids);
                        $scope.addDisabled = true;
                        var modal = $modal({
                            'title': '<i class="text-success fa fa-check-circle fa-lg"></i> Accept Request Sent',
                            'template': 'views/new-install-modal.html',
                            'content': '<p><i class="fa fa-spinner fa-spin"></i> Waiting for First Cluster to Join</p>',
                            'backdrop': 'static',
                            'html': true
                        });
                        modal.$scope.closeDisabled = true;
                        modal.$scope.$hide = _.wrap(modal.$scope.$hide, function($hide) {
                            $hide();
                            ClusterService.initialize().then(function() {
                                $location.path('/');
                            });
                        });

                        function checkClusterUp() {
                            ClusterService.getList().then(function(clusters) {
                                if (clusters.length) {
                                    modal.$scope.closeDisabled = false;
                                    modal.$scope.content = 'Cluster Initialized.';
                                    return;
                                }
                                $timeout(checkClusterUp, clusterPollIntervalMs);
                            });
                        }
                        KeyService.accept(ids).then(function(resp) {
                            $log.debug(resp);
                            if (resp.status === 204) {
                                $timeout(checkClusterUp, clusterPollIntervalMs);
                            }
                            $scope.addDisabled = false;

                        }, function(resp) {
                            modal.$scope.content = '<i class="text-danger fa fa-exclamation-circle fa-lg"></i> Error ' + resp.status + '. Please try reloading the page and logging in again.</p><h4>Raw Response</h4><p><pre>' + resp.data + '</pre></p>';
                            $scope.addDisabled = false;
                        });
                        return;
                    };
                })(results[0]);


            });
        };
        return ['$q', '$log', '$timeout', '$location', '$scope', 'KeyService', 'ClusterService', '$modal', FirstTimeController];
    });
})();
