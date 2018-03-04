/*global location*/
sap.ui.define([
		"pt/ewm/am/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/routing/History",
		"pt/ewm/am/model/formatter"
	], function (
		BaseController,
		JSONModel,
		History,
		formatter
	) {
		"use strict";

		return BaseController.extend("pt.ewm.am.controller.Object", {

			formatter: formatter,

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			/**
			 * Called when the worklist controller is instantiated.
			 * @public
			 */
			 
			onInit : function () {
				var iOriginalBusyDelay,
					oViewModel;

				// Store original busy indicator delay, so it can be restored later on
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
				
				// Model used to manipulate control states. The chosen values make sure,
				// detail page is busy indication immediately so there is no break in
				// between the busy indication for loading the view's meta data
				oViewModel = this._createViewModel();
				this.setModel(oViewModel, "objectView");

				this.getOwnerComponent().getModel().metadataLoaded().then(function () {
						// Restore original busy indicator delay for the object view
						oViewModel.setProperty("/delay", iOriginalBusyDelay);
					}
				);
				
				this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			},
			
			
			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */

			/**
			 * Event handler when button submit gets pressed. The data is sent to the
			 * backend through POST method.
			 * @param {sap.ui.base.Event} oEvent button onSubmit event
			 * @public
			 */
			 
			onSubmit: function(oEvent) {
				this._submitChanges(oEvent);	
			},
			

			/**
			 * Event handler for navigating back.
			 * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
			 * If not, it will replace the current entry of the browser history with the worklist route.
			 * @public
			 */
			 
			onNavBack : function() {
				var sPreviousHash = History.getInstance().getPreviousHash();
				// oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
				
				// refresh the entire model
				this.getModel().refresh();
				
				// if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
				if (sPreviousHash !== undefined ) {
					history.go(-1);
				} else {
					this.getRouter().navTo("worklist", {}, true);
				}
			},
			

			/**
			 * Event handler when a value of the input is changed
			 * @param {sap.ui.base.Event} oEvent input text object related
			 * @public
			 */
			 
			onUcDestinationLiveChange: function(oEvent) {
				var sValue = oEvent.getSource().getValue(),
			  sPlaceholder = oEvent.getSource().getPlaceholder(),
				  oContext = oEvent.getSource().getBindingContext();

				if ((this._enableSubmitChanges(sValue, sPlaceholder)) === true ) {
					this._submitChanges(oEvent);
				}

				var sVerificationCode = oContext.getProperty("VerificationCode"),
							sUCsource = oContext.getProperty("UCsource"),
					   sUCdestination = this.byId("ucDestinationId").getValue(),
					        oMessages = this.getMessages(),
					         sMessage = this.getResourceBundle().getText("objectUcDestinationEventChange", [sUCdestination,sVerificationCode]);
					        
				if ((sValue.length === 1) && (sValue === sVerificationCode)) {
					
					this._submitChanges(oEvent);
					
				} else if ((sValue.length === 1) && (sValue !== sVerificationCode)) {
					this._updateMessages({
							type: "Error",
							title: formatter.setMessagePopoverTitle(sUCsource, sUCdestination),
							description: sMessage,
							counter: oMessages.getData().messages.length + 1
						});
					
					this._setControlStates2Default();
					this._updateMessageStrip(sMessage);
				}

			},
			
			/**
			 * Event handler when a value of the input is changed
			 * @param {sap.ui.base.Event} oEvent input text object related
			 * @public
			 */

			onUcDestinationChange: function(oEvent) {
				var sValue = oEvent.getSource().getValue(),
			  sPlaceholder = oEvent.getSource().getPlaceholder(),
				  oContext = oEvent.getSource().getBindingContext();
				
				if ((this._enableSubmitChanges(sValue, sPlaceholder)) === true ) {
					this._submitChanges(oEvent);
				}
				
				var sVerificationCode = oContext.getProperty("VerificationCode");
				if ((sValue.length === 1) && (sValue === sVerificationCode)) {
					this._submitChanges(oEvent);
				}
			},


			/**
			 * Event handler when a value of the input is changed
			 * @param {sap.ui.base.Event} oEvent input text object related
			 * @public
			 */
			 
			onExceptionCodeChange: function(oEvent) {
				var sExceptionCode = oEvent.getSource().getValue(),
					oButton = this.byId("exceptionCodeClearId");
				if (sExceptionCode.length === 0) {
					oButton.setEnabled(false);
				} else {
					oButton.setEnabled(true);
				}
			},
			
			
			/**
			 * Event handler when the busy dialog is requested
			 * @function
			 * @public
			 */
			 
			 onBusyDialog : function(bClose) {
				// create busy dialog
				if (!this._busyDialog) {
					this._busyDialog = sap.ui.xmlfragment("pt.ewm.am.view.fragments.BusyDialog", this);
					this.getView().addDependent(this._valueHelpDialog);
				}
				
				if (bClose) {
					// open value busy dialog
					this._busyDialog.open();					
				} else {
					// close busy dialog
					this._busyDialog.close();	
				}
		 	},


			/**
			 * Event handler when the value help request has been clicked
			 * @function
			 * @param {sap.ui.base.Event} oEvent value help request object related
			 * @public
			 */
			 
			onValueHelpRequest: function(oEvent) {
				var sInputValue = oEvent.getSource().getValue().toString().substring(1, 5),
					    oFilter = new sap.ui.model.Filter("ExceptionCode", sap.ui.model.FilterOperator.Contains, sInputValue);
				   this.inputId = oEvent.getSource().getId();
				
				// create value help dialog
				if (!this._valueHelpDialog) {
					this._valueHelpDialog = sap.ui.xmlfragment("pt.ewm.am.view.fragments.ExceptionValueList", this);
					this.getView().addDependent(this._valueHelpDialog);
				}
				
				// create a filter for the binding
				this._valueHelpDialog.getBinding("items").filter([oFilter]);
					
				// open value help dialog filtered by the input value
				this._valueHelpDialog.open(sInputValue);	
			},


			/**
			 * Event handler when the clear exception button has been clicked
			 * @function
			 * @public
			 */
			 
			onExceptionEraserPress: function() {
				var sExceptionCode = this.getView().byId("exceptionCodeId"),
					oButton = this.byId("exceptionCodeClearId");
				if (sExceptionCode) {
					sap.m.MessageToast.show(this.getResourceBundle().getText("objectFormExceptionClear", [sExceptionCode.getValue()]));
					oButton.setEnabled(false);
				}
				sExceptionCode.setValue();
			},


			/* =========================================================== */
			/* internal methods                                            */
			/* =========================================================== */

			/**
			 * Creates a JSONModel for objectview view
			 * @function
			 * @returns {sap.uimodel.json.JSONModel} the model reference
			 * @private
			 */
			 
			_createViewModel: function() {
				return new JSONModel({
					title: "",
					messageText: "",
					busy : true,
					delay : 0,
					noExceptionDataText: this.getResourceBundle().getText("objectDialogExceptionNoDataText")
				});
			},
			
			
			/**
			 * Handles value help search when requested
			 * @function
			 * @param {string} oEvent path to the object to be bound
			 * @private
			 */
			 
			_handleValueHelpSearch: function(oEvent) {
				var sValue = oEvent.getParameter("value");
				var oFilter = new sap.ui.model.Filter("Description", sap.ui.model.FilterOperator.Contains, sValue);
				
				oEvent.getSource().getBinding("items").filter([oFilter]);
			},
			
			
			/**
			 * Handles value help close
			 * @function
			 * @param {string} oEvent object caller itself
			 * @private
			 */
			 
			_handleValueHelpClose: function(oEvent) {
				var oSelectedItem = oEvent.getParameter("selectedItem");
					
				if (oSelectedItem) {
					var exceptionCodeInput = this.getView().byId(this.inputId),
						sKey = oSelectedItem.getTitle();
					exceptionCodeInput.setSelectedKey(sKey);
				}
				oEvent.getSource().getBinding("items").filter([]);
			},
			

			/**
			 * Submit data to backend, and shows the return message to the user
			 * @function
			 * @param {sap.ui.base.Event} oEvent button onSubmit event
			 * @private
			 */
			 
			_submitChanges: function(oEvent) {
				
				var oModel = oEvent.getSource().getModel(),
				     oView = this.getView(),
				  oContext = oEvent.getSource().getBindingContext(),
				   oRouter = this.getRouter(),
				
					// create default properties
					oProperties = {
						LGNUM: oContext.getProperty("WarehouseNumber"),
						TANUM: oContext.getProperty("WarehouseTask"),
						UNAME: oContext.getProperty("UserName"),
						VLENR: oContext.getProperty("UCsource"),
						VSOLA: oContext.getProperty("Quantity"),
						MEINS: oContext.getProperty("UnitMeasure"),
						EXCCODE: this.byId("exceptionCodeId").getValue().toString().substring(1, 5)
					};
				
				oView.setBusyIndicatorDelay(0);
				this.onBusyDialog(true);
				
				// create new entry in the model
				this.oContext = oModel.create("/Z_SCWM_TO_CONFIRM", oProperties, {
					success: function(oData) {
						
						var oController = oView.getController(),
							   oBinding = oController.getView().getBindingContext(),
						 sUCdestination = oBinding.getProperty("UCdestination"),
						      sUCsource = oBinding.getProperty("UCsource"),
						 sWarehouseTask = oBinding.getProperty("WarehouseTask"),
						      oMessages = oController.getMessages();
						
						// update popover messages with currently return message
						oController._updateMessages({
								type: oData.statusCode === "201" ? "Success" : "Error",
								title: formatter.setMessagePopoverTitle(sUCsource, sUCdestination),
								description: oData.MESSAGE,
								counter: oMessages.getData().messages.length + 1
							});
						
						// updates message strip
						oController._updateMessageStrip(oData.MESSAGE);
											
						// them, lock controls ...
						oController._setControlStates2Default();
						oController.onBusyDialog(false);
						
						if (oData.statusCode === "201") { // created
							
							// ... and restore to their original state
							oController._setControlStates2Default(true);
							
							oRouter.navTo("success", {
								objectId: sWarehouseTask
							});
						}
					},
					
					error: function(oError) {
					 	this.onBusyDialog(false);
					 	sap.m.MessageToast.show(oError.MESSAGE, {
					 		duration: 3000
					 	});
					}
				});
			},
			

			/**
			 * Makes the application waiting for a given period
			 * @function
			 * @param {sap.ui.model.type.Integer} iMilliseconds time in milliseconds
			 * @private
			 */
			 
			_wait: function (iMilliseconds) {
				var start = new Date().getTime();
				for (var i = 0; i < 1e7; i++) {
					if ((new Date().getTime() - start) > iMilliseconds){
						break;
				    }
				}
			},
			
			
			/**
			 * Updates message model with information related last user action
			 * @function
			 * @param {object} oMessageInfo message details
			 * @private
			 */
			 
			_updateMessages : function(oMessageInfo) {
				var oMessages = this.getView().getController().getMessages(),
					oMessageData = oMessages.getData();
					
					oMessageData.messages.push(oMessageInfo);
					oMessageData.count = oMessageData.messages.length;
					oMessageData.hasCount = oMessageData.messages.length > 0;
					oMessages.setData(oMessageData, true);
			},
			
			
			/**
			 * Updates message strip with information about last action
			 * @function
			 * @param {object} sMessage the message to be shown on screen
			 * @private
			 */
			 
			_updateMessageStrip : function(sMessage) {
				var oMessageStrip = this.getView().byId("messageStripId");
				if (sMessage) {
					oMessageStrip.setText(sMessage);
					oMessageStrip.setVisible(true);
				}
			},
			
			
			/**
			 * Update controls to their oiginal state
			 * @function
			 * @private
			 */	
			 
			_setControlStates2Default: function(bEnabled) {
				var oMessageStrip = this.byId("messageStripId"),
				   oUcDestination = this.byId("ucDestinationId"),
				 oExceptionCodeId = this.byId("exceptionCodeId"),
				        oQuantity = this.byId("quantityId"),
					      oSubmit = this.byId("submitId");
				
				oMessageStrip.setVisible(false);
				
				oUcDestination.setValue();
				oExceptionCodeId.setValue();
				
				oUcDestination.setEnabled(!bEnabled);
				oExceptionCodeId.setEnabled(!bEnabled);
				oQuantity.setEnabled(!bEnabled);
				
				oSubmit.setEnabled(false);
			},
			
			
			/**
			 * Enables submit changes when the value input be equal than the 
			 * storage position required
			 * @function
			 * @param {string} sValue value
			 * @param {string} sPlaceholder value
			 * @private
			 */
			 
			_enableSubmitChanges: function(sValue, sPlaceholder) {
				var oSubmit = this.byId("submitId");
				if (sValue === sPlaceholder) {
					oSubmit.setEnabled(true);
					return true;
				} else {
					oSubmit.setEnabled(false);
				}
				return false;
			},
			
			
			/**
			 * Binds the view to the object path.
			 * @function
			 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
			 * @private
			 */
			 
			_onObjectMatched : function (oEvent) {
				var sObjectId =  oEvent.getParameter("arguments").objectId;
				this._setControlStates2Default();
				
				this.getModel().metadataLoaded().then( function() {
					var sObjectPath = this.getModel().createKey("ZEWMCDS_WTO", {
						WarehouseTask :  sObjectId
					});
					this._bindView("/" + sObjectPath);
					
				}.bind(this));
			},
			
			
			/**
			 * Binds the view to the object path.
			 * @function
			 * @param {string} sObjectPath path to the object to be bound
			 * @private
			 */
			 
			_bindView : function (sObjectPath) {
				var oViewModel = this.getModel("objectView"),
					oDataModel = this.getModel();

				this.getView().bindElement({
					path: sObjectPath,
					parameters: {
						expand: "toMaterial,toExceptionCodes"
					},
					events: {
						change: this._onBindingChange.bind(this),
						dataRequested: function () {
							oDataModel.metadataLoaded().then(function () {
								// Busy indicator on view should only be set if metadata is loaded,
								// otherwise there may be two busy indications next to each other on the
								// screen. This happens because route matched handler already calls '_bindView'
								// while metadata is loaded.
								oViewModel.setProperty("/busy", true);
							});
						},
						dataReceived: function () {
							oViewModel.setProperty("/busy", false);
						}
					}
				});
			},
			

			/**
			 * Event handler when binding changes
			 * @function
			 * @private
			 */
			 
			_onBindingChange : function () {
				var oView = this.getView(),
					oViewModel = this.getModel("objectView"),
					oElementBinding = oView.getElementBinding();

				// No data for the binding
				if (!oElementBinding.getBoundContext()) {
					this.getRouter().getTargets().display("objectNotFound");
					return;
				}

				var oResourceBundle = this.getResourceBundle(),
					oObject = oView.getBindingContext().getObject(),
					sObjectId = oObject.WarehouseTask,
					sObjectName = oObject.WarehouseTask;

				// Everything went fine.
				oViewModel.setProperty("/title", oResourceBundle.getText("objectTitle", [sObjectId]));
				oViewModel.setProperty("/busy", false);
				oViewModel.setProperty("/saveAsTileTitle", oResourceBundle.getText("saveAsTileTitle", [sObjectName]));
				oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
				oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
			}
			
			
		});

	}
);