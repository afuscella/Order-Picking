/*global location*/
sap.ui.define([
		"pt/ewm/am/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/routing/History",
		"pt/ewm/am/model/formatter",
		"sap/ui/model/Filter"
	], function(
		BaseController, 
		JSONModel, 
		History, 
		formatter, 
		Filter
	) {
		"use strict";
		
		return BaseController.extend("pt.ewm.am.controller.Worklist", {
		
			formatter : formatter,
			
			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */
			
			/**
			 * Called when the worklist controller is instantiated.
			 * @public
			 */
			 
			onInit : function() {
				var oList = this.byId("list"),
					// JSON model to support Worklist view
					oViewModel,
					// MessagePopover object for message control
					oMessagePopover,
					// Put down worklist table's original value for busy indicator delay,
					// so it can be restored later on. Busy handling on the table is
					// taken care of by the table itself.
					iOriginalBusyDelay = oList.getBusyIndicatorDelay();
			
				// The Worklist	
				this._oList = oList;
				
				// The Message Popover
				oMessagePopover = this._createMessagePopover();
				oMessagePopover.setModel(this.getOwnerComponent().getModel("messages"));
				this._oMessagePopover = oMessagePopover;
				
				// Keeps the filter and search state
				this._oListFilterState = {
					aFilter: [],
					aSearch: []
				};
				
				// Model used to manipulate view control states
				oViewModel = this._createViewModel();
				this.setModel(oViewModel, "worklistView");
				
				// Make sure, busy indication is showing immediately so there is no
				// break after the busy indication for loading the view's meta data is
				// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
				oList.attachEventOnce("updateFinished", function() {
					// Restore original busy indicator delay for worklist's List
					oViewModel.setProperty("/listBusyDelay", iOriginalBusyDelay);
				});
				
				this.getView().addEventDelegate({
					onBeforeFirstShow: function() {
						this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
					}.bind(this)
				});
				
				this.getRouter().attachBypassed(this.onBypassed, this);
				
				this._doModelUpdate(oList);
			},
			
			
			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */
			
			/**
			 * Triggered by the table's 'updateFinished' event: after new table
			 * data is available, this handler method updates the table counter.
			 * This should only happen if the update was successful, which is
			 * why this handler is attached to 'updateFinished' and not to the
			 * table's list binding's 'dataReceived' method.
			 * @param {sap.ui.base.Event} oEvent the update finished event
			 * @public
			 */
			 
			onUpdateFinished: function(oEvent) {
				// update the worklist's object counter after the table update
				var sTitle, oList = oEvent.getSource(),
					iTotalItems = oEvent.getParameter("total"),
					oSearchField = this.byId("searchField");
				// only update the counter if the length is final and
				// the table is not empty
				if (iTotalItems && oList.getBinding("items").isLengthFinal()) {
					sTitle = this.getResourceBundle().getText("worklistTitleCount", [iTotalItems]);
				} else {
					sTitle = this.getResourceBundle().getText("worklistTitle");
				}
				this.getModel("worklistView").setProperty("/title", sTitle);
				if (iTotalItems === 1) {
					this.getView().setBusy(true);
					
					oSearchField.setValue();
					this._oListFilterState.aSearch = [];
					this._applyFilterSearch();
					var oItems = oEvent.getSource().getItems();
					this._showObject(oItems[0]);
					
					this.getView().setBusy(false);
				}
				// hide pull to refresh if necessary
				this.byId("pullToRefresh").hide();
			},
			
			
			/**
			 * Event handler when message popover button gets pressed
			 * @param {sap.ui.base.Event} oEvent the button onMessagePopoverPress event
			 * @public
			 */
			 
			onMessagePopoverPress: function(oEvent) {
				this._oMessagePopover.toggle(oEvent.getSource());
			},
			
			
			/**
			 * Event handler when a table item gets pressed
			 * @param {sap.ui.base.Event} oEvent the table selectionChange event
			 * @public
			 */
			 
			onSelectionChange: function(oEvent) {
				// get the list item, either from the listItem parameter or from the event's 
				// source itself (will depend on the device-dependent mode).
				var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
				
				// allows listItem to be selected again
				if (sap.ui.Device.browser) {
					oListItem.setSelected(false);				
				}
				this._showObject(oListItem || oEvent.getSource());
			},
			
			
			/**
			 * Event handler when a table item gets swiped
			 * @param {sap.ui.base.Event} oEvent the listItem onSwipePress event
			 * @public
			 */
			 
			onSwipePress: function(oEvent) {
				var oList = oEvent.getSource().getParent();
				
				// get the list item, either from the listItem parameter or from the event's 
				// source itself (will depend on the device-dependent mode).
				this._showObject(oList.getSwipedItem());
			},
			
			
			/**
			 * Event handler for navigating back.
			 * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
			 * If not, it will navigate to the shell home
			 * @public
			 */
			 
			onNavBack: function() {
				var sPreviousHash = History.getInstance().getPreviousHash(),
					oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
				if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
					history.go(-1);
				} else {
					oCrossAppNavigator.toExternal({
						target: {
							shellHash: "#Shell-home"
						}
					});
				}
			},
			
			
			/**
			 * Event handler for the master search field. Applies current
			 * filter live value and triggers a new search. If the search field's
			 * 'refresh' button has been pressed, no new search is triggered
			 * and the list binding is refresh instead.
			 * @param {sap.ui.base.Event} oEvent the search event
			 * @public
			 */
			 
			onLiveChange: function(oEvent) {
				if (oEvent.getParameters().refreshButtonPressed) {
					// Search field's 'refresh' button has been pressed.
					// This is visible if you select any master list item.
					// In this case no new search is triggered, we only
					// refresh the list binding.
					this.onRefresh();
					return;
				}
				// current search field value
				var sQuery = oEvent.getSource().getValue();
				this._oListFilterState.aSearch = [];
				if (sQuery) {
					this._oListFilterState.aSearch = [new Filter("UCsource", sap.ui.model.FilterOperator.Contains, sQuery)];
				}
				// update list binding
				this._applyFilterSearch();
			},
			
			
			/**
			 * Event handler for refresh event. Keeps filter, sort
			 * and group settings and refreshes the list binding.
			 * @public
			 */
			 
			onRefresh: function() {
				this._oList.getBinding("items").refresh();
			},
			
			
			/* =========================================================== */
			/* internal methods                                            */
			/* =========================================================== */
			
			/**
			 * Creates a JSONModel to be used in worklist view
			 * @returns {sap.uimodel.json.JSONModel} the model reference
			 * @private
			 */
			 
			_createViewModel: function() {
				return new JSONModel({
					noDataText: this.getResourceBundle().getText("worklistListNoDataText"),
					listBusyDelay: 0,
					isFilterBarVisible: false,
					filterBarLabel: "",
					delay: 0,
					title: this.getResourceBundle().getText("worklistTitleCount", [0]),
					sortBy: "UCsource",
					groupBy: "None"
				});
			},
			
			
			/**
			 * Creates a MessagePopover template to be used in worklist view
			 * @returns {sap.m.MessagePopover} the message popover object
			 * @private
			 */
			 
			_createMessagePopover: function() {
				return new sap.m.MessagePopover({
					items: {
						path: "/messages",
						template: new sap.m.MessagePopoverItem({
							type: "{type}",
							title: "{title}",
							description: "{description}",
							subtitle: "{subtitle}",
							counter: "{counter}"
						})
					}
				});
			},
			
			
			/**
			 * Updates the entire model every 3 seconds
			 * @function
			 * @private
			 */
	
			_doModelUpdate : function() {
				var _self = this;
				setInterval(function() {
					_self.onRefresh();
				}, 2500);
			},
			
			/**
			 * Shows the selected item on the object page
			 * On phones a additional history entry is created
			 * @param {sap.m.ObjectListItem} oItem selected Item
			 * @private
			 */
			 
			_showObject: function(oItem) {
				this.getRouter().navTo("object", {
					objectId: oItem.getBindingContext().getProperty("WarehouseTask")
				});
			},
			
			
			/**
			 * Internal helper method to apply both filter and search state together on the list binding
			 * @private
			 */
			 
			_applyFilterSearch : function() {
				var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter),
					oViewModel = this.getModel("worklistView");
				this._oList.getBinding("items").filter(aFilters, "Application");
				// changes the noDataText of the list in case there are no filter results
				if (aFilters.length !== 0) {
					oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("worklistListNoDataWithFilterOrSearchText"));
				} else if (this._oListFilterState.aSearch.length > 0) {
					// only reset the no data text to default when no new search was triggered
					oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("worklistListNoDataText"));
				}
			}
			
			
		});
		
	}
);