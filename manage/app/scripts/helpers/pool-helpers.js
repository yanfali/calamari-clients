/*global define */
(function() {
    'use strict';
    define(['lodash'], function(_) {

        function roundUpToNextPowerOfTwo(num) {
            // reference http://bits.stephan-brumme.com/roundUpToNextPowerOfTwo.html
            /* jshint bitwise: false */
            num--;
            num |= num >> 1;
            num |= num >> 2;
            num |= num >> 4;
            num |= num >> 8;
            num |= num >> 16;
            num++;
            return num;
        }

        function calculatePGNum(osdcount, size, pgmax) {
            var pgnum = roundUpToNextPowerOfTwo(osdcount * 100 / size);
            if (pgnum > pgmax) {
                pgnum = pgmax;
            }
            return pgnum;
        }

        function validateMaxMin(fieldName, newValue, min, max) {
            /* jshint validthis:true, camelcase: false*/
            if (newValue < min) {
                this[fieldName] = 1;
                return false;
            }
            if (newValue > max) {
                this[fieldName] = max;
                return false;
            }
            return true;
        }

        function getActiveRule(ruleset, maxPoolPgNum, size) {
            /* jshint camelcase: false */
            return _.reduce(ruleset.rules, function(result, rule) {
                var active_rule = result.active_rule;
                var osd_count = result.osd_count;
                if (size >= rule.min_size && size <= rule.max_size) {
                    active_rule = rule.id;
                    osd_count = rule.osd_count;
                }
                return {
                    min_size: Math.min(rule.min_size, result.min_size),
                    max_size: Math.max(rule.max_size, result.max_size),
                    active_rule: active_rule,
                    osd_count: osd_count
                };
            }, {
                min_size: maxPoolPgNum,
                max_size: 1,
                active_rule: 0,
                osd_count: 0
            });
        }

        /*
         * options:
         *   pgnumReset: used to control whether to use recommend pg value or reset back to default.
         *   Use case is modify wants the old value back and create wants the recommend value.
         */

        function makeReset($scope, options) {
            /* jshint camelcase: false */
            options = options || {
                pgnumReset: true
            };
            return function() {
                var defaults = $scope.defaults;
                $scope.pool.name = defaults.name;
                $scope.pool.size = defaults.size;
                $scope.pool.crush_ruleset = defaults.crush_ruleset;
                if (options.pgnumReset) {
                    var ruleset = $scope.crushrulesets[defaults.crush_ruleset];
                    var limits = getActiveRule(ruleset, defaults.mon_max_pool_pg_num, $scope.pool.size);
                    var pgnum = calculatePGNum(limits.osd_count, $scope.pool.size, defaults.mon_max_pool_pg_num);
                    if ($scope.pool.pg_num !== pgnum) {
                        // Only reset pg num if it's different from calculated default
                        // This catches where size isn't change but pg has been
                        $scope.pool.pg_num = pgnum;
                    }
                } else {
                    $scope.pool.pg_num = defaults.pg_num;
                }
            };
        }

        /* Business Logic for crush rule sets pool replicas and placement groups */

        function addWatches($scope) {
            $scope.$watch('pool.name', function(newValue) {
                if (_.find($scope.poolNames, function(name) {
                    return name === newValue;
                })) {
                    $scope.poolForm.name.$setValidity('duplicate', false);
                    return;
                }
                $scope.poolForm.name.$setValidity('duplicate', true);
            });
            /* jshint camelcase: false */
            $scope.$watch('pool.size', function(newValue /*, oldValue*/ ) {
                if (!_.isNumber(newValue)) {
                    $scope.poolForm.size.$error.number = true;
                    return;
                }
                var ruleset = $scope.crushrulesets[$scope.pool.crush_ruleset];
                var limits = getActiveRule(ruleset, $scope.defaults.mon_max_pool_pg_num, newValue);
                $scope.limits = limits;
                if (validateMaxMin.call($scope.pool, 'size', newValue, limits.min_size, limits.max_size)) {
                    $scope.pool.pg_num = calculatePGNum(limits.osd_count, newValue, $scope.defaults.mon_max_pool_pg_num);
                    $scope.crushrulesets[$scope.pool.crush_ruleset].active_sub_rule = limits.active_rule;
                }
            });
            $scope.$watch('pool.pg_num', function(newValue /*, oldValue*/ ) {
                if (!_.isNumber(newValue)) {
                    $scope.poolForm.pg_num.$error.number = true;
                    return;
                }
                $scope.poolForm.pg_num.$error.number = false;
                $scope.poolForm.pg_num.$pristine = true;
                validateMaxMin.call($scope.pool, 'pg_num', newValue, 1, $scope.defaults.mon_max_pool_pg_num);
            });
            $scope.$watch('pool.crush_ruleset', function(newValue, oldValue) {
                $scope.pool.size = $scope.defaults.size;
                $scope.crushrulesets[newValue].active_sub_rule = 0;
                $scope.crushrulesets[oldValue].active_sub_rule = 0;
            });
        }

        function normalizeCrushRulesets(crushrulesets) {
            /* jshint camelcase: false */
            return _.map(crushrulesets, function(set) {
                var rules = _.map(set.rules, function(rule, index) {
                    return {
                        id: index,
                        name: rule.name,
                        min_size: rule.min_size,
                        max_size: rule.max_size,
                        osd_count: rule.osd_count
                    };
                });
                return {
                    id: set.id,
                    rules: rules,
                    active_sub_rule: 0
                };
            });
        }

        function poolDefaults() {
            return {
                /* jshint camelcase:false */
                name: '',
                size: 2,
                crush_ruleset: 0,
                pg_num: 100
            };
        }
        return {
            calculatePGNum: calculatePGNum,
            validateMaxMin: validateMaxMin,
            roundUpToNextPowerOfTwo: roundUpToNextPowerOfTwo,
            getActiveRule: getActiveRule,
            makeReset: makeReset,
            addWatches: addWatches,
            defaults: poolDefaults,
            normalizeCrushRulesets: normalizeCrushRulesets
        };
    });
})();
