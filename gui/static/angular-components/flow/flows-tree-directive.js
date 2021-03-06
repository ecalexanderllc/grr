'use strict';

goog.provide('grrUi.flow.flowsTreeDirective.FlowsTreeController');
goog.provide('grrUi.flow.flowsTreeDirective.FlowsTreeDirective');

goog.scope(function() {



/**
 * Controller for FlowsTreeDirective.
 *
 * @constructor
 * @param {!angular.Scope} $scope
 * @param {!angular.JQLite} $element
 * @param {!grrUi.core.apiService.ApiService} grrApiService
 * @ngInject
 */
grrUi.flow.flowsTreeDirective.FlowsTreeController = function(
    $scope, $element, grrApiService) {
  /** @private {!angular.Scope} */
  this.scope_ = $scope;

  /** @private {!angular.JQLite} */
  this.element_ = $element;

  /** @private {!grrUi.core.apiService.ApiService} */
  this.grrApiService_ = grrApiService;

  /** @type {!Object} */
  this.flowsDescriptors;

  /** @type {!Object} */
  this.userSettings;

  this.grrApiService_.get('/users/me/settings').then(function(response) {
    this.userSettings = response.data;
  }.bind(this));

  this.grrApiService_.get('/flows/descriptors').then(function(response) {
    this.flowsDescriptors = response.data;
  }.bind(this));

  this.scope_.$watchGroup(['controller.userSettings',
                           'controller.flowsDescriptors'],
                          this.onDescriptorsOrSettingsChange_.bind(this));
};
var FlowsTreeController = grrUi.flow.flowsTreeDirective.FlowsTreeController;


/**
 * Handles data necessary to build the tree: list of flows descriptors and
 * user settings (settings contain UI mode - BASIC/ADVANCED/DEBUG) necessary
 * to filter the flow tree.
 *
 * @private
 */
FlowsTreeController.prototype.onDescriptorsOrSettingsChange_ = function() {
  if (angular.isUndefined(this.flowsDescriptors) ||
      angular.isUndefined(this.userSettings)) {
    return;
  }

  // Get current UI mode selected by the user. Default to "BASIC" if
  // it's not set.
  // TODO(user): stuff like this should be abstracted away into a
  // dedicated service.
  var mode = this.scope_.$eval('controller.userSettings.value.mode.value');
  if (angular.isUndefined(mode)) {
    mode = 'BASIC';
  }

  var treeNodes = [];
  var descriptorsKeys = Object.keys(this.flowsDescriptors).sort();
  angular.forEach(descriptorsKeys, function(category) {
    var categoryNode = {
      data: category,
      // Id is needed for Selenium tests backwards compatibility.
      attr: {id: '_' + category},
      state: 'closed',
      children: []
    };

    var descriptors = this.flowsDescriptors[category].sort(function(a, b) {
      var aName = a['friendly_name'] || a['name'];
      var bName = b['friendly_name'] || b['name'];

      if (aName < bName) {
        return -1;
      } else if (aName > bName) {
        return 1;
      } else {
        return 0;
      }
    });
    angular.forEach(descriptors, function(descriptor) {
      // Filter out flows that don't support display mode selected by
      // the user.
      if (mode == 'DEBUG' || descriptor['behaviours'].indexOf(mode) != -1) {

        categoryNode['children'].push({
          metadata: {descriptor: descriptor},
          // Id is needed for Selenium tests backwards compatibility.
          attr: {id: '_' + category + '-' + descriptor['name']},
          data: descriptor['friendly_name'] || descriptor['name']
        });
      }
    }.bind(this));

    treeNodes.push(categoryNode);
  }.bind(this));

  var treeElem = $(this.element_).children('div.tree');
  treeElem.jstree({
    'json_data': {
      'data': treeNodes,
    },
    'plugins': ['json_data', 'themes', 'ui']
  });
  treeElem.on('select_node.jstree', function(e, data) {
    data['inst']['toggle_node'](data['rslt']['obj']);

    var descriptor = data['rslt']['obj'].data('descriptor');
    if (angular.isDefined(descriptor)) {
      // Have to call apply as we're in event handler triggered by
      // non-Angular code.
      this.scope_.$apply(function() {
        this.scope_.selectedDescriptor = descriptor;
      }.bind(this));
    }
  }.bind(this));
};


/**
 * FlowsTreeDirective definition.

 * @return {angular.Directive} Directive definition object.
 */
grrUi.flow.flowsTreeDirective.FlowsTreeDirective = function() {
  return {
    scope: {
      selectedDescriptor: '=?'
    },
    restrict: 'E',
    template: '<div class="tree"></div>',
    controller: FlowsTreeController,
    controllerAs: 'controller'
  };
};


/**
 * Directive's name in Angular.
 *
 * @const
 * @export
 */
grrUi.flow.flowsTreeDirective.FlowsTreeDirective.directive_name =
    'grrFlowsTree';



});  // goog.scope
