/* Contest Management System
 * Copyright © 2013 Luca Wehrstedt <luca.wehrstedt@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';

/* Parameter Types */

function generate_template(scope, model, model_path, value_path, callback) {
    var template = '<div class="form-group">';

    if (model.name) {
        // FIXME Improper use of labels.
        template += '<label class="col-lg-3 control-label">{{' + model_path + '.name}}</label>';
        template += '<div class="col-lg-9">';
    } else {
        template += '<div class="col-lg-12">';
    }

    if (value_path.indexOf("values") == 0 && angular.isUndefined(scope.$eval(value_path))) {
        scope.$eval(value_path + ' = ' + model_path + '.default;');
    }

    scope.$watch(value_path, callback);

    if (model._type == "bool") {
        template += '<input class="form-control" type="checkbox" ng-model="' + value_path.replace(/"/g, '&quot;') + '"/>';
    } else if (model._type == "int") {
        template += '<input class="form-control" type="number" ng-model="' + value_path.replace(/"/g, '&quot;') + '"/>';
    } else if (model._type == "float") {
        template += '<input class="form-control" type="number" ng-model="' + value_path.replace(/"/g, '&quot;') + '"/>';
    } else if (model._type == "string") {
        template += '<input class="form-control" type="text" ng-model="' + value_path.replace(/"/g, '&quot;') + '"/>';
    } else if (model._type == "enum") {
        template += '<select class="form-control" ng-model="' + value_path.replace(/"/g, '&quot;') + '" ng-options="key as value for (key , value) in ' + model_path.replace(/"/g, '&quot;') + '.values"></select>';
    } else if (model._type == "list") {
        // FIXME Only works with lists of lists or lists of tuples.
        // TODO Allow to add/remove items.
        template += '<div ng-repeat="item in ' + value_path.replace(/"/g, '&quot;') + '">';
        template += generate_template(scope, model.subparameter, model_path + '.subparameter', 'item', callback);
        template += '</div>';
    } else if (model._type == "tuple") {
        angular.forEach(model.subparameters, function(value, key){
            template += generate_template(scope, value, model_path + '.subparameters[' + key + ']', value_path + '[' + key + ']', callback);
        });
    }

    if (model.description) {
        template += '<span class="help-block">{{' + model_path + '.description}}</span>';
    }

    template += '</div></div>';
    return template;
}


angular.module('aws.parameter_types', [])
    .directive('taskType', ['$compile', '$http', function ($compile, $http) {
        var directiveDefinitionObject = {
            restrict: 'E',
            scope: {
                name: "=name",
                parameters: "=parameters",
            },
            link: function(scope, elem, attr, ctrl) {
                scope.models = {}
                scope.models[scope.name] = [{_type: "string", name: "Parameter string", description: "Couldn't provide an interface. Please edit the JSON-encoded value directly.", fallback: true}];
                scope.values = {}
                scope.values[scope.name] = [scope.parameters];

                var callback = function(newValue, oldValue) {
                    if (scope.models[scope.name].length == 1 && scope.models[scope.name][0].fallback) {
                        scope.parameters = scope.values[scope.name][0];
                    } else {
                        scope.parameters = angular.toJson(scope.values[scope.name]);
                    }
                };

                $http.get('task_types/').success(function(data) {
                    angular.extend(scope.models, data);
                    if (scope.name in data) {
                        scope.values[scope.name] = angular.fromJson(scope.parameters);
                    }

                    var template = '<div class="form-horizontal">';
                    template += '<div class="form-group"><div class="col-lg-12"><select class="form-control" ng-model="name" ng-options="key as key for (key , value) in models"></select></div></div>';
                    scope.$watch('name', callback);
                    angular.forEach(scope.models, function (value, key) {
                        if (!angular.isArray(scope.values[key])) {
                            scope.values[key] = [];
                        }
                        template += '<div ng-show="isActive(&quot;' + key + '&quot;)">';
                        //scope.$watch('values["'+key+'"]', callback);
                        angular.forEach(value, function (item, idx) {
                            template += generate_template(scope, scope.models[key][idx], 'models["' + key + '"][' + idx + ']', 'values["' + key + '"][' + idx + ']', callback);
                        });
                        template += '</div>';
                    });
                    template += '</div>';

                    var newElem = angular.element(template);
                    $compile(newElem)(scope);
                    elem.replaceWith(newElem);
                });
            },
            controller: ['$scope', '$element', '$attrs', '$transclude', function($scope, $element, $attrs, $transclude) {
                $scope.isActive = function(key) {
                    return $scope.name == key;
                };
            }],
        };
        return directiveDefinitionObject;
    }])
    .directive('scoreType', ['$compile', '$http', function ($compile, $http) {
        var directiveDefinitionObject = {
            restrict: 'E',
            scope: {
                name: "=name",
                parameters: "=parameters",
            },
            link: function(scope, elem, attr, ctrl) {
                var SCORE_TYPES = ["GroupMin", "GroupMul", "GroupThreshold", "Sum"];
                scope.models = {}
                scope.values = {}
                angular.forEach(SCORE_TYPES, function(name) {
                    scope.models[name] = [{_type: "string", name: "Parameter string", description: "Couldn't provide an interface. Please edit the JSON-encoded value directly.", fallback: true}];
                    scope.values[name] = [];
                });

                scope.$watch("name + parameters", function() {
                    scope.values[scope.name] = [scope.parameters];
                });

                var callback = function(newValue, oldValue) {
                    if (newValue === oldValue) {
                        return;
                    }
                    if (scope.models[scope.name].length == 1 && scope.models[scope.name][0].fallback) {
                        scope.parameters = scope.values[scope.name][0];
                    } else {
                        scope.parameters = angular.toJson(scope.values[scope.name]);
                    }
                };

                var template = '<div class="form-horizontal">';
                template += '<div class="form-group"><div class="col-lg-12"><select class="form-control" ng-model="name" ng-options="key as key for (key , value) in models"></select></div></div>';
                scope.$watch('name', callback);
                angular.forEach(scope.models, function (value, key) {
                    template += '<div ng-show="isActive(&quot;' + key + '&quot;)">';
                    //scope.$watch('values["'+key+'"]', callback);
                    angular.forEach(value, function (item, idx) {
                        template += generate_template(scope, scope.models[key][idx], 'models["' + key + '"][' + idx + ']', 'values["' + key + '"][' + idx + ']', callback);
                    });
                    template += '</div>';
                });
                template += '</div>';

                var newElem = angular.element(template);
                $compile(newElem)(scope);
                elem.replaceWith(newElem);
            },
            controller: ['$scope', '$element', '$attrs', '$transclude', function($scope, $element, $attrs, $transclude) {

                $scope.isActive = function(key) {
                    return $scope.name == key;
                };
            }],
        };
        return directiveDefinitionObject;
    }]);
